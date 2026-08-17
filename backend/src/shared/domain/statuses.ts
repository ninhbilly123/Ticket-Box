import type { ConcertStatus, OrderStatus, TicketStatus } from '@prisma/client';

export const PUBLIC_CONCERT_STATUSES: ConcertStatus[] = ['PUBLISHED', 'ON_SALE'];
export const PUBLIC_CONCERT_STATUSES_WITH_LEGACY: ConcertStatus[] = ['PUBLISHED', 'ON_SALE', 'published'];

export const PENDING_ORDER_STATUSES: OrderStatus[] = ['pending', 'PENDING'];
export const PAID_ORDER_STATUSES: OrderStatus[] = ['paid', 'PAID'];

export const VALID_TICKET_STATUS: TicketStatus = 'valid';
export const USED_TICKET_STATUS: TicketStatus = 'used';
export const CANCELLED_TICKET_STATUS: TicketStatus = 'cancelled';
