const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: tự động lấy IP/hostname của máy tính chạy backend
    return `http://${window.location.hostname}:3000/api/v1`;
  }
  // Server-side (Next.js SSR/build)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export interface TicketType {
  id: string;
  name: string;
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
  seatMapUrl: string;
  ticketTypes: TicketType[];
}

async function readApiJson(res: Response, fallbackMessage: string) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const error = new Error(json.message || json.error?.message || fallbackMessage);
    (error as Error & { errorCode?: string }).errorCode = json.errorCode || json.error?.code;
    throw error;
  }
  return json;
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
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Failed to fetch concerts');
  }
  return json.data;
}

export async function fetchConcertById(id: string): Promise<Concert> {
  const res = await fetch(`${API_BASE_URL}/concerts/${id}`, {
    cache: 'no-store', // Always get fresh data
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Failed to fetch concert details');
  }
  return json.data;
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
  const json = await readApiJson(res, 'Đăng nhập thất bại');
  return json.data;
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
  const json = await readApiJson(res, 'Register failed');
  return json.data;
}

export async function refreshAuth(refreshToken: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await readApiJson(res, 'Session expired');
  return json.data;
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
  const json = await readApiJson(res, 'Cannot load profile');
  return json.data;
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
  const json = await readApiJson(res, 'Không thể tham gia hàng chờ');
  return json.data;
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
  const json = await readApiJson(res, 'Không thể kiểm tra hàng chờ');
  return json.data;
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
  idempotencyKey?: string;
}): Promise<HoldOrderResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.accessToken}`,
    'Idempotency-Key': params.idempotencyKey || `hold-${params.concertId}-${Date.now()}`,
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
  const json = await readApiJson(res, 'Giữ vé thất bại');
  return json.data;
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

export async function bookTickets(params: {
  userId: string;
  concertId: string;
  ticketTypeId: string;
  quantity: number;
}): Promise<BookTicketsResponse> {
  const res = await fetch(`${API_BASE_URL}/tickets/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Failed to book tickets');
  }
  return json.data;
}

export async function fetchOrderById(id: string): Promise<BookTicketsResponse> {
  const res = await fetch(`${API_BASE_URL}/tickets/order/${id}`, {
    cache: 'no-store',
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Failed to fetch order details');
  }
  return json.data;
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
  const json = await readApiJson(res, 'Không thể tải lịch sử đơn hàng');
  return json.data;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  paymentUrl: string;
}

export async function initiatePayment(params: {
  orderId: string;
  gateway: 'vnpay' | 'momo';
  idempotencyKey?: string;
}): Promise<InitiatePaymentResponse> {
  const headers: any = {
    'Content-Type': 'application/json',
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
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Failed to initiate payment');
  }
  return json.data;
}

