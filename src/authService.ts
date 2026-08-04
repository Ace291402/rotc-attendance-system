import { api, clearAuthStorage, setAuthToken } from './api';
import type { AuthResponse, RegisterResponse, Role } from './types';

function mapFrontendRoleToApiRole(role: Role): string {
  if (role === 'officer') return 'ROTCOfficer';
  if (role === 'admin') return 'Admin';
  return 'Cadet';
}

interface CadetRegistrationFields {
  studentNumber: string;
  fullName: string;
  course: string;
  yearLevel: string;
}

interface LoginApiResponse {
  token?: string;
  user?: {
    id?: number;
    username?: string;
    role?: string;
    name?: string;
    fullName?: string;
    platoon?: string;
    cadetId?: number;
  };
  id?: number;
  username?: string;
  role?: string;
  name?: string;
  fullName?: string;
  cadetId?: number;
  cadet?: {
    id?: number;
    qrCodeId?: string;
  };
}

function normalizeAuthResponse(data: LoginApiResponse): AuthResponse {
  if (!data.token) {
    throw new Error('Token was not returned by the server.');
  }

  const username = data.user?.username ?? data.username;
  const role = data.user?.role ?? data.role;

  if (!username || !role) {
    throw new Error('Login response is missing user information.');
  }

  const cadetFromResponse = data.cadet?.id ?? data.user?.cadetId ?? data.cadetId;
  const userId = data.user?.id ?? data.id ?? 0;

  return {
    token: data.token,
    user: {
      id: userId,
      username,
      role,
      name: data.user?.name ?? data.user?.fullName ?? data.name ?? data.fullName ?? username,
      platoon: data.user?.platoon,
      cadetId: cadetFromResponse,
    },
    cadet: data.cadet
      ? {
          id: data.cadet.id ?? cadetFromResponse ?? 0,
          studentNumber: null,
          fullName: null,
          course: null,
          yearLevel: null,
          qrCodeId: data.cadet.qrCodeId ?? null,
        }
      : undefined,
  };
}

export async function loginUser(username: string, password: string, role: Role): Promise<AuthResponse> {
  const response = await api.post<LoginApiResponse>('/api/Authentication/login', {
    username,
    password,
    role: mapFrontendRoleToApiRole(role),
  });

  const authResponse = normalizeAuthResponse(response.data);

  setAuthToken(authResponse.token);

  return authResponse;
}

export async function registerUser(
  username: string,
  password: string,
  role: Role,
  cadetFields?: CadetRegistrationFields,
): Promise<RegisterResponse> {
  const payload: Record<string, unknown> = {
    username,
    password,
    role: mapFrontendRoleToApiRole(role),
  };

  if (role === 'cadet' && cadetFields) {
    payload.studentNumber = cadetFields.studentNumber;
    payload.fullName = cadetFields.fullName;
    payload.course = cadetFields.course;
    payload.yearLevel = cadetFields.yearLevel;
  }

  const response = await api.post<RegisterResponse>('/api/Authentication/register', payload);
  return response.data;
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post('/api/Authentication/logout');
  } finally {
    clearAuthStorage();
  }
}