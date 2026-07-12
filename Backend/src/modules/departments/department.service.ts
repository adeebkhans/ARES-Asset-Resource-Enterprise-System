import { ApiError } from '@/core/errors/ApiError';
import { BaseService } from '@/core/base/BaseService';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { DepartmentRepository } from './department.repository';
import { DepartmentWithHead } from './department.types';
import { CreateDepartmentInput, UpdateDepartmentInput } from './department.validators';

export class DepartmentService extends BaseService<unknown> {
  constructor(private readonly deptRepo: DepartmentRepository = new DepartmentRepository()) {
    super(deptRepo);
  }

  async list(orgId: string, params: PaginationParams): Promise<PaginatedResult<DepartmentWithHead>> {
    return this.deptRepo.listWithDetails(orgId, params) as Promise<PaginatedResult<DepartmentWithHead>>;
  }

  async getById(orgId: string, id: string): Promise<DepartmentWithHead> {
    const dept = await this.deptRepo.findByIdWithDetails(orgId, id);
    if (!dept) throw ApiError.notFound('Department not found');
    return dept as DepartmentWithHead;
  }

  async create(orgId: string, input: CreateDepartmentInput): Promise<DepartmentWithHead> {
    const existing = await this.deptRepo.findByName(orgId, input.name);
    if (existing) {
      throw ApiError.conflict('A department with this name already exists');
    }

    if (input.parentDepartmentId) {
      const parent = await this.deptRepo.findById(orgId, input.parentDepartmentId);
      if (!parent) throw ApiError.badRequest('Parent department not found');
    }

    if (input.headUserId) {
      const { prisma } = await import('@/core/database/prisma');
      const head = await prisma.user.findFirst({
        where: { id: input.headUserId, orgId },
      });
      if (!head) throw ApiError.badRequest('Head user not found in this organization');
    }

    const dept = await this.deptRepo.create({
      orgId,
      name: input.name,
      headUserId: input.headUserId ?? null,
      parentDepartmentId: input.parentDepartmentId ?? null,
    });

    return this.getById(orgId, dept.id);
  }

  async update(orgId: string, id: string, input: UpdateDepartmentInput): Promise<DepartmentWithHead> {
    const existing = await this.deptRepo.findById(orgId, id);
    if (!existing) throw ApiError.notFound('Department not found');

    if (input.name && input.name !== existing.name) {
      const nameTaken = await this.deptRepo.findByName(orgId, input.name);
      if (nameTaken) {
        throw ApiError.conflict('A department with this name already exists');
      }
    }

    if (input.parentDepartmentId) {
      if (input.parentDepartmentId === id) {
        throw ApiError.badRequest('A department cannot be its own parent');
      }
      const parent = await this.deptRepo.findById(orgId, input.parentDepartmentId);
      if (!parent) throw ApiError.badRequest('Parent department not found');
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.headUserId !== undefined) data.headUserId = input.headUserId;
    if (input.parentDepartmentId !== undefined) data.parentDepartmentId = input.parentDepartmentId;
    if (input.status !== undefined) data.status = input.status;

    if (Object.keys(data).length > 0) {
      await this.deptRepo.update(orgId, id, data);
    }

    return this.getById(orgId, id);
  }

  async remove(orgId: string, id: string): Promise<void> {
    const existing = await this.deptRepo.findById(orgId, id);
    if (!existing) throw ApiError.notFound('Department not found');

    const { prisma } = await import('@/core/database/prisma');
    const memberCount = await prisma.user.count({ where: { departmentId: id } });
    if (memberCount > 0) {
      throw ApiError.badRequest('Cannot delete a department with active members. Reassign them first.');
    }

    await prisma.department.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async getTree(orgId: string): Promise<DepartmentWithHead[]> {
    const roots = await this.deptRepo.getRootDepartments(orgId);
    return roots as unknown as DepartmentWithHead[];
  }
}
