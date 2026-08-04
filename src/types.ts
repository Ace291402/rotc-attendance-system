export type Role = 'admin' | 'officer' | 'cadet';

export interface AuthUser {
  id: number;
  username: string;
  role: Role | string;
  name?: string;
  platoon?: string;
  cadetId?: number;
}

export interface ApiCadet {
  id: number;
  studentNumber: string | null;
  fullName: string | null;
  course: string | null;
  yearLevel: string | null;
  qrCodeId?: string | null;
  qrCodeImageBase64?: string | null;
}

export interface CadetProfileResponse {
  id: number;
  userId?: number;
  studentNumber?: string | null;
  fullName?: string | null;
  course?: string | null;
  yearLevel?: string | null;
  email?: string | null;
  qrCodeId?: string | null;
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
  notes?: string | null;
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
  user: AuthUser;
  cadet?: ApiCadet;
  qrCodeId?: string;
}

export interface AttendanceReport {
  weeklySummary: string;
  pendingReview: number;
  exportReady: number;
}

export interface AttendanceSummary {
  totalCadets?: number;
  presentToday?: number;
  absentToday?: number;
  lateToday?: number;
  totalAttendance?: number;
  attendancePercentage?: number;
  attendanceRate?: number;
  percentage?: number;
  today?: string;
}

export interface AttendanceSearchParams {
  cadetId?: number;
  date?: string;
  status?: string;
}

export interface AttendanceFilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface AttendanceCreateResponse {
  success: boolean;
  message?: string;
  attendanceId?: number;
  cadetName?: string;
}

export interface AttendanceScanResponse {
  success: boolean;
  message: string;
  cadetName?: string;
}

export interface RegisterResponse {
  success?: boolean;
  message?: string;
  qrCodeId?: string;
  cadet?: {
    id?: number;
    qrCodeId?: string;
  };
}