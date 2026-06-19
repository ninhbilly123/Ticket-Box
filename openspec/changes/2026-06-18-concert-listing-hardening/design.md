## Context

`GET /api/v1/concerts` already supports public listing with filters for search, artist, date, and location. The implementation reads from PostgreSQL and also computes per-ticket-type remaining quantities. This change keeps the response shape and current database schema unchanged.

## Decisions

### 1. Cache Key

Cache keys use a hash of normalized existing query filters:

```text
concert:list:{queryHash}
```

The normalized query currently includes:

```json
{
  "search": "",
  "artist": "",
  "date": "",
  "location": ""
}
```

The project does not currently support public listing `page`, `limit`, `status`, `fromDate`, or `toDate`, so those are not added in this hardening change.

### 2. Cache Storage

Listing responses are cached in Redis with:

```text
CONCERT_LIST_CACHE_TTL=60
```

Each cache key is tracked in:

```text
concert:list:keys
```

Invalidation deletes all tracked keys and then deletes the set.

### 3. Safe Fallback

Redis failures never fail the public listing API. If Redis is unavailable or a cache operation throws, the service logs a warning and falls back to the existing PostgreSQL listing logic.
Redis operations use a short timeout controlled by `REDIS_OPERATION_TIMEOUT_MS` so a disconnected Redis server cannot stall the public API.

RabbitMQ publish/consume failures are also non-blocking. Admin mutations still succeed even if an invalidation event cannot be published.

### 4. Rate Limit

The listing endpoint applies Redis-backed fixed-window counters:

```text
rate_limit:ip:{ip}:concert-list
rate_limit:user:{userId}:concert-list
```

Unauthenticated requests use the IP key with `CONCERT_LIST_RATE_LIMIT_PER_MINUTE` (default 120). Authenticated requests use the user key with `CONCERT_LIST_RATE_LIMIT_PER_USER_PER_MINUTE` (default 300). The endpoint remains public; optional auth is only used to identify logged-in users for the higher user limit.

If Redis is unavailable, rate-limit checks log a warning and allow the request to continue.

### 5. RabbitMQ Invalidation

RabbitMQ uses:

```text
Exchange: ticketbox.events
Queue: concert-listing-cache-invalidation
Routing keys:
- concert.created
- concert.updated
- concert.published
- concert.cancelled
- ticket-type.updated
```

`ticket-type.updated` is used for create/update/delete/inventory changes because each can affect listing fields such as minimum price, ticket types, or remaining counts.

## Assumptions

- The existing public listing query parameters remain `search`, `artist`, `date`, and `location`.
- Listing cache may include remaining ticket counts for up to `CONCERT_LIST_CACHE_TTL` seconds unless invalidated by an admin-side event.
- Booking/payment invalidation is intentionally not included in this task because the request explicitly excludes reservation/payment work.
