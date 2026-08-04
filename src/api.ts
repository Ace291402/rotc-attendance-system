import axios, { AxiosError, AxiosHeaders } from 'axios';
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
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setStoredAuthSession(session: StoredAuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getStoredAuthSession(): StoredAuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function clearStoredAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function clearAuthStorage() {
  clearAuthToken();
  clearStoredAuthSession();
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      const headers = new AxiosHeaders(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
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
