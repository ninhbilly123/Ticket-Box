## Context

The hold-order flow already exists at `POST /api/v1/orders/hold`. This change adds protection before that flow reaches the database transaction:

```text
JWT auth
-> Redis hold-order rate limit
-> waiting room checkout token check for hot concerts
-> idempotency check
-> PostgreSQL hold transaction
```

## Decisions

### 1. Hold Rate Limit

The hold API is protected by Redis fixed-window counters:

```text
rate_limit:user:{userId}:hold-order
rate_limit:ip:{ip}:hold-order
```

Defaults:

- `HOLD_ORDER_USER_RATE_LIMIT=5`
- `HOLD_ORDER_IP_RATE_LIMIT=20`
- `HOLD_ORDER_RATE_LIMIT_WINDOW_SECONDS=60`

Both counters are checked before the hold transaction starts. If Redis is unavailable, the request is allowed to continue and the system logs a warning, matching the current public-read safe fallback policy.

### 2. Waiting Room Storage

Waiting room uses Redis, not RabbitMQ:

```text
waiting:{concertId}:queue
checkout_token:{concertId}:{userId}
```

The queue is a Redis Sorted Set where:

- member: `userId`
- score: first join timestamp

Queue position is computed from `ZRANK + 1`.

### 3. Hot Concert Configuration

No schema field currently marks a concert as hot, so this change uses:

```text
WAITING_ROOM_ENABLED_CONCERT_IDS=uuid1,uuid2
```

If a concert is not listed, `/orders/hold` does not require a checkout token.

### 4. Checkout Tokens

When users are released, the worker writes:

```text
checkout_token:{concertId}:{userId} = token
```

with TTL:

```text
CHECKOUT_TOKEN_TTL_SECONDS=300
```

The token is generated with `crypto.randomUUID()`.

### 5. Release Worker

`waiting-room.worker.ts` runs every 60 seconds. For each configured hot concert, it releases up to:

```text
WAITING_ROOM_RELEASE_PER_MINUTE=500
```

users from the sorted set. It issues checkout tokens and removes released users from the queue.

### 6. Hold Token Check

For hot concerts only, `POST /api/v1/orders/hold` must include:

```text
Checkout-Token: <token>
```

If the Redis token is missing, the API returns `CHECKOUT_TOKEN_EXPIRED`. If a token exists but does not match, it returns `NOT_YOUR_TURN`.

This check happens after rate limiting and before idempotency/transaction logic.

## Assumptions

- Waiting room enablement is temporary env configuration because the current schema has no `waitingRoomEnabled` or `isHot` field.
- RabbitMQ remains for delayed/background jobs such as order expiration and email; it is not used for waiting room queueing.
- Payment, QR, e-ticket, and notification flows remain out of scope.
