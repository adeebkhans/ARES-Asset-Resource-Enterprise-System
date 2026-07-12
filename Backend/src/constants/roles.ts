export const ROLES = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] as const;

export type Role = (typeof ROLES)[number];

/** Roles a self-service signup is ever allowed to create. Never expose a way to widen this from the client. */
export const SELF_SIGNUP_ROLE: Role = 'EMPLOYEE';
