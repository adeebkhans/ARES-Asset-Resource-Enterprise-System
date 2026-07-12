import { ApiError } from '@/core/errors/ApiError';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { AssetCategoryRepository } from './asset-category.repository';
import { CreateAssetCategoryInput, UpdateAssetCategoryInput } from './asset-category.validators';

export class AssetCategoryService {
  constructor(private readonly repo: AssetCategoryRepository = new AssetCategoryRepository()) {}

  async list(orgId: string, params: PaginationParams): Promise<PaginatedResult<any>> {
    return this.repo.listWithCounts(orgId, params);
  }

  async getById(orgId: string, id: string) {
    const cat = await this.repo.findByIdWithCounts(orgId, id);
    if (!cat) throw ApiError.notFound('Asset category not found');
    return cat;
  }

  async create(orgId: string, input: CreateAssetCategoryInput) {
    const existing = await this.repo.findByName(orgId, input.name);
    if (existing) throw ApiError.conflict('A category with this name already exists');
    return this.repo.create({ orgId, name: input.name, description: input.description ?? null });
  }

  async update(orgId: string, id: string, input: UpdateAssetCategoryInput) {
    const existing = await this.repo.findById(orgId, id);
    if (!existing) throw ApiError.notFound('Asset category not found');

    if (input.name && input.name !== existing.name) {
      const nameTaken = await this.repo.findByName(orgId, input.name);
      if (nameTaken) throw ApiError.conflict('A category with this name already exists');
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;

    if (Object.keys(data).length > 0) {
      await this.repo.update(orgId, id, data);
    }
    return this.getById(orgId, id);
  }

  async remove(orgId: string, id: string) {
    const existing = await this.repo.findById(orgId, id);
    if (!existing) throw ApiError.notFound('Asset category not found');

    const { prisma } = await import('@/core/database/prisma');
    const assetCount = await prisma.asset.count({ where: { categoryId: id } });
    if (assetCount > 0) {
      throw ApiError.badRequest('Cannot delete a category with assets. Reassign assets first.');
    }

    await this.repo.remove(orgId, id);
  }
}
