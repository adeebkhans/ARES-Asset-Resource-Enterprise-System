import { Department } from '@prisma/client';

export type DepartmentWithHead = Department & {
  head?: { id: string; name: string; email: string } | null;
  _count?: { members: number; children: number };
};
