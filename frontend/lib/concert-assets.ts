import type { Concert, TicketType } from './api';

export type TicketSaleState = 'upcoming' | 'on-sale' | 'low-stock' | 'sold-out';

export function getConcertImage(title: string): string {
  const normalized = title?.toLowerCase() || '';
  if (normalized.includes('sky tour')) return '/concert-4.png';
  if (normalized.includes('show cua den') || normalized.includes('show của đen') || normalized.includes('đen vâu') || normalized.includes('den vau')) return '/concert-5.png';
  if (normalized.includes('tri am') || normalized.includes('mỹ tâm') || normalized.includes('my tam')) return '/concert-6.png';
  if (normalized.includes('mtp special') || normalized.includes('special night')) return '/concert-7.png';
  return '/concert-4.png';
}

export function getTicketTotalRemaining(ticketTypes: TicketType[]) {
  return ticketTypes.reduce((sum, ticketType) => sum + ticketType.remaining, 0);
}

export function getMinimumTicketPrice(ticketTypes: TicketType[]) {
  if (!ticketTypes.length) return null;
  return Math.min(...ticketTypes.map((ticketType) => Number(ticketType.price)));
}

export function getTicketSaleState(concert: Pick<Concert, 'dateTime' | 'ticketTypes'>): TicketSaleState {
  const totalRemaining = getTicketTotalRemaining(concert.ticketTypes);
  if (totalRemaining <= 0) return 'sold-out';

  const eventTime = new Date(concert.dateTime).getTime();
  if (Number.isFinite(eventTime) && eventTime < Date.now()) return 'sold-out';

  const totalQuantity = concert.ticketTypes.reduce((sum, ticketType) => sum + ticketType.totalQuantity, 0);
  if (totalQuantity > 0 && totalRemaining / totalQuantity <= 0.15) return 'low-stock';

  return 'on-sale';
}

export function getTicketSaleLabel(state: TicketSaleState) {
  if (state === 'sold-out') return 'Hết vé';
  if (state === 'low-stock') return 'Sắp hết vé';
  if (state === 'upcoming') return 'Sắp mở bán';
  return 'Đang bán';
}

export function getTicketSaleClassName(state: TicketSaleState) {
  if (state === 'sold-out') return 'border-red-800/60 bg-red-950/40 text-red-200';
  if (state === 'low-stock') return 'border-amber-700/60 bg-amber-950/40 text-amber-200';
  if (state === 'upcoming') return 'border-sky-700/60 bg-sky-950/40 text-sky-200';
  return 'border-emerald-700/60 bg-emerald-950/40 text-emerald-200';
}
