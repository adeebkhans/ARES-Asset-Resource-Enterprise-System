import { Request } from 'express';
import { ApiError } from '@/core/errors/ApiError';
import { AuthContext } from '@/types/common.types';

/** Single choke point for reading the authenticated tenant/user off a request — never read req.auth directly in a service. */
export function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw ApiError.unauthorized('Missing authentication context');
  }
  return req.auth;
}
