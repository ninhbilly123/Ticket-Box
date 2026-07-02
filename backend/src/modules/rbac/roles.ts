import { Role } from '../../shared/types/auth';

const roleAliases: Record<string, Role> = {
  audience: 'AUDIENCE',
  organizer: 'ORGANIZER',
  gate_staff: 'CHECKIN_STAFF',
  checkin_staff: 'CHECKIN_STAFF',
  AUDIENCE: 'AUDIENCE',
  ORGANIZER: 'ORGANIZER',
  CHECKIN_STAFF: 'CHECKIN_STAFF',
};

export function normalizeRole(role: string): Role {
  const normalized = roleAliases[role] || roleAliases[role.toLowerCase()];
  if (!normalized) {
    return 'AUDIENCE';
  }
  return normalized;
}

export function isRole(role: string, expected: Role): boolean {
  return normalizeRole(role) === expected;
}

export function roleIn(role: string, expected: Role[]): boolean {
  return expected.includes(normalizeRole(role));
}
