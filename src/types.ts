export type Role = 'admin' | 'officer' | 'cadet';

export interface User {
  id: number;
  username: string;
  role: Role;
  name?: string;
  platoon?: string;
}

export interface ApiCadet {
  id: number;
  studentNumber: string | null;
  fullName: string | null;
  course: string | null;
  yearLevel: string | null;
  qrCodeValue?: string | null;
  qrCodeImageBase64?: string | null;
}

export interface Cadet {
  id: number | string;
  name: string;
  serialNumber: string;
  sn: string;
  platoon: string;
  company?: string;
  attendanceRate: number;
  courseYear: string;
  totalPresent: number;
  totalAbsent: number;
  requirements: {
    birthCertificate: boolean;
    medicalClearance: boolean;
    rotcForm1: boolean;
  };
  rank: string;
  status: string;
}

export interface Attendance {
  id: number;
  cadetId: number;
  date: string;
  status?: string | null;
  cadet?: ApiCadet;
}

export interface AttendanceRecord {
  id: string | number;
  cadetId: string | number;
  cadetName: string;
  date: string;
  status: string;
  company?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  cadet?: ApiCadet;
}

export interface AttendanceReport {
  weeklySummary: string;
  pendingReview: number;
  exportReady: number;
}