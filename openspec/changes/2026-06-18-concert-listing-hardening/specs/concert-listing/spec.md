## ADDED Requirements

### Requirement: Redis Cache
The system SHALL cache concert listing responses in Redis.

#### Scenario: Cache miss queries PostgreSQL
- **WHEN** a public concert listing request has no matching `concert:list:{queryHash}` cache entry
- **THEN** the system SHALL query PostgreSQL using the existing listing logic
- **AND** store the response in Redis with `CONCERT_LIST_CACHE_TTL`.

#### Scenario: Cache hit returns cached listing
- **WHEN** a public concert listing request has a matching cache entry
- **THEN** the system SHALL return the cached response without querying PostgreSQL for the listing.

---

### Requirement: Request Spam Protection
The system SHALL protect the public concert listing API from excessive repeated requests.

#### Scenario: IP limit exceeded
- **WHEN** an unauthenticated IP sends more requests than `CONCERT_LIST_RATE_LIMIT_PER_MINUTE` within 60 seconds
- **THEN** the system SHALL return HTTP 429 with error code `TOO_MANY_REQUESTS`.

#### Scenario: Counters are Redis-backed
- **WHEN** a request is counted for rate limiting
- **THEN** the system SHALL store the counter in Redis with a 60 second TTL.

---

### Requirement: RabbitMQ Cache Invalidation
The system SHALL invalidate concert listing cache when concert-related data changes.

#### Scenario: Concert event invalidates listing cache
- **WHEN** a `concert.updated` event is received
- **THEN** the system SHALL delete all tracked `concert:list:*` cache keys.

#### Scenario: Ticket type event invalidates listing cache
- **WHEN** a `ticket-type.updated` event is received
- **THEN** the system SHALL delete all tracked `concert:list:*` cache keys because minPrice, visible ticket types, or remaining counts may change.

---

### Requirement: Safe Fallback
The system SHALL not fail public concert listing when Redis is unavailable.

#### Scenario: Redis failure falls back to PostgreSQL
- **WHEN** Redis cache or rate-limit operations fail during a public listing request
- **THEN** the system SHALL log a warning
- **AND** continue the request using the existing PostgreSQL listing logic.

