import { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/core/errors/ApiError';
import { Role } from '@/constants/roles';

/** Declarative route guard: `allow('ADMIN', 'ASSET_MANAGER')`. Resource-level checks (e.g. "own department only") stay in the service layer. */
export function allow(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw ApiError.unauthorized();
    }
    if (!roles.includes(req.auth.role as Role)) {
      throw ApiError.forbidden(`Requires one of roles: ${roles.join(', ')}`);
    }
    next();
  };
}
