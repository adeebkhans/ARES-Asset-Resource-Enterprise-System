import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '@/config/env';
import { Role } from '@/constants/roles';

export interface AccessTokenPayload {
  sub: string; // userId
  orgId: string;
  role: Role;
  departmentId: string | null;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  tokenId: string; // matches RefreshToken.id row, allows revocation lookups
}

// env values are validated strings like "15m" / "7d" — cast to jsonwebtoken's
// branded StringValue type since it can't be narrowed from a plain `string`.
const accessTokenOptions: jwt.SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
const refreshTokenOptions: jwt.SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] };

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, accessTokenOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshTokenOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/** Refresh tokens are stored hashed (never in plaintext) so a DB leak doesn't leak usable sessions. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
