import { ApiError } from '@/core/errors/ApiError';
import { canAssignRoles } from '@/core/auth/roles';
import { prisma } from '@/core/database/prisma';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { EmployeeRepository, EmployeeListItem } from './employee.repository';
import { UpdateEmployeeInput, UpdateEmployeeRoleInput } from './employee.validators';
import { Role } from '@/constants/roles';

export class EmployeeService {
  constructor(private readonly repo: EmployeeRepository = new EmployeeRepository()) {}

  async list(orgId: string, params: PaginationParams, search?: string): Promise<PaginatedResult<EmployeeListItem>> {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.repo.listWithDepartment(orgId, params, where);
  }

  async getById(orgId: string, id: string) {
    const emp = await this.repo.findByIdWithDepartment(orgId, id);
    if (!emp) throw ApiError.notFound('Employee not found');
    return emp;
  }

  async updateRole(
    orgId: string,
    id: string,
    input: UpdateEmployeeRoleInput,
    requestedByRole: Role,
    requestedByUserId: string,
  ) {
    if (!canAssignRoles(requestedByRole)) {
      throw ApiError.forbidden('Only Admins can promote or demote employees');
    }

    const emp = await this.repo.findById(orgId, id);
    if (!emp) throw ApiError.notFound('Employee not found');

    if (emp.id === requestedByUserId) {
      throw ApiError.badRequest('Cannot change your own role');
    }

    await this.repo.update(orgId, id, { role: input.role });
    return this.getById(orgId, id);
  }

  async update(orgId: string, id: string, input: UpdateEmployeeInput) {
    const emp = await this.repo.findById(orgId, id);
    if (!emp) throw ApiError.notFound('Employee not found');

    if (input.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.departmentId, orgId },
      });
      if (!dept) throw ApiError.badRequest('Department not found');
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.departmentId !== undefined) data.departmentId = input.departmentId;
    if (input.status !== undefined) data.status = input.status;

    if (Object.keys(data).length > 0) {
      await this.repo.update(orgId, id, data);
    }

    return this.getById(orgId, id);
  }
}
