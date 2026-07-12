import { AuditCycle, AuditRecord, Prisma } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { PaginatedResult } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';
import { AuditSearchParams } from './audit.validators';

export type AuditCycleWithDetails = AuditCycle & {
  scopeDepartment?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  assignments?: { id: string; auditor: { id: string; name: string } }[];
  _count?: { records: number; assignments: number };
};

export class AuditRepository {
  async findById(orgId: string, id: string): Promise<AuditCycleWithDetails | null> {
    return prisma.auditCycle.findFirst({
      where: { id, orgId },
      include: {
        scopeDepartment: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        assignments: {
          include: { auditor: { select: { id: true, name: true } } },
        },
        _count: { select: { records: true, assignments: true } },
      },
    });
  }

  async create(data: {
    orgId: string;
    scopeDepartmentId?: string;
    scopeLocation?: string;
    startDate: Date;
    endDate: Date;
    createdBy: string;
  }): Promise<AuditCycle> {
    return prisma.auditCycle.create({ data });
  }

  async addAssignments(cycleId: string, auditorUserIds: string[]): Promise<void> {
    await prisma.auditAssignment.createMany({
      data: auditorUserIds.map((userId) => ({
        auditCycleId: cycleId,
        auditorUserId: userId,
      })),
    });
  }

  async updateStatus(id: string, status: string): Promise<AuditCycle> {
    return prisma.auditCycle.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async addRecord(data: {
    auditCycleId: string;
    assetId: string;
    result: string;
    notes?: string;
    auditedById: string;
  }): Promise<AuditRecord> {
    return prisma.auditRecord.upsert({
      where: {
        auditCycleId_assetId: {
          auditCycleId: data.auditCycleId,
          assetId: data.assetId,
        },
      },
      update: {
        result: data.result as any,
        notes: data.notes,
        auditedById: data.auditedById,
        auditedAt: new Date(),
      },
      create: {
        auditCycleId: data.auditCycleId,
        assetId: data.assetId,
        result: data.result as any,
        notes: data.notes,
        auditedById: data.auditedById,
      },
    });
  }

  async getRecords(cycleId: string) {
    return prisma.auditRecord.findMany({
      where: { auditCycleId: cycleId },
      include: {
        asset: { select: { id: true, assetTag: true, name: true, location: true } },
        auditedBy: { select: { id: true, name: true } },
      },
      orderBy: { auditedAt: 'desc' },
    });
  }

  async getMissingAssets(cycleId: string) {
    return prisma.auditRecord.findMany({
      where: { auditCycleId: cycleId, result: { in: ['MISSING', 'DAMAGED'] } },
      include: {
        asset: { select: { id: true, assetTag: true, name: true, location: true, status: true } },
      },
    });
  }

  async createDiscrepancyReport(cycleId: string, itemCount: number, summary: unknown) {
    return prisma.discrepancyReport.create({
      data: {
        auditCycleId: cycleId,
        itemCount,
        summary: summary as Prisma.InputJsonValue,
      },
    });
  }

  async search(
    orgId: string,
    params: AuditSearchParams,
  ): Promise<PaginatedResult<AuditCycleWithDetails>> {
    const { skip, take } = toSkipTake(params);
    const where: Record<string, unknown> = { orgId };

    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { scopeLocation: { contains: params.search, mode: 'insensitive' } },
        { scopeDepartment: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.auditCycle.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          scopeDepartment: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          _count: { select: { records: true, assignments: true } },
        },
      }),
      prisma.auditCycle.count({ where }),
    ]);
    return buildPaginatedResult(items as AuditCycleWithDetails[], total, params);
  }

  async countByStatus(orgId: string) {
    const results = await prisma.auditCycle.groupBy({
      by: ['status'],
      where: { orgId },
      _count: { id: true },
    });
    return Object.fromEntries(results.map((r) => [r.status, r._count.id]));
  }

  async getAssignedCycles(userId: string) {
    return prisma.auditCycle.findMany({
      where: {
        assignments: { some: { auditorUserId: userId } },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      include: {
        scopeDepartment: { select: { id: true, name: true } },
        _count: { select: { records: true, assignments: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }
}
