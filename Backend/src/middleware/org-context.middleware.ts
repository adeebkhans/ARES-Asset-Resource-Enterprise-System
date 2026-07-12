import { NextFunction, Request, Response } from 'express';
import { prisma } from '@/core/database/prisma';
import { ApiError } from '@/core/errors/ApiError';
import { asyncHandler } from '@/core/base/asyncHandler';

/**
 * Runs after `authenticate`. JWT claims can go stale (user deactivated, role
 * changed mid-session) so this re-checks the user is still an active member of
 * the org the token claims before letting the request touch tenant data.
 */
export const requireOrgContext = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }

  const user = await prisma.user.findFirst({
    where: { id: req.auth.userId, orgId: req.auth.orgId },
    select: { status: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw ApiError.forbidden('Account is inactive or no longer part of this organization');
  }

  next();
});
