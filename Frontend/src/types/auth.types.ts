export type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';

export interface AuthenticatedUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: AuthenticatedUser;
  tokens: TokenPair;
}
