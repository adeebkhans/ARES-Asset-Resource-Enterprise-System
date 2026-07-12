import { ApiError } from '@/core/errors/ApiError';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { BaseRepository } from './BaseRepository';

/**
 * Base orchestration for read paths shared by every module (list + getById with
 * org scoping and a 404 on miss). Mutations are deliberately left to subclasses
 * since create/update almost always carry module-specific business rules
 * (state machines, conflict checks, event emission) that don't belong here.
 */
export abstract class BaseService<T> {
  protected constructor(protected readonly repository: BaseRepository<T, any>) {}

  async list(orgId: string, params: PaginationParams, where?: Record<string, unknown>): Promise<PaginatedResult<T>> {
    return this.repository.list(orgId, params, where);
  }

  async getById(orgId: string, id: string): Promise<T> {
    const item = await this.repository.findById(orgId, id);
    if (!item) throw ApiError.notFound();
    return item;
  }
}
