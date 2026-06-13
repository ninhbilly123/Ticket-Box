const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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
  description: string | null;
  artist: string;
  dateTime: string;
  location: string;
  seatMapUrl: string;
  ticketTypes: TicketType[];
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

export interface BookTicketsResponse {
  order: {
    id: string;
    userId: string;
    concertId: string;
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    createdAt: string;
  };
  tickets: Array<{
    id: string;
    orderId: string;
    ticketTypeId: string;
    seatNumber: string | null;
    status: 'RESERVED' | 'BOOKED' | 'REFUNDED';
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
  return {
    order: json.data,
    tickets: json.data.tickets,
  };
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
