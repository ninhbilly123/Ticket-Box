const getApiBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const apiHost = hostname === 'localhost' || hostname === '::1' ? '127.0.0.1' : hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${apiHost}:3000/api/v1`;
  }

  return 'http://127.0.0.1:3000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export type Role = 'ORGANIZER' | 'CHECKIN_STAFF' | 'AUDIENCE';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  organizationId: string | null;
  status: 'ACTIVE' | 'DISABLED';
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: SessionUser;
}

export const ADMIN_SESSION_KEY = 'ticketbox_admin_session';
export const ADMIN_SESSION_CHANGED_EVENT = 'ticketbox_admin_session_changed';

export interface Organization {
  id: string;
  name: string;
}

export interface TicketInventory {
  ticketTypeId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
}

export interface TicketType {
  id: string;
  concertId: string;
  name: string;
  zoneCode: string;
  price: string | number;
  totalQuantity: number;
  maxPerAccount: number;
  saleOpenAt: string | null;
  saleCloseAt: string | null;
  status: string;
  reservedQuantity: number;
  soldQuantity: number;
  inventory?: TicketInventory | null;
}

export interface Artist {
  id: string;
  name: string;
  bioGenerated: string | null;
  pdfSourceUrl: string | null;
  bioUpdatedAt: string | null;
}

export interface Concert {
  id: string;
  eventCode: string;
  organizerId: string;
  organizationId: string | null;
  organization?: Organization | null;
  name: string;
  venue: string;
  startAt: string;
  saleOpenAt: string;
  status: string;
  description: string | null;
  seatMapEnabled: boolean;
  svgSeatingMap: string | null;
  cancelledReason: string | null;
  cancelledAt: string | null;
  ticketTypes: TicketType[];
  artists?: Array<{ artist: Artist }>;
}

export interface ConcertReadinessCheck {
  key: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  blocking: boolean;
}

export interface ConcertReadiness {
  concertId: string;
  ready: boolean;
  checks: ConcertReadinessCheck[];
  blockingIssues: string[];
}

export type ArtistBioStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'AI_GENERATED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'FAILED';

export interface ArtistBio {
  id: string;
  concertId: string;
  sourcePdfObjectKey: string;
  sourcePdfFileName: string | null;
  status: ArtistBioStatus;
  rawText: string | null;
  cleanedText: string | null;
  generatedBio: string | null;
  reviewedBio: string | null;
  publishedBio: string | null;
  errorMessage: string | null;
  createdBy: string | null;
  reviewedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorEmail {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  allowedEventCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export type GuestImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'NO_FILE';

export interface GuestImportRowError {
  id: string;
  guestImportJobId: string;
  rowNumber: number;
  rawData: Record<string, unknown> | null;
  errorCode: string;
  message: string;
  createdAt: string;
}

export interface VipGuest {
  id: string;
  concertId: string;
  fullName: string;
  identifier: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  note: string | null;
  ticketStatus: 'VALID' | 'USED' | 'CANCELLED';
  emailStatus: 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';
  emailError: string | null;
  checkedInAt: string | null;
}

export interface GuestImportReport {
  id: string;
  concertId: string | null;
  status: GuestImportStatus;
  senderEmail: string | null;
  mailboxMessageId: string | null;
  originalFileName: string | null;
  objectKey: string | null;
  totalRows: number;
  successRows: number;
  duplicateRows: number;
  errorRows: number;
  emailSentRows: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rowErrors: GuestImportRowError[];
  vipGuests?: VipGuest[];
}

export interface StaffAssignment {
  id: string;
  staffId: string;
  concertId: string;
  gateId: string;
  createdAt: string;
  staff?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export interface WhitelistConfig {
  id: string;
  organizationId: string;
  concertId: string | null;
  mailboxAddress: string;
  allowedSenderEmail: string;
  subjectKeyword: string;
  status: string;
  concert?: { id: string; name: string } | null;
  organization?: Organization;
}

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: 'ACTIVE' | 'DISABLED';
  organizationId: string | null;
  createdAt: string;
}

export interface CheckinStats {
  totalTickets: number;
  checkedInTickets: number;
  percent: number;
  byTicketType: Record<string, { total: number; checkedIn: number; percent: number }>;
}

export interface RevenueSummary {
  concertId: string;
  paidOrders: number;
  ticketsSold: number;
  totalRevenue: number;
  byTicketType: Record<string, { quantity: number; revenue: number }>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

type ApiError = Error & { code?: string; status?: number };

let refreshSessionPromise: Promise<AuthSession | null> | null = null;

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStoredAdminSession(): AuthSession | null {
  if (!canUseBrowserStorage()) return null;

  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export function writeStoredAdminSession(session: AuthSession) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent<AuthSession>(ADMIN_SESSION_CHANGED_EVENT, { detail: session }));
}

export function clearStoredAdminSession() {
  if (!canUseBrowserStorage()) return;
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new CustomEvent<null>(ADMIN_SESSION_CHANGED_EVENT, { detail: null }));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !json.success) {
    const message = json.error?.message || `Yêu cầu thất bại với mã trạng thái ${response.status}`;
    const error = new Error(message) as ApiError;
    error.code = json.error?.code;
    error.status = response.status;
    throw error;
  }
  return json.data as T;
}

function shouldRefresh(error: unknown) {
  const apiError = error as ApiError;
  return apiError.status === 401 || apiError.code === 'AUTH_TOKEN_EXPIRED';
}

function getFreshestToken(token?: string) {
  if (!token) return undefined;
  const storedSession = readStoredAdminSession();
  return storedSession?.accessToken || token;
}

async function refreshStoredAdminSession(): Promise<AuthSession | null> {
  const storedSession = readStoredAdminSession();
  if (!storedSession?.refreshToken) {
    clearStoredAdminSession();
    return null;
  }

  if (!refreshSessionPromise) {
    refreshSessionPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedSession.refreshToken }),
    })
      .then((response) => parseResponse<AuthSession>(response))
      .then((nextSession) => {
        writeStoredAdminSession(nextSession);
        return nextSession;
      })
      .catch(() => {
        clearStoredAdminSession();
        return null;
      })
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const request = async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
    return parseResponse<T>(response);
  };

  const token = getFreshestToken(options.token);

  try {
    return await request(token);
  } catch (error) {
    if (!options.token || !shouldRefresh(error) || path === '/auth/refresh') {
      throw error;
    }

    const refreshedSession = await refreshStoredAdminSession();
    if (!refreshedSession) {
      throw error;
    }

    return request(refreshedSession.accessToken);
  }
}

async function apiMultipartRequest<T>(path: string, token: string, body: FormData): Promise<T> {
  const request = async (accessToken: string) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
    return parseResponse<T>(response);
  };

  try {
    return await request(getFreshestToken(token) || token);
  } catch (error) {
    if (!shouldRefresh(error)) {
      throw error;
    }

    const refreshedSession = await refreshStoredAdminSession();
    if (!refreshedSession) {
      throw error;
    }

    return request(refreshedSession.accessToken);
  }
}

export const adminApi = {
  login(email: string, password: string) {
    return apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me(token: string) {
    return apiRequest<SessionUser>('/auth/me', { token });
  },
  logout(refreshToken: string) {
    return apiRequest<{ revoked: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  changePassword(token: string, payload: { currentPassword: string; newPassword: string }) {
    return apiRequest<{ changed: boolean }>('/auth/change-password', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  listConcerts(token: string) {
    return apiRequest<Concert[]>('/admin/concerts', { token });
  },
  getConcert(token: string, id: string) {
    return apiRequest<Concert>(`/admin/concerts/${id}`, { token });
  },
  createConcert(token: string, payload: Record<string, unknown>) {
    return apiRequest<Concert>('/admin/concerts', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  updateConcert(token: string, id: string, payload: Record<string, unknown>) {
    return apiRequest<Concert>(`/admin/concerts/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
  publishConcert(token: string, id: string) {
    return apiRequest<Concert>(`/admin/concerts/${id}/publish`, {
      method: 'POST',
      token,
    });
  },
  getConcertReadiness(token: string, id: string) {
    return apiRequest<ConcertReadiness>(`/admin/concerts/${id}/readiness`, { token });
  },
  listConcertArtists(token: string, id: string) {
    return apiRequest<Artist[]>(`/admin/concerts/${id}/artists`, { token });
  },
  addConcertArtist(token: string, id: string, name: string) {
    return apiRequest<Artist>(`/admin/concerts/${id}/artists`, {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    });
  },
  removeConcertArtist(token: string, id: string, artistId: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/concerts/${id}/artists/${artistId}`, {
      method: 'DELETE',
      token,
    });
  },
  uploadSeatMap(token: string, id: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    return apiMultipartRequest<{ concert: Concert; zoneCodes: string[] }>(`/admin/concerts/${id}/seat-map`, token, body);
  },
  deleteSeatMap(token: string, id: string) {
    return apiRequest<Concert>(`/admin/concerts/${id}/seat-map`, {
      method: 'DELETE',
      token,
    });
  },
  cancelConcert(token: string, id: string, reason: string) {
    return apiRequest<Concert>(`/admin/concerts/${id}/cancel`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason }),
    });
  },
  listTicketTypes(token: string, concertId: string) {
    return apiRequest<TicketType[]>(`/admin/concerts/${concertId}/ticket-types`, { token });
  },
  createTicketType(token: string, concertId: string, payload: Record<string, unknown>) {
    return apiRequest<TicketType>(`/admin/concerts/${concertId}/ticket-types`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  updateTicketType(token: string, id: string, payload: Record<string, unknown>) {
    return apiRequest<TicketType>(`/admin/ticket-types/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
  getInventory(token: string, ticketTypeId: string) {
    return apiRequest<TicketInventory>(`/admin/ticket-types/${ticketTypeId}/inventory`, { token });
  },
  updateInventory(token: string, ticketTypeId: string, totalQuantity: number) {
    return apiRequest<TicketInventory>(`/admin/ticket-types/${ticketTypeId}/inventory`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ totalQuantity }),
    });
  },
  listStaffAssignments(token: string, concertId: string) {
    return apiRequest<StaffAssignment[]>(`/admin/concerts/${concertId}/staff-assignments`, { token });
  },
  createStaffAssignment(token: string, concertId: string, staffId: string, gateId: string) {
    return apiRequest<StaffAssignment>(`/admin/concerts/${concertId}/staff-assignments`, {
      method: 'POST',
      token,
      body: JSON.stringify({ staffId, gateId }),
    });
  },
  deleteStaffAssignment(token: string, assignmentId: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/staff-assignments/${assignmentId}`, {
      method: 'DELETE',
      token,
    });
  },
  listWhitelistConfigs(token: string) {
    return apiRequest<WhitelistConfig[]>('/admin/whitelist-email-configs', { token });
  },
  createWhitelistConfig(token: string, payload: Record<string, unknown>) {
    return apiRequest<WhitelistConfig>('/admin/whitelist-email-configs', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  updateWhitelistConfig(token: string, id: string, payload: Record<string, unknown>) {
    return apiRequest<WhitelistConfig>(`/admin/whitelist-email-configs/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
  deleteWhitelistConfig(token: string, id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/whitelist-email-configs/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  revenueSummary(token: string, concertId: string) {
    return apiRequest<RevenueSummary>(`/admin/concerts/${concertId}/revenue-summary`, { token });
  },
  listStaff(token: string) {
    return apiRequest<StaffUser[]>('/admin/staff', { token });
  },
  createStaff(token: string, payload: Record<string, unknown>) {
    return apiRequest<StaffUser>('/admin/staff', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  deleteTicketType(token: string, id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/ticket-types/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  getLatestArtistBio(token: string, concertId: string) {
    return apiRequest<ArtistBio | null>(`/ai/artist-bio/concerts/${concertId}`, { token });
  },
  uploadArtistBio(token: string, concertId: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    return apiMultipartRequest<ArtistBio>(`/ai/artist-bio/concerts/${concertId}/upload`, token, body);
  },
  reviewArtistBio(token: string, id: string, reviewedBio: string) {
    return apiRequest<ArtistBio>(`/ai/artist-bio/${id}/review`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ reviewedContent: reviewedBio }),
    });
  },
  publishArtistBio(token: string, id: string) {
    return apiRequest<ArtistBio>(`/ai/artist-bio/${id}/publish`, {
      method: 'POST',
      token,
    });
  },
  listSponsorEmails(token: string) {
    return apiRequest<SponsorEmail[]>('/vip-guest-sync/sponsors', { token });
  },
  createSponsorEmail(
    token: string,
    payload: { email: string; displayName?: string; allowedEventCodes: string[] }
  ) {
    return apiRequest<SponsorEmail>('/vip-guest-sync/sponsors', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  updateSponsorEmail(
    token: string,
    id: string,
    payload: { displayName?: string; isActive?: boolean; allowedEventCodes?: string[] }
  ) {
    return apiRequest<SponsorEmail>(`/vip-guest-sync/sponsors/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
  listGuestImportReports(token: string) {
    return apiRequest<GuestImportReport[]>('/vip-guest-sync/import-reports', { token });
  },
  getGuestImportReport(token: string, id: string) {
    return apiRequest<GuestImportReport>(`/vip-guest-sync/import-reports/${id}`, { token });
  },
  fetchAdminCheckinStats(token: string, concertId: string) {
    return apiRequest<CheckinStats>(`/admin/concerts/${concertId}/checkin-stats`, { token });
  },
};

export function formatMoney(value: number | string) {
  return Number(value).toLocaleString('vi-VN') + ' d';
}
