## Manual Test Notes

Date: 2026-06-19

Environment:

- Backend: `npm run dev` on port 3000
- PostgreSQL: Docker `ticketbox-postgres` on port 5433
- Redis: Docker `ticketbox-redis` on port 6379
- RabbitMQ: Docker `ticketbox-rabbitmq` on port 5672

Runtime config used:

```text
WAITING_ROOM_ENABLED_CONCERT_IDS=c7010842-0548-46b5-b791-75933948b7a3
WAITING_ROOM_RELEASE_PER_MINUTE=500
CHECKOUT_TOKEN_TTL_SECONDS=300
HOLD_ORDER_USER_RATE_LIMIT=5
HOLD_ORDER_IP_RATE_LIMIT=20
HOLD_ORDER_RATE_LIMIT_WINDOW_SECONDS=60
```

Verified:

- `POST /api/v1/concerts/:concertId/waiting-room/join` returns `WAITING` with position 1.
- `GET /api/v1/concerts/:concertId/waiting-room/status` returns `WAITING` before release.
- Hot-concert `POST /api/v1/orders/hold` without `Checkout-Token` returns 403 `NOT_YOUR_TURN`.
- Waiting-room release service issues checkout token and status returns `READY`.
- Hot-concert `POST /api/v1/orders/hold` with valid `Checkout-Token` returns 201 pending order.
- Non-hot concert hold does not require `Checkout-Token` and returns 201.
- Same-user hold spam returns 429 `TOO_MANY_REQUESTS` on request 6.
- Same-IP hold spam returns 429 `TOO_MANY_REQUESTS` on request 21.
- Test pending orders were cleaned up and inventory counters were restored.
- Redis test keys were removed after the test runs.

Automated checks:

```text
npm run build
git diff --check
```
