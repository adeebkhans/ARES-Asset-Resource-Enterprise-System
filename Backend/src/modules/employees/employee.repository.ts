import { User } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { BaseRepository } from '@/core/base/BaseRepository';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';

export type EmployeeListItem = Pick<User, 'id' | 'name' | 'email' | 'role' | 'departmentId' | 'status' | 'createdAt'> & {
  department?: { id: string; name: string } | null;
};

export class EmployeeRepository extends BaseRepository<User> {
  constructor() {
    super(prisma.user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async listWithDepartment(
    orgId: string,
    params: PaginationParams,
    where: Record<string, unknown> = {},
  ): Promise<PaginatedResult<EmployeeListItem>> {
    const { skip, take } = toSkipTake(params);
    const scopedWhere = { ...where, orgId } as Record<string, unknown>;
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: scopedWhere,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          status: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where: scopedWhere }),
    ]);
    return buildPaginatedResult(items as EmployeeListItem[], total, params);
  }

  async findByIdWithDepartment(orgId: string, id: string) {
    return prisma.user.findFirst({
      where: { id, orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        status: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
      },
    });
  }
}
