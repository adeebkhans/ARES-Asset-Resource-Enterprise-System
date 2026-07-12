import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/config/logger';
import { ApiErrorResponse } from '@/types/api.types';
import { ErrorCode } from '@/constants/errors';
import { ApiError } from './ApiError';

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: `Route not found: ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
}

// Express detects error middleware by arity (4 params) — all four must stay
// in the signature even though only `err` and `res` are used.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    const body: ApiErrorResponse = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: err.flatten(),
      },
    };
    res.status(400).json(body);
    return;
  }

  logger.error({ err }, 'Unhandled error');
  const body: ApiErrorResponse = {
    success: false,
    error: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' },
  };
  res.status(500).json(body);
}
