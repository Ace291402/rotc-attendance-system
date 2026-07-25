import { api, clearAuthStorage, setAuthToken } from './api';
import type { AuthResponse, Role } from './types';

function mapFrontendRoleToApiRole(role: Role): string {
  if (role === 'officer') return 'ROTCOfficer';
  if (role === 'admin') return 'Admin';
  return 'Cadet';
}

export async function loginUser(username: string, password: string, role: Role): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/api/Authentication/login', {
    username,
    password,
    role: mapFrontendRoleToApiRole(role),
  });

  setAuthToken(response.data.token);
  return response.data;
}

export async function registerUser(username: string, password: string, role: Role) {
  const response = await api.post('/api/Authentication/register', {
    username,
    password,
    role: mapFrontendRoleToApiRole(role),
  });

  return response.data as { success: boolean; message: string };
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post('/api/Authentication/logout');
  } finally {
    clearAuthStorage();
  }
}