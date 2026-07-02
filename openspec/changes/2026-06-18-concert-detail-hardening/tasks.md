- [x] Inspect existing OpenSpec changes for concert-listing, seat-map, ticket-booking, and seat-reservation.
- [x] Inspect existing concert detail API and Prisma schema.
- [x] Create OpenSpec change for concert detail hardening.
- [x] Add Redis cache-aside for `GET /api/v1/concerts/:id`.
- [x] Add short-lived `GET /api/v1/concerts/:id/availability`.
- [x] Add Redis cache-aside for availability.
- [x] Add Redis safe fallback for detail and availability cache operations.
- [x] Add Redis IP rate limit for concert detail.
- [x] Add Redis IP rate limit for availability.
- [x] Return HTTP 429 with `TOO_MANY_REQUESTS` when limits are exceeded.
- [x] Restrict public detail and availability to `PUBLISHED` and `ON_SALE`.
- [x] Invalidate detail and availability cache when concert or ticket type events are consumed.
- [x] Update `.env.example`.
- [x] Update OpenAPI docs.
- [x] Add manual test notes after runtime verification.

## Manual Test Notes

- `npm run build` passes.
- `npx prisma validate` passes.
- Detail cache verified with two `GET /api/v1/concerts/:id` requests and Redis key `concert:detail:{concertId}` TTL `120`.
- Availability cache verified with `GET /api/v1/concerts/:id/availability` and Redis key `ticket:availability:{concertId}` TTL `5`.
- Detail rate limit verified with 121 requests from the same `X-Forwarded-For` IP; request 121 returns HTTP 429.
- Availability rate limit verified with 61 requests from the same `X-Forwarded-For` IP; request 61 returns HTTP 429.
- Public status guard verified by creating a temporary `DRAFT` concert; both detail and availability returned HTTP 404, then the test concert was deleted.
- Redis fallback verified by stopping `ticketbox-redis`; detail and availability still returned HTTP 200 from PostgreSQL.
- RabbitMQ invalidation verified by publishing `ticket-type.updated`; `concert:detail:{concertId}` and `ticket:availability:{concertId}` were deleted.
