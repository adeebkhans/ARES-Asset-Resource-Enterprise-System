import { AssetCategory } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { BaseRepository } from '@/core/base/BaseRepository';

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

  async listWithCounts(orgId: string, params: { page: number; pageSize: number }) {
    const { skip, take } = { skip: (params.page - 1) * params.pageSize, take: params.pageSize };
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
    return { items, total, page: params.page, pageSize: params.pageSize, totalPages: Math.max(1, Math.ceil(total / params.pageSize)) };
  }
}
