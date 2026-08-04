import { api } from './api';
import type { ApiCadet, CadetProfileResponse } from './types';

export interface CadetPayload {
  studentNumber: string;
  fullName: string;
  course: string;
  yearLevel: string;
}

export async function fetchCadets(): Promise<ApiCadet[]> {
  const response = await api.get<ApiCadet[]>('/api/Cadets/cadets');
  return Array.isArray(response.data) ? response.data : [];
}

export async function getCadetById(id: number | string): Promise<ApiCadet> {
  const response = await api.get<ApiCadet>(`/api/Cadets/cadets/${id}`);
  return response.data;
}

export async function createCadet(payload: CadetPayload): Promise<ApiCadet> {
  const response = await api.post<ApiCadet>('/api/Cadets/cadets', payload);
  return response.data;
}

export async function updateCadet(id: number | string, payload: CadetPayload): Promise<ApiCadet> {
  const response = await api.put<ApiCadet>(`/api/Cadets/cadets/${id}`, payload);
  return response.data;
}

export async function deleteCadet(id: number | string): Promise<void> {
  await api.delete(`/api/Cadets/cadets/${id}`);
}

// The backend should generate and persist the QR code when a cadet is created (POST /api/Cadets/cadets).
// Frontend should read the stored qrCodeId via the profile endpoint below.
export async function getCadetProfile(id: number | string): Promise<CadetProfileResponse> {
  const response = await api.get<CadetProfileResponse>(`/api/Cadets/profile/${id}`);
  return response.data;
}

// Backward-compatible alias used in UI: keep getCadetQr but read from profile endpoint.
export async function getCadetQr(id: number | string): Promise<{ cadetId: number; fullName: string; qrCodeId: string | null; qrCodeImageBase64?: string | null }> {
  const profile = await getCadetProfile(id);
  return {
    cadetId: profile.id,
    fullName: profile.fullName || '',
    qrCodeId: profile.qrCodeId ?? null,
    qrCodeImageBase64: profile.qrCodeImageBase64 ?? null,
  };
}
