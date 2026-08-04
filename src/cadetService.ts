import { api } from './api';
import type { ApiCadet, CadetProfileResponse } from './types';

export async function fetchCadets(): Promise<ApiCadet[]> {
  const response = await api.get<ApiCadet[]>('/api/Cadets/cadets');
  return response.data;
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
