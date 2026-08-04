import { api } from './api';
import type { Attendance, AttendanceReport, AttendanceSummary } from './types';

export interface AttendancePayload {
  cadetId: number;
  officerName?: string;
}

export async function fetchAttendance(): Promise<Attendance[]> {
  const response = await api.get<Attendance[]>('/api/Attendance/attendance');

  if (response.status === 204) {
    return [];
  }

  return Array.isArray(response.data) ? response.data : [];
}

export async function searchAttendance(params: { cadetId?: number; date?: string; status?: string }): Promise<Attendance[]> {
  const query = new URLSearchParams();
  if (params.cadetId !== undefined) query.set('cadetId', String(params.cadetId));
  if (params.date) query.set('date', params.date);
  if (params.status) query.set('status', params.status);

  const response = await api.get<Attendance[]>(`/api/Attendance/search?${query.toString()}`);
  if (response.status === 204) {
    return [];
  }
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAttendanceHistory(cadetId: number): Promise<Attendance[]> {
  const response = await api.get<Attendance[]>(`/api/Attendance/history/${cadetId}`);
  if (response.status === 204) {
    return [];
  }
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAttendancePercentage(cadetId: number): Promise<AttendanceSummary> {
  const response = await api.get<AttendanceSummary>(`/api/Attendance/percentage/${cadetId}`);
  return response.data;
}

export async function fetchAttendanceSummary(): Promise<AttendanceSummary> {
  const response = await api.get<AttendanceSummary>('/api/Attendance/summary');
  return response.data;
}

export async function createAttendance(cadetId: number, officerName?: string): Promise<{ success: boolean; message: string; attendanceId?: number; cadetName?: string }> {
  const response = await api.post('/api/Attendance/attendance', {
    cadetId,
    officerName: officerName || 'Officer',
  });
  return response.data;
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

export async function scanAttendance(qrCodeId: string, officerName?: string): Promise<{ success: boolean; message: string; cadetName?: string }> {
  const response = await api.post('/api/Attendance/scan', {
    qrCodeId,
    officerName: officerName || 'Officer',
  });

  return response.data;
}
