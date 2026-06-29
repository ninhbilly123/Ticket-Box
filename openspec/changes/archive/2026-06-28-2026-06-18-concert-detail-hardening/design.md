## Context

The frontend route `/concert/[id]` calls the real backend API `GET /api/v1/concerts/:id`. The backend already queries PostgreSQL through Prisma using the current schema:

- `Concert.venue` is a string.
- `Concert.status`, `Concert.saleOpenAt`, and `Concert.svgSeatingMap` are on `Concert`.
- `TicketType.price`, `TicketType.maxPerAccount`, `TicketType.saleOpenAt`, `TicketType.saleCloseAt`, and `TicketType.status` are on `TicketType`.
- `TicketInventory.availableQuantity`, `reservedQuantity`, and `soldQuantity` are available for inventory display.

## Decisions

### 1. Detail Cache

Stable concert detail metadata uses Redis cache-aside:

```text
concert:detail:{concertId}
```

TTL is controlled by `CONCERT_DETAIL_CACHE_TTL` and bounded to 60-300 seconds. The cached detail payload excludes volatile `remaining` counts. The public response keeps backward-compatible `remaining` values by composing detail metadata with the short-lived availability cache.

### 2. Availability Cache

Ticket availability has its own endpoint:

```text
GET /api/v1/concerts/:id/availability
```

The endpoint returns remaining ticket counts by ticket type and uses:

```text
ticket:availability:{concertId}
```

TTL is controlled by `CONCERT_AVAILABILITY_CACHE_TTL` and bounded to 3-5 seconds.

Availability cache is display-only. When a user actually holds or buys tickets, the backend must re-check PostgreSQL inside the hold/order transaction.

### 3. Rate Limit

Redis-backed fixed-window IP counters protect hot public endpoints:

```text
rate_limit:ip:{ip}:concert-detail:{concertId}
rate_limit:ip:{ip}:concert-availability:{concertId}
```

Defaults:

- Detail: 120 requests/IP/minute.
- Availability: 60 requests/IP/minute.

If Redis is unavailable, the public request continues and the system logs a warning.

### 4. Public Status Guard

Public detail and availability queries use `findFirst` with:

```text
status IN (PUBLISHED, ON_SALE)
```

Draft, cancelled, and other non-public concerts return 404.

### 5. Invalidation

The existing concert invalidation events also clear:

```text
concert:detail:{concertId}
ticket:availability:{concertId}
```

This happens for concert changes and ticket type changes because ticket type metadata and availability can both affect the detail page.

## Assumptions

- `saleOpenAt`, `saleCloseAt`, and `maxPerAccount` are displayed in detail but are not security enforcement.
- Final sale-window, max-per-account, and inventory enforcement belongs to the ticket hold/order API, not this display endpoint.
- CAPTCHA and waiting room are intentionally excluded from this task.
