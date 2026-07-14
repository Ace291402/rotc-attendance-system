export type Role = 'admin' | 'officer' | 'cadet';

export interface Cadet {
  id: string;
  name: string;
  serialNumber: string;
  platoon: string;
  company: string;
  attendanceRate: number;
}

export interface AttendanceRecord {
  id: string;
  cadetId: string;
  cadetName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  company: string;
}