import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/core/auth/jwt';
import { ApiError } from '@/core/errors/ApiError';
import { asyncHandler } from '@/core/base/asyncHandler';

/** Verifies the bearer access token and attaches `req.auth`. Every protected route sits behind this. */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
      departmentId: payload.departmentId,
    };
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
});
