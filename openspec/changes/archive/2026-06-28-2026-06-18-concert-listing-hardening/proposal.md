## Why

The concert listing API already exists and is used by the public customer web app. During high-traffic periods, repeated listing requests can put unnecessary pressure on PostgreSQL because the same filtered list is requested many times.

This change hardens the existing listing flow without rebuilding the feature. It adds Redis cache-aside, Redis-backed request spam protection, RabbitMQ-driven cache invalidation, and safe fallback behavior when Redis or RabbitMQ is unavailable.

## What Changes

- Add Redis cache-aside for `GET /api/v1/concerts` responses using normalized query filters.
- Track concert-list cache keys in a Redis Set so all list variants can be invalidated together.
- Add Redis-backed rate limiting for the public concert listing endpoint.
- Add RabbitMQ publisher/consumer for concert-list cache invalidation events.
- Publish invalidation events after organizer/admin mutations that change concerts or ticket types.

## Non-Goals

- No CAPTCHA.
- No waiting room.
- No ticket reservation, payment, QR, check-in, AI, or CSV import changes.
- No schema changes for `Venue`, `bannerUrl`, or new concert listing fields.

## Impact

- **Backend (Express)**:
  - Extend the existing `concert` module with cache key, cache-aside, and invalidation helpers.
  - Add a listing-specific rate-limit middleware.
  - Add a RabbitMQ invalidation consumer worker.
  - Publish invalidation events from existing admin concert/ticket-type mutations.
- **Redis**:
  - Store listing cache entries and rate-limit counters.
- **RabbitMQ**:
  - Use topic exchange `ticketbox.events` and queue `concert-listing-cache-invalidation`.

