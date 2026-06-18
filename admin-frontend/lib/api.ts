const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3000/api/v1`;
  }

  return 'http://localhost:3000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export type Role = 'ADMIN' | 'ORGANIZER' | 'CHECKIN_STAFF' | 'AUDIENCE';

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

export interface Concert {
  id: string;
  organizerId: string;
  organizationId: string | null;
  organization?: Organization | null;
  name: string;
  venue: string;
  startAt: string;
  saleOpenAt: string;
  status: string;
  description: string | null;
  svgSeatingMap: string | null;
  cancelledReason: string | null;
  cancelledAt: string | null;
  ticketTypes: TicketType[];
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

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: 'ACTIVE' | 'DISABLED';
  organizationId: string | null;
  createdAt: string;
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

async function parseResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !json.success) {
    const message = json.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    (error as Error & { code?: string }).code = json.error?.code;
    throw error;
  }
  return json.data as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  return parseResponse<T>(response);
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
  listUsers(token: string) {
    return apiRequest<AdminUser[]>('/admin/users', { token });
  },
  updateUserRole(token: string, userId: string, role: Role) {
    return apiRequest<AdminUser>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ role }),
    });
  },
  updateUserStatus(token: string, userId: string, status: 'ACTIVE' | 'DISABLED') {
    return apiRequest<AdminUser>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
  },
};

export function formatMoney(value: number | string) {
  return Number(value).toLocaleString('vi-VN') + ' d';
}
