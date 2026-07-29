import { api, clearAuthStorage, setAuthToken } from './api';
import type { AuthResponse, Role } from './types';

function mapFrontendRoleToApiRole(role: Role): string {
  if (role === 'officer') return 'officer';
  if (role === 'admin') return 'admin';
  return 'cadet';
}

export async function loginUser(username: string, password: string, role: Role): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/api/authentication/login', {
    username,
    password,
    role: mapFrontendRoleToApiRole(role),
  });

  if (response.data?.token) {
    setAuthToken(response.data.token);
  }

  return response.data;
}

export async function registerUser(username: string, password: string, role: Role) {
  const response = await api.post('/api/authentication/register', {
    username,
    password,
    role: mapFrontendRoleToApiRole(role),
  });

  return response.data as { success?: boolean; message?: string; cadet?: unknown };
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post('/api/Authentication/logout');
  } finally {
    clearAuthStorage();
  }
}