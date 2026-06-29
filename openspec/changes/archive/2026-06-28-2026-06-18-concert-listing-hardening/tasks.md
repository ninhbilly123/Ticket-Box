- [x] Inspect existing listing API
- [x] Inspect existing OpenSpec concert-listing
- [x] Create OpenSpec change for hardening
- [x] Add Redis cache-aside around existing listing logic
- [x] Add cache key builder
- [x] Track concert list cache keys in Redis Set
- [x] Add Redis safe fallback
- [x] Add Redis rate limit for GET /api/v1/concerts
- [x] Return 429 when limit exceeded
- [x] Add RabbitMQ invalidation consumer
- [x] Add reusable publisher for concert cache invalidation
- [x] Update .env.example
- [x] Add/adjust Swagger docs if project uses Swagger
- [x] Add tests/manual test notes

## Manual Test Notes

- `npm run build` passes.
- `npx prisma validate` passes.
- `npm run test:member-a` passes.
- Cache miss/hit verified with two `GET /api/v1/concerts` requests and Redis `concert:list:keys`.
- Rate limit verified with 121 requests from the same `X-Forwarded-For` IP; request 121 returns HTTP 429.
- RabbitMQ invalidation verified by publishing `concert.updated` to `ticketbox.events`; tracked `concert:list:*` keys are deleted.
- Redis fallback verified by stopping `ticketbox-redis`; `GET /api/v1/concerts` still returns HTTP 200 from PostgreSQL.
