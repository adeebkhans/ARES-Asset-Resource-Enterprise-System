import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { ApiError } from '@/core/errors/ApiError';
import { sendSuccess } from '@/utils/response';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

export class AuthController {
  constructor(
    private readonly service: AuthService = new AuthService(),
    private readonly repository: AuthRepository = new AuthRepository(),
  ) {}

  registerOrganization = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.registerOrganization(req.body);
    sendSuccess(res, result, 201);
  });

  signup = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.signup(req.body);
    sendSuccess(res, result, 201);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.login(req.body);
    sendSuccess(res, result);
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const tokens = await this.service.refresh(req.body);
    sendSuccess(res, tokens);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    await this.service.logout(req.body.refreshToken);
    sendSuccess(res, { loggedOut: true });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const user = await this.repository.findUserById(req.auth.userId);
    if (!user) throw ApiError.unauthorized();
    sendSuccess(res, {
      id: user.id,
      orgId: user.orgId,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      status: user.status,
    });
  });
}
