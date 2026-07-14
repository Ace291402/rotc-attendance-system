export type Role = 'admin' | 'officer' | 'cadet';

export interface User {
  username: string;
  role: Role;
  name: string;
}