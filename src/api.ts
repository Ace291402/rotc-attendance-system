import axios, { AxiosError } from 'axios';
import type { Role } from './types';

const TOKEN_KEY = 'rotc_auth_token';
const SESSION_KEY = 'rotc_auth_session';

export interface StoredAuthSession {
  username: string;
  role: Role;
  name: string;
  userId?: number;
  platoon?: string;
  cadetId?: number;
}

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'https://localhost:7055').replace(/\/$/, '');

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

function readMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const payload = data as Record<string, unknown>;
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  if (Array.isArray(payload.errors)) {
    const firstError = payload.errors.find((item) => typeof item === 'string' && item.trim());
    if (typeof firstError === 'string') {
      return firstError;
    }
  }

  if (payload.errors && typeof payload.errors === 'object') {
    const firstGroup = Object.values(payload.errors as Record<string, unknown>).find(Array.isArray);
    if (Array.isArray(firstGroup)) {
      const firstError = firstGroup.find((item) => typeof item === 'string' && item.trim());
      if (typeof firstError === 'string') {
        return firstError;
      }
    }
  }

  return fallback;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string, rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem(TOKEN_KEY);
  otherStorage.removeItem(SESSION_KEY);
  storage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function setStoredAuthSession(session: StoredAuthSession, rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem(TOKEN_KEY);
  otherStorage.removeItem(SESSION_KEY);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

function isUsableAuthToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) {
    return false;
  }

  try {
    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getStoredAuthSession(): StoredAuthSession | null {
  for (const storage of [localStorage, sessionStorage]) {
    const token = storage.getItem(TOKEN_KEY);
    const raw = storage.getItem(SESSION_KEY);
    if (!token && !raw) {
      continue;
    }

    if (!token || !raw || !isUsableAuthToken(token)) {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(SESSION_KEY);
      continue;
    }

    try {
      const session = JSON.parse(raw) as StoredAuthSession;
      if (!session || typeof session.username !== 'string' || typeof session.role !== 'string' || typeof session.name !== 'string') {
        throw new Error('Stored authentication session is invalid.');
      }
      return session;
    } catch {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(SESSION_KEY);
    }
  }

  return null;
}

export function clearStoredAuthSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function clearAuthStorage() {
  clearAuthToken();
  clearStoredAuthSession();
}

const AUTH_ENDPOINTS = [
  '/api/Authentication/login',
  '/api/Authentication/register',
  '/api/Authentication/logout',
  '/api/Authentication/forgot-password',
  '/api/Authentication/reset-password',
];

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  const requestUrl = String(config.url || '');
  const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint));

  console.debug('[api] request', { requestUrl, isAuthEndpoint, hasToken: !!token });

  if (token && !isAuthEndpoint) {
    const existing = (config.headers && typeof config.headers === 'object') ? (config.headers as Record<string, unknown>) : {};
    config.headers = {
      ...existing,
      Authorization: 'Bearer ' + token,
    } as any;
    console.debug('[api] attached Authorization header to request');
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      clearAuthStorage();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('rotc-auth-unauthorized'));
      }
    }

    const message = readMessage(
      data,
      status === 401
        ? 'Session expired. Please log in again.'
        : status === 403
          ? 'You do not have permission to perform this action.'
          : status === 404
            ? 'The requested resource was not found.'
            : status === 409
              ? 'This action conflicts with existing data.'
              : status === 500
                ? 'The server failed to process this request.'
                : error.message || 'Request failed.',
    );

    return Promise.reject(new ApiError(message, status, data));
  },
);





