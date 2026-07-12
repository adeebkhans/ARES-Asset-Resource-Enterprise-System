export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Every authenticated request carries this — attached by auth + org-context middleware. */
export interface AuthContext {
  userId: string;
  orgId: string;
  role: string;
  departmentId: string | null;
}
