import { Role } from '@/constants/roles';

/** Roles that may promote/demote other users' roles (Org Setup → Employee Directory only). */
export const ROLE_ASSIGNERS: Role[] = ['ADMIN'];

export function isAdmin(role: Role): boolean {
  return role === 'ADMIN';
}

export function canAssignRoles(role: Role): boolean {
  return ROLE_ASSIGNERS.includes(role);
}
