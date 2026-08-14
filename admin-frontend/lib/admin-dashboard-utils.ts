import {
  Activity,
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarClock,
  ClipboardList,
  RefreshCw,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Concert, StaffAssignment, TicketType } from './api';

export type TabKey = 'overview' | 'concerts' | 'tickets' | 'staff' | 'checkin' | 'sponsors' | 'ai-bio' | 'vip-sync' | 'revenue';
export type RevenueTicketTypeRow = { name: string; quantity: number; revenue: number };

export const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { key: 'concerts', label: 'Sự kiện', icon: CalendarClock },
  { key: 'tickets', label: 'Loại vé', icon: Ticket },
  { key: 'staff', label: 'Nhân viên', icon: Users },
  { key: 'checkin', label: 'Check-in', icon: Activity },
  { key: 'sponsors', label: 'Email nhãn hàng', icon: Building2 },
  { key: 'ai-bio', label: 'Tiểu sử nghệ sĩ AI', icon: BrainCircuit },
  { key: 'vip-sync', label: 'Đồng bộ khách VIP', icon: RefreshCw },
  { key: 'revenue', label: 'Doanh thu', icon: ClipboardList },
];

export const emptyConcertForm = {
  eventCode: '',
  name: '',
  venue: '',
  startAt: '',
  saleOpenAt: '',
  artistName: '',
  description: '',
  seatMapEnabled: false,
  organizationId: '',
};

export const emptyTicketTypeForm = {
  name: 'VIP',
  zoneCode: 'VIP',
  price: '1000000',
  totalQuantity: '100',
  maxPerAccount: '4',
  saleOpenAt: '',
  saleCloseAt: '',
  status: 'ACTIVE',
};

export const emptyStaffUserForm = {
  email: '',
  fullName: '',
  phone: '',
  password: 'Password123!',
};

export const CONCERT_PAGE_SIZE = 8;
export const TICKET_PAGE_SIZE = 8;
export const STAFF_PAGE_SIZE = 8;
export const REVENUE_PAGE_SIZE = 8;

export function activeTitle(tab: TabKey) {
  return tabs.find((item) => item.key === tab)?.label || 'Bảng điều khiển';
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định.';
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

export function toDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('vi-VN');
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (Math.max(1, page) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function compareConcerts(left: Concert, right: Concert, sort: string) {
  if (sort === 'name-asc') return left.name.localeCompare(right.name, 'vi');
  if (sort === 'name-desc') return right.name.localeCompare(left.name, 'vi');
  const leftTime = new Date(left.startAt).getTime();
  const rightTime = new Date(right.startAt).getTime();
  return sort === 'startAt-desc' ? rightTime - leftTime : leftTime - rightTime;
}

function getTicketRemaining(ticketType: TicketType) {
  return ticketType.inventory?.availableQuantity ?? Math.max(0, ticketType.totalQuantity - ticketType.reservedQuantity - ticketType.soldQuantity);
}

export function compareTicketTypes(left: TicketType, right: TicketType, sort: string) {
  if (sort === 'name-asc') return left.name.localeCompare(right.name, 'vi');
  if (sort === 'price-asc') return Number(left.price) - Number(right.price);
  if (sort === 'remaining-desc') return getTicketRemaining(right) - getTicketRemaining(left);
  return Number(right.price) - Number(left.price);
}

export function compareStaffAssignments(left: StaffAssignment, right: StaffAssignment, sort: string) {
  if (sort === 'name-asc') {
    return (left.staff?.fullName || left.staffId).localeCompare(right.staff?.fullName || right.staffId, 'vi');
  }
  if (sort === 'gate-asc') return left.gateId.localeCompare(right.gateId, 'vi');
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  return sort === 'createdAt-asc' ? leftTime - rightTime : rightTime - leftTime;
}

export function compareRevenueRows(left: RevenueTicketTypeRow, right: RevenueTicketTypeRow, sort: string) {
  if (sort === 'name-asc') return left.name.localeCompare(right.name, 'vi');
  if (sort === 'revenue-asc') return left.revenue - right.revenue;
  if (sort === 'quantity-desc') return right.quantity - left.quantity;
  if (sort === 'quantity-asc') return left.quantity - right.quantity;
  return right.revenue - left.revenue;
}
