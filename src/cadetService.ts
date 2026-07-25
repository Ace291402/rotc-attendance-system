import { api } from './api';
import type { ApiCadet } from './types';

export async function fetchCadets(): Promise<ApiCadet[]> {
  const response = await api.get<ApiCadet[]>('/api/Cadets/cadets');
  return response.data;
}

export async function generateCadetQr(id: number | string): Promise<{ cadetId: number; fullName: string; qrCodeValue: string; qrCodeImageBase64?: string }> {
  const response = await api.post(`/api/Cadets/cadets/${id}/qr`);
  return response.data;
}

export async function getCadetQr(id: number | string): Promise<{ cadetId: number; fullName: string; qrCodeValue: string; qrCodeImageBase64?: string }> {
  const response = await api.get(`/api/Cadets/cadets/${id}/qr`);
  return response.data;
}