import { Department } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { BaseRepository } from '@/core/base/BaseRepository';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';

export class DepartmentRepository extends BaseRepository<Department> {
  constructor() {
    super(prisma.department);
  }

  async findByName(orgId: string, name: string): Promise<Department | null> {
    return prisma.department.findFirst({ where: { orgId, name } });
  }

  async findByIdWithDetails(orgId: string, id: string) {
    return prisma.department.findFirst({
      where: { id, orgId },
      include: {
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, children: true } },
      },
    });
  }

  async listWithDetails(
    orgId: string,
    params: PaginationParams,
    where: Record<string, unknown> = {},
  ): Promise<PaginatedResult<Department>> {
    const { skip, take } = toSkipTake(params);
    const scopedWhere = { ...where, orgId } as Record<string, unknown>;
    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where: scopedWhere,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          head: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true, children: true } },
        },
      }),
      prisma.department.count({ where: scopedWhere }),
    ]);
    return buildPaginatedResult(items as unknown as Department[], total, params);
  }

  async getRootDepartments(orgId: string) {
    return prisma.department.findMany({
      where: { orgId, parentDepartmentId: null, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: {
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, children: true } },
      },
    });
  }

  async getChildDepartments(orgId: string, parentId: string) {
    return prisma.department.findMany({
      where: { orgId, parentDepartmentId: parentId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: {
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, children: true } },
      },
    });
  }
}
