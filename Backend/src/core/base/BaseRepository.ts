import { ApiError } from '@/core/errors/ApiError';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';

/**
 * Minimal shape every Prisma model delegate satisfies. Modules pass their
 * concrete delegate (e.g. `prisma.department`) into the base constructor and
 * get org-scoped CRUD + pagination for free; module-specific query needs are
 * added as extra methods on the subclass rather than widening this interface.
 */
export interface PrismaDelegate<T> {
  findMany(args?: Record<string, unknown>): Promise<T[]>;
  findFirst(args?: Record<string, unknown>): Promise<T | null>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<T>;
  update(args: Record<string, unknown>): Promise<T>;
  delete(args: Record<string, unknown>): Promise<T>;
}

export abstract class BaseRepository<T, Delegate extends PrismaDelegate<T> = PrismaDelegate<T>> {
  protected constructor(protected readonly delegate: Delegate) {}

  async findById(orgId: string, id: string): Promise<T | null> {
    return this.delegate.findFirst({ where: { id, orgId } });
  }

  async list(
    orgId: string,
    params: PaginationParams,
    where: Record<string, unknown> = {},
  ): Promise<PaginatedResult<T>> {
    const { skip, take } = toSkipTake(params);
    const scopedWhere = { ...where, orgId };
    const [items, total] = await Promise.all([
      this.delegate.findMany({ where: scopedWhere, skip, take, orderBy: { createdAt: 'desc' } }),
      this.delegate.count({ where: scopedWhere }),
    ]);
    return buildPaginatedResult(items, total, params);
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.delegate.create({ data });
  }

  /** Verifies the row belongs to `orgId` before mutating — the tenant-isolation guarantee lives here. */
  async update(orgId: string, id: string, data: Record<string, unknown>): Promise<T> {
    const existing = await this.findById(orgId, id);
    if (!existing) throw ApiError.notFound();
    return this.delegate.update({ where: { id }, data });
  }

  async remove(orgId: string, id: string): Promise<T> {
    const existing = await this.findById(orgId, id);
    if (!existing) throw ApiError.notFound();
    return this.delegate.delete({ where: { id } });
  }
}
