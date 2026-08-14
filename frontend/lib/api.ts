const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    // Client-side: tự động lấy IP/hostname của máy tính chạy backend
    const hostname = window.location.hostname;
    const apiHost = hostname === 'localhost' || hostname === '::1' ? '127.0.0.1' : hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${apiHost}:3000/api/v1`;
  }

  // Server-side (Next.js SSR/build)
  return 'http://127.0.0.1:3000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export interface TicketType {
  id: string;
  name: string;
  zoneCode: string;
  price: number;
  totalQuantity: number;
  maxLimitPerUser: number;
  remaining: number;
}

export interface Concert {
  id: string;
  title: string;
  name?: string;
  description: string | null;
  artist: string;
  artistBio: string | null;
  dateTime: string;
  startAt?: string;
  location: string;
  venue?: string;
  seatMapEnabled?: boolean;
  seatMapSvg?: string | null;
  seatMapUrl?: string;
  ticketTypes: TicketType[];
}

async function readApiJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const error = new Error(json.message || json.error?.message || fallbackMessage);
    (error as Error & { errorCode?: string }).errorCode = json.errorCode || json.error?.code;
    throw error;
  }
  return json.data as T;
}

export async function fetchConcerts(filters: {
  search?: string;
  artist?: string;
  date?: string;
  location?: string;
} = {}): Promise<Concert[]> {
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.artist) queryParams.append('artist', filters.artist);
  if (filters.date) queryParams.append('date', filters.date);
  if (filters.location) queryParams.append('location', filters.location);

  const res = await fetch(`${API_BASE_URL}/concerts?${queryParams.toString()}`, {
    cache: 'no-store', // Disable caching to fetch real-time remaining tickets
  });
  return readApiJson<Concert[]>(res, 'Failed to fetch concerts');
}

export async function fetchConcertById(id: string): Promise<Concert> {
  const res = await fetch(`${API_BASE_URL}/concerts/${id}`, {
    cache: 'no-store', // Always get fresh data
  });
  return readApiJson<Concert>(res, 'Failed to fetch concert details');
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone?: string | null;
    organizationId?: string | null;
    status?: string;
  };
}

export async function login(params: { email: string; password: string }): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return readApiJson<AuthSession>(res, 'Đăng nhập thất bại');
}

export async function register(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return readApiJson<AuthSession>(res, 'Register failed');
}

export async function refreshAuth(refreshToken: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return readApiJson<AuthSession>(res, 'Session expired');
}

export async function logoutAuth(refreshToken?: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthSession['user']> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  return readApiJson<AuthSession['user']>(res, 'Cannot load profile');
}

export async function updateProfile(
  accessToken: string,
  payload: { fullName?: string; phone?: string | null }
): Promise<AuthSession['user']> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return readApiJson<AuthSession['user']>(res, 'Không thể cập nhật hồ sơ');
}

export async function changePassword(
  accessToken: string,
  payload: { currentPassword: string; newPassword: string }
): Promise<{ changed: boolean }> {
  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return readApiJson<{ changed: boolean }>(res, 'Không thể đổi mật khẩu');
}

export type WaitingRoomStatus =
  | { status: 'WAITING'; position: number }
  | { status: 'READY'; checkoutToken: string; expiresInSeconds: number };

export async function joinWaitingRoom(params: {
  concertId: string;
  accessToken: string;
}): Promise<WaitingRoomStatus> {
  const res = await fetch(`${API_BASE_URL}/concerts/${params.concertId}/waiting-room/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  return readApiJson<WaitingRoomStatus>(res, 'Không thể tham gia hàng chờ');
}

export async function fetchWaitingRoomStatus(params: {
  concertId: string;
  accessToken: string;
}): Promise<WaitingRoomStatus> {
  const res = await fetch(`${API_BASE_URL}/concerts/${params.concertId}/waiting-room/status`, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
    cache: 'no-store',
  });
  return readApiJson<WaitingRoomStatus>(res, 'Không thể kiểm tra hàng chờ');
}

export interface HoldOrderResponse {
  orderId: string;
  totalAmount: number;
  orderStatus: 'AWAITING_PAYMENT' | string;
  expiresAt: string;
  expiresInSeconds: number;
  items: Array<{
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function holdOrder(params: {
  concertId: string;
  ticketTypeId: string;
  quantity: number;
  accessToken: string;
  checkoutToken?: string;
  idempotencyKey: string;
}): Promise<HoldOrderResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.accessToken}`,
    'Idempotency-Key': params.idempotencyKey,
  };
  if (params.checkoutToken) {
    headers['Checkout-Token'] = params.checkoutToken;
  }

  const res = await fetch(`${API_BASE_URL}/orders/hold`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      concertId: params.concertId,
      items: [{ ticketTypeId: params.ticketTypeId, quantity: params.quantity }],
    }),
  });
  return readApiJson<HoldOrderResponse>(res, 'Giữ vé thất bại');
}

export interface BookTicketsResponse {
  order: {
    id: string;
    userId: string;
    concertId: string;
    totalAmount: number;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'PENDING' | 'PAID' | 'CANCELLED';
    createdAt: string;
  };
  tickets: Array<{
    id: string;
    orderId?: string;
    ticketTypeId?: string;
    orderItemId?: string;
    qrCode?: string;
    seatNumber: string | null;
    status: 'valid' | 'used' | 'cancelled' | 'RESERVED' | 'BOOKED' | 'REFUNDED';
    createdAt: string;
  }>;
}

export async function fetchOrderById(id: string, accessToken: string): Promise<BookTicketsResponse> {
  const res = await fetch(`${API_BASE_URL}/tickets/order/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  return readApiJson<BookTicketsResponse>(res, 'Failed to fetch order details');
}

export interface TicketHistoryItem {
  orderId: string;
  concertName: string;
  concertVenue: string;
  concertStartAt: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  payments: Array<{
    id: string;
    status: string;
    paymentGateway: string;
    amount: number;
    transactionId?: string | null;
  }>;
  tickets: Array<{
    id: string;
    qrCode: string;
    status: string;
    seatNumber: string | null;
    ticketType: string;
    price: number;
  }>;
}

export async function fetchTicketHistory(accessToken: string): Promise<TicketHistoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/tickets/history`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  return readApiJson<TicketHistoryItem[]>(res, 'Không thể tải lịch sử đơn hàng');
}

export interface InitiatePaymentResponse {
  paymentId: string;
  paymentUrl: string;
}

export async function initiatePayment(params: {
  orderId: string;
  gateway: 'vnpay' | 'momo';
  accessToken: string;
  idempotencyKey?: string;
}): Promise<InitiatePaymentResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.accessToken}`,
  };
  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey;
  }

  const res = await fetch(`${API_BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      orderId: params.orderId,
      gateway: params.gateway,
    }),
  });
  return readApiJson<InitiatePaymentResponse>(res, 'Failed to initiate payment');
}

