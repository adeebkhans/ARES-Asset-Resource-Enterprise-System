import { Response } from 'express';
import { ApiSuccessResponse } from '@/types/api.types';
import { PaginatedResult } from '@/types/common.types';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const body: ApiSuccessResponse<T> = { success: true, data };
  return res.status(statusCode).json(body);
}

export function sendPaginated<T>(res: Response, result: PaginatedResult<T>, statusCode = 200): Response {
  const body: ApiSuccessResponse<T[]> = {
    success: true,
    data: result.items,
    meta: {
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  };
  return res.status(statusCode).json(body);
}
