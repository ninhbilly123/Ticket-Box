export type Role = 'AUDIENCE' | 'ORGANIZER' | 'CHECKIN_STAFF';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
  status: UserStatus;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  organizationId?: string | null;
}
