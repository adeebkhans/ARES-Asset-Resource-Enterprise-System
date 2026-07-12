import { useAuthStore } from '@/store/auth.store';
import { ApiRequestError } from '@/types/api.types';
import type { ApiResponse } from '@/types/api.types';

const BASE_URL = import.meta.env.VITE_API_URL;

// Concurrent 401s share one in-flight refresh instead of each firing their own.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, clear } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;

    if (!res.ok || !body.success) {
      clear();
      return null;
    }

    useAuthStore.setState({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken });
    return body.data.accessToken;
  } catch {
    clear();
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Set false for endpoints that must not attach/refresh a bearer token (login, signup, ...). */
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const doFetch = (): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = useAuthStore.getState().accessToken;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && auth) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const newToken = await refreshPromise;
    if (newToken) {
      res = await doFetch();
    }
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !json || !json.success) {
    const error = json && !json.success ? json.error : undefined;
    throw new ApiRequestError(res.status, error?.code ?? 'UNKNOWN', error?.message ?? 'Request failed', error?.details);
  }

  return json.data;
}
