import { api } from './api';
import axios from 'axios';
import type {
  Attendance,
  AttendanceFilterParams,
  AttendanceReport,
  AttendanceScanResponse,
  AttendanceSearchParams,
  AttendanceSummary,
} from './types';

export interface AttendancePayload {
  cadetId: number;
  date?: string;
  timeIn?: string | null;
  timeOut?: string | null;
  status?: string;
}

function asAttendanceList(data: unknown) {
  return Array.isArray(data) ? (data as Attendance[]) : [];
}

function asSummary(data: unknown): AttendanceSummary {
  if (!data || typeof data !== 'object') {
    return {};
  }
  return data as AttendanceSummary;
}

export async function fetchAttendance(): Promise<Attendance[]> {
  const response = await api.get<Attendance[]>('/api/Attendance/attendance');

  if (response.status === 204) {
    return [];
  }

  return asAttendanceList(response.data);
}

export async function getAttendanceById(id: number | string): Promise<Attendance> {
  const response = await api.get<Attendance>(`/api/Attendance/attendance/${id}`);
  return response.data;
}

export async function searchAttendance(params: AttendanceSearchParams): Promise<Attendance[]> {
  const query = new URLSearchParams();
  if (params.cadetId !== undefined) query.set('cadetId', String(params.cadetId));
  if (params.date) query.set('date', params.date);
  if (params.status) query.set('status', params.status);

  const response = await api.get<Attendance[]>(`/api/Attendance/search?${query.toString()}`);
  if (response.status === 204) {
    return [];
  }
  return asAttendanceList(response.data);
}

export async function filterAttendance(params: AttendanceFilterParams): Promise<Attendance[]> {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString();
  const response = await api.get<Attendance[]>(`/api/Attendance/filter${queryString ? `?${queryString}` : ''}`);
  if (response.status === 204) {
    return [];
  }
  return asAttendanceList(response.data);
}

export async function fetchAttendanceByCadet(cadetId: number): Promise<Attendance[]> {
  const response = await api.get<Attendance[]>(`/api/Attendance/cadet/${cadetId}`);
  if (response.status === 204) {
    return [];
  }
  return asAttendanceList(response.data);
}

export async function fetchAttendanceHistory(cadetId: number): Promise<Attendance[]> {
  const response = await api.get<Attendance[]>(`/api/Attendance/history/${cadetId}`);
  if (response.status === 204) {
    return [];
  }
  return asAttendanceList(response.data);
}

export async function fetchAttendancePercentage(cadetId: number): Promise<AttendanceSummary> {
  const response = await api.get<AttendanceSummary>(`/api/Attendance/percentage/${cadetId}`);
  return asSummary(response.data);
}

export async function fetchAttendanceSummary(): Promise<AttendanceSummary> {
  const response = await api.get<AttendanceSummary>('/api/Attendance/summary');
  return asSummary(response.data);
}

export async function createAttendance(cadetId: number, payloadOverrides?: Partial<AttendancePayload>): Promise<{ success: boolean; message: string; attendanceId?: number; cadetName?: string }> {
  const payload: AttendancePayload = {
    cadetId,
    date: new Date().toISOString(),
    status: 'Present',
    ...payloadOverrides,
  };
  const response = await api.post('/api/Attendance/attendance', payload);
  return response.data;
}

export async function updateAttendance(
  id: number | string,
  payload: AttendancePayload,
): Promise<{ success?: boolean; message?: string }> {
  const response = await api.put(`/api/Attendance/attendance/${id}`, payload);
  return response.data as { success?: boolean; message?: string };
}

export async function deleteAttendance(id: number | string): Promise<void> {
  await api.delete(`/api/Attendance/attendance/${id}`);
}

export async function fetchAttendanceReport(): Promise<AttendanceReport> {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const end = new Date();
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const response = await api.get<AttendanceReport>(`/api/Attendance/report?${params.toString()}`);
  return response.data;
}

export async function scanAttendance(qrCodeId: string): Promise<AttendanceScanResponse> {
  const path = '/api/Attendance/scan';
  const trimmedQrCodeId = qrCodeId?.trim();
  if (!trimmedQrCodeId) {
    throw new Error('QR code is required.');
  }

  try {
    console.log('[attendanceService] scanAttendance calling', {
      baseURL: (api.defaults && (api.defaults as any).baseURL) || undefined,
      url: `${(api.defaults as any).baseURL || ''}${path}`,
      payload: { qrCodeId: trimmedQrCodeId },
    });

    const response = await api.post(path, { qrCodeId: trimmedQrCodeId });

    console.log('[attendanceService] scanAttendance response', {
      status: response.status,
      data: response.data,
    });

    return response.data as AttendanceScanResponse;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('[attendanceService] scanAttendance axios error', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        requestUrl: err.config?.url,
        requestHeaders: err.config?.headers,
      });
    } else {
      console.error('[attendanceService] scanAttendance unknown error', err);
    }
    throw err;
  }
}
