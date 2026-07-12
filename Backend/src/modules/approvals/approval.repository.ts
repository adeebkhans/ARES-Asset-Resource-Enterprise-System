import { Approval, ApprovalStatus, ApprovalType, Prisma } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { PaginationParams, PaginatedResult } from '@/types/common.types';
import { toSkipTake, buildPaginatedResult } from '@/utils/pagination';
import { UpsertRuleInput, ApprovalSearchParams } from './approval.validators';

export type ApprovalWithRelations = Approval & {
  requestedBy?: { id: string; name: string } | null;
  currentApprover?: { id: string; name: string } | null;
  decidedBy?: { id: string; name: string } | null;
};

const APPROVAL_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  currentApprover: { select: { id: true, name: true } },
  decidedBy: { select: { id: true, name: true } },
} satisfies Prisma.ApprovalInclude;

export class ApprovalRepository {
  async findRuleByType(orgId: string, type: ApprovalType) {
    return prisma.approvalRule.findUnique({
      where: { orgId_approvalType: { orgId, approvalType: type } },
    });
  }

  async upsertRule(orgId: string, input: UpsertRuleInput, userId: string) {
    return prisma.approvalRule.upsert({
      where: { orgId_approvalType: { orgId, approvalType: input.approvalType } },
      create: {
        orgId,
        approvalType: input.approvalType,
        slaHours: input.slaHours,
        escalateToRole: input.escalateToRole,
        createdBy: userId,
      },
      update: {
        slaHours: input.slaHours,
        escalateToRole: input.escalateToRole,
      },
    });
  }

  async createApproval(data: {
    orgId: string;
    type: ApprovalType;
    entityType: string;
    entityId: string;
    requestedById: string;
    currentApproverUserId: string | null;
    dueAt: Date;
  }): Promise<ApprovalWithRelations> {
    return prisma.approval.create({
      data: {
        orgId: data.orgId,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        requestedById: data.requestedById,
        currentApproverUserId: data.currentApproverUserId,
        dueAt: data.dueAt,
      },
      include: APPROVAL_INCLUDE,
    });
  }

  async findById(orgId: string, id: string): Promise<ApprovalWithRelations | null> {
    return prisma.approval.findFirst({
      where: { id, orgId },
      include: APPROVAL_INCLUDE,
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<ApprovalWithRelations | null> {
    return prisma.approval.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
      include: APPROVAL_INCLUDE,
    });
  }

  async updateStatus(
    id: string,
    status: ApprovalStatus,
    userId?: string,
    comment?: string,
  ): Promise<ApprovalWithRelations> {
    const data: Prisma.ApprovalUpdateInput = { status };
    if (userId) {
      data.decidedBy = { connect: { id: userId } };
      data.decidedAt = new Date();
    }
    if (comment !== undefined) {
      data.comment = comment;
    }
    return prisma.approval.update({
      where: { id },
      data,
      include: APPROVAL_INCLUDE,
    });
  }

  async setEscalated(id: string, newApproverUserId: string): Promise<ApprovalWithRelations> {
    return prisma.approval.update({
      where: { id },
      data: {
        status: 'ESCALATED',
        currentApproverUserId: newApproverUserId,
        escalatedAt: new Date(),
      },
      include: APPROVAL_INCLUDE,
    });
  }

  async findPendingByApprover(userId: string): Promise<ApprovalWithRelations[]> {
    return prisma.approval.findMany({
      where: { currentApproverUserId: userId, status: 'PENDING' },
      include: APPROVAL_INCLUDE,
      orderBy: { dueAt: 'asc' },
    });
  }

  async findOverdueApprovals(): Promise<ApprovalWithRelations[]> {
    return prisma.approval.findMany({
      where: {
        status: { in: ['PENDING', 'ESCALATED'] },
        dueAt: { lt: new Date() },
      },
      include: APPROVAL_INCLUDE,
    });
  }

  async findDelegationsForUser(userId: string, date: Date) {
    return prisma.approvalDelegation.findMany({
      where: {
        OR: [
          { delegatorUserId: userId },
          { delegateUserId: userId },
        ],
        active: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: {
        delegate: { select: { id: true, name: true } },
        delegator: { select: { id: true, name: true } },
      },
    });
  }

  async findActiveDelegationForDelegator(delegatorUserId: string, date: Date) {
    return prisma.approvalDelegation.findFirst({
      where: {
        delegatorUserId,
        active: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: {
        delegate: { select: { id: true, name: true } },
      },
    });
  }

  async createDelegation(data: {
    orgId: string;
    delegatorUserId: string;
    delegateUserId: string;
    startDate: Date;
    endDate: Date;
  }) {
    return prisma.approvalDelegation.create({
      data,
      include: {
        delegate: { select: { id: true, name: true } },
      },
    });
  }

  async getDelegations(orgId: string, userId: string) {
    return prisma.approvalDelegation.findMany({
      where: {
        orgId,
        OR: [
          { delegatorUserId: userId },
          { delegateUserId: userId },
        ],
      },
      include: {
        delegate: { select: { id: true, name: true } },
        delegator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeDelegation(orgId: string, id: string, userId: string) {
    const delegation = await prisma.approvalDelegation.findFirst({
      where: { id, orgId, OR: [{ delegatorUserId: userId }, { delegateUserId: userId }] },
    });
    if (!delegation) return null;
    return prisma.approvalDelegation.update({
      where: { id },
      data: { active: false },
    });
  }

  async search(orgId: string, params: ApprovalSearchParams & PaginationParams): Promise<PaginatedResult<ApprovalWithRelations>> {
    const { skip, take } = toSkipTake(params);
    const where: Prisma.ApprovalWhereInput = { orgId };

    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const [items, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        include: APPROVAL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.approval.count({ where }),
    ]);

    return buildPaginatedResult(items, total, params);
  }

  async countByStatus(orgId: string): Promise<Record<string, number>> {
    const groups = await prisma.approval.groupBy({
      by: ['status'],
      where: { orgId },
      _count: { id: true },
    });
    const counts: Record<string, number> = {};
    for (const g of groups) {
      counts[g.status] = g._count.id;
    }
    return counts;
  }
}
