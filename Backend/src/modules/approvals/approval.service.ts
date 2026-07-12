import { ApprovalType, UserRole } from '@prisma/client';
import { ApiError } from '@/core/errors/ApiError';
import { eventBus } from '@/core/events';
import { PaginatedResult } from '@/types/common.types';
import { ApprovalRepository, ApprovalWithRelations } from './approval.repository';
import {
  UpsertRuleInput,
  DecideApprovalInput,
  CreateDelegationInput,
  ApprovalSearchParams,
} from './approval.validators';

export class ApprovalService {
  constructor(private readonly repo: ApprovalRepository = new ApprovalRepository()) {}

  // ---------------------------------------------------------------------------
  // Rule management
  // ---------------------------------------------------------------------------

  async getRule(orgId: string, type: ApprovalType) {
    return this.repo.findRuleByType(orgId, type);
  }

  async upsertRule(orgId: string, input: UpsertRuleInput, userId: string) {
    return this.repo.upsertRule(orgId, input, userId);
  }

  // ---------------------------------------------------------------------------
  // Approval lifecycle
  // ---------------------------------------------------------------------------

  async requestApproval(
    orgId: string,
    type: ApprovalType,
    entityType: string,
    entityId: string,
    requestedBy: string,
  ): Promise<ApprovalWithRelations> {
    // Check if an approval already exists for this entity
    const existing = await this.repo.findByEntity(entityType, entityId);
    if (existing) {
      throw ApiError.conflict('An approval request already exists for this entity');
    }

    // Resolve the approver
    const approverUserId = await this.resolveApprover(orgId, type);

    // Get SLA from rule
    const rule = await this.repo.findRuleByType(orgId, type);
    const slaHours = rule?.slaHours ?? 24;
    const dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const approval = await this.repo.createApproval({
      orgId,
      type,
      entityType,
      entityId,
      requestedById: requestedBy,
      currentApproverUserId: approverUserId,
      dueAt,
    });

    eventBus.emit('approval.requested', {
      approvalId: approval.id,
      orgId,
      type,
      entityType,
      entityId,
      requestedById: requestedBy,
      currentApproverUserId: approverUserId,
      dueAt,
    });

    return approval;
  }

  async approve(orgId: string, id: string, userId: string, input: DecideApprovalInput): Promise<ApprovalWithRelations> {
    const approval = await this.repo.findById(orgId, id);
    if (!approval) throw ApiError.notFound('Approval not found');

    if (approval.status !== 'PENDING' && approval.status !== 'ESCALATED') {
      throw ApiError.badRequest(`Cannot approve an approval with status "${approval.status}"`);
    }

    // Verify the user is the assigned approver
    if (approval.currentApproverUserId !== userId) {
      throw ApiError.forbidden('You are not the assigned approver for this request');
    }

    const updated = await this.repo.updateStatus(id, 'APPROVED', userId, input.comment);

    eventBus.emit('approval.approved', {
      approvalId: id,
      orgId,
      type: approval.type,
      entityType: approval.entityType,
      entityId: approval.entityId,
      decidedById: userId,
      comment: input.comment,
    });

    return updated;
  }

  async reject(orgId: string, id: string, userId: string, input: DecideApprovalInput): Promise<ApprovalWithRelations> {
    const approval = await this.repo.findById(orgId, id);
    if (!approval) throw ApiError.notFound('Approval not found');

    if (approval.status !== 'PENDING' && approval.status !== 'ESCALATED') {
      throw ApiError.badRequest(`Cannot reject an approval with status "${approval.status}"`);
    }

    if (approval.currentApproverUserId !== userId) {
      throw ApiError.forbidden('You are not the assigned approver for this request');
    }

    const updated = await this.repo.updateStatus(id, 'REJECTED', userId, input.comment);

    eventBus.emit('approval.rejected', {
      approvalId: id,
      orgId,
      type: approval.type,
      entityType: approval.entityType,
      entityId: approval.entityId,
      decidedById: userId,
      comment: input.comment,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Approver resolution (§8.4)
  // ---------------------------------------------------------------------------

  private async resolveApprover(orgId: string, type: ApprovalType): Promise<string | null> {
    const rule = await this.repo.findRuleByType(orgId, type);
    if (!rule) return null;

    const targetRole = rule.escalateToRole as UserRole;

    // Check for active delegations for users with the target role
    const { prisma } = await import('@/core/database/prisma');
    const candidates = await prisma.user.findMany({
      where: { orgId, role: targetRole, status: 'ACTIVE' },
      select: { id: true },
    });

    const today = new Date();
    for (const candidate of candidates) {
      const delegation = await this.repo.findActiveDelegationForDelegator(candidate.id, today);
      if (delegation) {
        // This candidate has delegated their authority — use the delegate
        return delegation.delegate.id;
      }
      // No delegation — this candidate is the approver
      return candidate.id;
    }

    // Fallback: no users with the target role, try ADMIN
    if (targetRole !== 'ADMIN') {
      const admins = await prisma.user.findMany({
        where: { orgId, role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      if (admins.length > 0) return admins[0].id;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Escalation (called by cron job)
  // ---------------------------------------------------------------------------

  async escalateOverdue(): Promise<number> {
    const overdue = await this.repo.findOverdueApprovals();
    let escalated = 0;

    for (const approval of overdue) {
      try {
        const newApproverId = await this.resolveEscalationTarget(approval.orgId, approval.type, approval.currentApproverUserId);
        if (newApproverId && newApproverId !== approval.currentApproverUserId) {
          await this.repo.setEscalated(approval.id, newApproverId);
          eventBus.emit('approval.escalated', {
            approvalId: approval.id,
            orgId: approval.orgId,
            type: approval.type,
            entityType: approval.entityType,
            entityId: approval.entityId,
            previousApproverUserId: approval.currentApproverUserId ?? '',
            newApproverUserId: newApproverId,
            dueAt: approval.dueAt,
          });
          escalated++;
        }
      } catch {
        // Skip individual failures
      }
    }

    return escalated;
  }

  private async resolveEscalationTarget(
    orgId: string,
    type: ApprovalType,
    currentApproverId: string | null,
  ): Promise<string | null> {
    const rule = await this.repo.findRuleByType(orgId, type);
    if (!rule) return null;

    const targetRole = rule.escalateToRole as UserRole;
    const { prisma } = await import('@/core/database/prisma');

    // Find users with the escalation role, excluding the current approver
    const candidates = await prisma.user.findMany({
      where: {
        orgId,
        role: targetRole,
        status: 'ACTIVE',
        id: currentApproverId ? { not: currentApproverId } : undefined,
      },
      select: { id: true },
    });

    return candidates.length > 0 ? candidates[0].id : null;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getById(orgId: string, id: string): Promise<ApprovalWithRelations> {
    const approval = await this.repo.findById(orgId, id);
    if (!approval) throw ApiError.notFound('Approval not found');
    return approval;
  }

  async getByEntity(entityType: string, entityId: string): Promise<ApprovalWithRelations | null> {
    return this.repo.findByEntity(entityType, entityId);
  }

  async getPendingForUser(userId: string): Promise<ApprovalWithRelations[]> {
    return this.repo.findPendingByApprover(userId);
  }

  async search(orgId: string, params: ApprovalSearchParams): Promise<PaginatedResult<ApprovalWithRelations>> {
    return this.repo.search(orgId, params);
  }

  async getStatusCounts(orgId: string) {
    return this.repo.countByStatus(orgId);
  }

  // ---------------------------------------------------------------------------
  // Delegation management
  // ---------------------------------------------------------------------------

  async createDelegation(orgId: string, userId: string, input: CreateDelegationInput) {
    if (input.endDate <= input.startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    // Validate delegate exists and is in the same org
    const { prisma } = await import('@/core/database/prisma');
    const delegate = await prisma.user.findFirst({
      where: { id: input.delegateUserId, orgId, status: 'ACTIVE' },
    });
    if (!delegate) throw ApiError.badRequest('Delegate user not found');

    if (input.delegateUserId === userId) {
      throw ApiError.badRequest('Cannot delegate to yourself');
    }

    return this.repo.createDelegation({
      orgId,
      delegatorUserId: userId,
      delegateUserId: input.delegateUserId,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  }

  async getDelegations(orgId: string, userId: string) {
    return this.repo.getDelegations(orgId, userId);
  }

  async revokeDelegation(orgId: string, id: string, userId: string) {
    const result = await this.repo.revokeDelegation(orgId, id, userId);
    if (!result) throw ApiError.notFound('Delegation not found');
    return result;
  }
}
