import { Asset, AssetStatus, AssetStatusChangeSource } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { BaseRepository } from '@/core/base/BaseRepository';
import { PaginatedResult } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';
import { AssetSearchParams } from './asset.validators';

export type AssetListItem = Asset & {
  category?: { id: string; name: string } | null;
};

export class AssetRepository extends BaseRepository<Asset> {
  constructor() {
    super(prisma.asset);
  }

  async findByAssetTag(orgId: string, assetTag: string): Promise<Asset | null> {
    return prisma.asset.findFirst({ where: { orgId, assetTag } });
  }

  /**
   * Highest existing `AF-####` sequence number for the org. Deliberately reads
   * the numeric MAX rather than "most recently created" — creation order and
   * tag order can diverge (retries, clock skew), and the caller also retries
   * on a unique-constraint conflict, so this only needs to be a good starting
   * guess, not a synchronized counter.
   */
  async findMaxAssetTagSequence(orgId: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING("assetTag" FROM 'AF-(\d+)') AS INTEGER)) as max
      FROM assets
      WHERE "orgId" = ${orgId} AND "assetTag" ~ '^AF-\d+$'
    `;
    return rows[0]?.max ?? 0;
  }

  async findByIdWithCategory(orgId: string, id: string) {
    return prisma.asset.findFirst({
      where: { id, orgId },
      include: {
        category: { select: { id: true, name: true, customFieldSchema: true } },
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
  }

  async search(
    orgId: string,
    params: AssetSearchParams,
  ): Promise<PaginatedResult<AssetListItem>> {
    const { skip, take } = toSkipTake(params);
    const where: Record<string, unknown> = { orgId };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { assetTag: { contains: params.search, mode: 'insensitive' } },
        { serialNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.status) where.status = params.status;
    if (params.location) where.location = { contains: params.location, mode: 'insensitive' };
    if (params.isShared !== undefined) where.isShared = params.isShared;

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);
    return buildPaginatedResult(items as AssetListItem[], total, params);
  }

  async countByStatus(orgId: string) {
    const results = await prisma.asset.groupBy({
      by: ['status'],
      where: { orgId },
      _count: { id: true },
    });
    return Object.fromEntries(results.map((r) => [r.status, r._count.id]));
  }

  async writeStatusHistory(params: {
    assetId: string;
    fromStatus: AssetStatus | null;
    toStatus: AssetStatus;
    changedBy: string | null;
    source: AssetStatusChangeSource;
    reason?: string;
  }) {
    return prisma.assetStatusHistory.create({ data: params });
  }
}
