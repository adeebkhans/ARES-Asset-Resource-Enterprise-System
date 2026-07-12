import { AssetCategory } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { BaseRepository } from '@/core/base/BaseRepository';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';

export type AssetCategoryWithCount = AssetCategory & { _count: { assets: number } };

export class AssetCategoryRepository extends BaseRepository<AssetCategory> {
  constructor() {
    super(prisma.assetCategory);
  }

  async findByName(orgId: string, name: string): Promise<AssetCategory | null> {
    return prisma.assetCategory.findFirst({ where: { orgId, name } });
  }

  async findByIdWithCounts(orgId: string, id: string) {
    return prisma.assetCategory.findFirst({
      where: { id, orgId },
      include: { _count: { select: { assets: true } } },
    });
  }

  async listWithCounts(
    orgId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<AssetCategoryWithCount>> {
    const { skip, take } = toSkipTake(params);
    const where = { orgId };
    const [items, total] = await Promise.all([
      prisma.assetCategory.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { assets: true } } },
      }),
      prisma.assetCategory.count({ where }),
    ]);
    return buildPaginatedResult(items, total, params);
  }
}
