import { MaintenanceRequest } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { PaginatedResult } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';
import { MaintenanceSearchParams } from './maintenance.validators';

export type MaintenanceRequestWithAsset = MaintenanceRequest & {
  asset?: { id: string; assetTag: string; name: string } | null;
  raisedBy?: { id: string; name: string; email: string } | null;
};

export class MaintenanceRepository {
  async findById(orgId: string, id: string): Promise<MaintenanceRequestWithAsset | null> {
    return prisma.maintenanceRequest.findFirst({
      where: { id, orgId },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        raisedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async create(data: {
    orgId: string;
    assetId: string;
    raisedById: string;
    issueDescription: string;
    priority?: string;
    photos?: string[];
  }): Promise<MaintenanceRequest> {
    return prisma.maintenanceRequest.create({
      data: {
        orgId: data.orgId,
        assetId: data.assetId,
        raisedById: data.raisedById,
        issueDescription: data.issueDescription,
        priority: (data.priority as any) ?? 'MEDIUM',
        photos: data.photos ?? [],
      },
    });
  }

  async updateStatus(
    id: string,
    data: {
      status: string;
      technicianName?: string;
      resolutionNotes?: string;
      resolvedAt?: Date;
    },
  ): Promise<MaintenanceRequest> {
    return prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: data.status as any,
        technicianName: data.technicianName,
        resolutionNotes: data.resolutionNotes,
        resolvedAt: data.resolvedAt,
      },
    });
  }

  async search(
    orgId: string,
    params: MaintenanceSearchParams,
  ): Promise<PaginatedResult<MaintenanceRequestWithAsset>> {
    const { skip, take } = toSkipTake(params);
    const where: Record<string, unknown> = { orgId };

    if (params.status) where.status = params.status;
    if (params.assetId) where.assetId = params.assetId;
    if (params.priority) where.priority = params.priority;
    if (params.search) {
      where.OR = [
        { issueDescription: { contains: params.search, mode: 'insensitive' } },
        { asset: { name: { contains: params.search, mode: 'insensitive' } } },
        { asset: { assetTag: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, assetTag: true, name: true } },
          raisedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);
    return buildPaginatedResult(items as MaintenanceRequestWithAsset[], total, params);
  }

  async countByStatus(orgId: string) {
    const results = await prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { orgId },
      _count: { id: true },
    });
    return Object.fromEntries(results.map((r) => [r.status, r._count.id]));
  }
}
