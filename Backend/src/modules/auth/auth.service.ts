import { randomUUID } from 'node:crypto';
import { User } from '@prisma/client';
import { env } from '@/config/env';
import { hashPassword, verifyPassword } from '@/core/auth/password';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '@/core/auth/jwt';
import { ApiError } from '@/core/errors/ApiError';
import { eventBus } from '@/core/events';
import { Role } from '@/constants/roles';
import { addDuration } from '@/utils/date';
import { AuthRepository } from './auth.repository';
import { AuthResult, AuthenticatedUser, TokenPair } from './auth.types';
import { LoginInput, RefreshInput, RegisterOrganizationInput, SignupInput } from './auth.validators';

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    orgId: user.orgId,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    departmentId: user.departmentId,
  };
}

export class AuthService {
  constructor(private readonly repository: AuthRepository = new AuthRepository()) {}

  async registerOrganization(input: RegisterOrganizationInput): Promise<AuthResult> {
    const existing = await this.repository.findUserByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const slug = await this.repository.generateUniqueSlug(input.organizationName);
    const passwordHash = await hashPassword(input.password);

    const { user } = await this.repository.createOrganizationWithAdmin({
      organizationName: input.organizationName,
      slug,
      adminName: input.adminName,
      email: input.email,
      passwordHash,
    });

    eventBus.emit('user.registered', { userId: user.id, orgId: user.orgId, email: user.email });

    const tokens = await this.issueTokens(user);
    return { user: toAuthenticatedUser(user), tokens };
  }

  async signup(input: SignupInput): Promise<AuthResult> {
    const org = await this.repository.findOrgBySlug(input.orgSlug);
    if (!org) {
      throw ApiError.notFound('Organization not found');
    }

    const existing = await this.repository.findUserByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    // Server-enforced: signup only ever creates an Employee. There is no
    // client-suppliable role field anywhere in this path (plan.md §5.6).
    const user = await this.repository.createEmployee({
      orgId: org.id,
      name: input.name,
      email: input.email,
      passwordHash,
    });

    eventBus.emit('user.registered', { userId: user.id, orgId: user.orgId, email: user.email });

    const tokens = await this.issueTokens(user);
    return { user: toAuthenticatedUser(user), tokens };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw ApiError.forbidden('Account is inactive');
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = await this.issueTokens(user);
    return { user: toAuthenticatedUser(user), tokens };
  }

  async refresh(input: RefreshInput): Promise<TokenPair> {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const stored = await this.repository.findRefreshTokenById(payload.tokenId);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token is no longer valid');
    }
    if (stored.tokenHash !== hashToken(input.refreshToken)) {
      throw ApiError.unauthorized('Refresh token mismatch');
    }

    // Rotation: revoke the presented token and issue a fresh pair so a stolen,
    // already-used refresh token can never be replayed.
    await this.repository.revokeRefreshToken(stored.id);

    const user = await this.repository.findUserById(stored.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw ApiError.unauthorized('Account is no longer active');
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await this.repository.revokeRefreshToken(payload.tokenId);
    } catch {
      // Already invalid/expired — logout is idempotent, nothing further to do.
    }
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const accessToken = signAccessToken({
      sub: user.id,
      orgId: user.orgId,
      role: user.role as Role,
      departmentId: user.departmentId,
    });

    const tokenId = randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, tokenId });
    await this.repository.storeRefreshToken({
      id: tokenId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: addDuration(new Date(), env.JWT_REFRESH_EXPIRES_IN),
    });

    return { accessToken, refreshToken };
  }
}
