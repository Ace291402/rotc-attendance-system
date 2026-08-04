import { api, clearAuthStorage, setAuthToken } from './api';
import type { AuthResponse, Role } from './types';

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

interface RegisterResponse {
  success?: boolean;
  message?: string;
  qrCodeId?: string;
  cadet?: {
    id?: number;
    qrCodeId?: string;
  };
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

  const response = await api.post<RegisterResponse>('/api/authentication/register', payload);
  return response.data;
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post('/api/Authentication/logout');
  } finally {
    clearAuthStorage();
  }
}