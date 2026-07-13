'use client';

import { KeyboardEvent, MouseEvent, useEffect, useMemo, useRef } from 'react';
import { TicketType } from '../lib/api';

interface SeatMapProps {
  seatMapEnabled: boolean;
  seatMapSvg: string | null;
  ticketTypes: TicketType[];
  selectedTicketTypeId: string | null;
  onSelectTicketType: (id: string) => void;
}

function normalizeZoneCode(value: string) {
  return value.trim().toUpperCase();
}

export default function SeatMap({
  seatMapEnabled,
  seatMapSvg,
  ticketTypes,
  selectedTicketTypeId,
  onSelectTicketType,
}: SeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ticketTypeByZone = useMemo(
    () => new Map(ticketTypes.map((ticketType) => [normalizeZoneCode(ticketType.zoneCode), ticketType])),
    [ticketTypes]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll<SVGElement>('[data-zone-code]').forEach((zone) => {
      const zoneCode = normalizeZoneCode(zone.dataset.zoneCode || '');
      const ticketType = ticketTypeByZone.get(zoneCode);
      const soldOut = !ticketType || ticketType.remaining <= 0;
      const selected = ticketType?.id === selectedTicketTypeId;

      zone.dataset.zoneState = soldOut ? 'sold-out' : selected ? 'selected' : 'available';
      zone.setAttribute('role', 'button');
      zone.setAttribute('tabindex', soldOut ? '-1' : '0');
      zone.setAttribute('aria-disabled', String(soldOut));
      zone.setAttribute('aria-label', ticketType ? `${ticketType.name}, còn ${ticketType.remaining} vé` : `Khu vực ${zoneCode} không khả dụng`);
    });
  }, [selectedTicketTypeId, ticketTypeByZone, seatMapSvg]);

  if (!seatMapEnabled || !seatMapSvg?.trim().startsWith('<svg')) {
    return null;
  }

  function selectFromElement(element: Element | null) {
    const zone = element?.closest<SVGElement>('[data-zone-code]');
    if (!zone || !containerRef.current?.contains(zone)) return;
    const ticketType = ticketTypeByZone.get(normalizeZoneCode(zone.dataset.zoneCode || ''));
    if (ticketType && ticketType.remaining > 0) {
      onSelectTicketType(ticketType.id);
    }
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    selectFromElement(event.target as Element);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as Element;
    if (!target.closest('[data-zone-code]')) return;
    event.preventDefault();
    selectFromElement(target);
  }

  return (
    <section className="w-full rounded-lg border border-gray-800 bg-gray-900 p-4 shadow-xl sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-white">Sơ đồ khu vực</h2>
      <div
        className="seat-map-svg mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: seatMapSvg }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={containerRef}
      />
    </section>
  );
}
