import { apiRequest } from '@/lib/api-client';
import type { AuthResult, AuthenticatedUser } from '@/types/auth.types';

export interface RegisterOrganizationPayload {
  organizationName: string;
  adminName: string;
  email: string;
  password: string;
}

export interface SignupPayload {
  orgSlug: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function registerOrganization(payload: RegisterOrganizationPayload) {
  return apiRequest<AuthResult>('/auth/register-organization', { method: 'POST', body: payload, auth: false });
}

export function signup(payload: SignupPayload) {
  return apiRequest<AuthResult>('/auth/signup', { method: 'POST', body: payload, auth: false });
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResult>('/auth/login', { method: 'POST', body: payload, auth: false });
}

export function fetchMe() {
  return apiRequest<AuthenticatedUser & { status: string }>('/auth/me');
}

export function logout(refreshToken: string) {
  return apiRequest<{ loggedOut: boolean }>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
}

export function refresh(refreshToken: string) {
  return apiRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false });
}
