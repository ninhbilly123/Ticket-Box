# hold-order-protection Specification

## Purpose
TBD - created by archiving change 2026-06-18-hold-order-protection. Update Purpose after archive.
## Requirements
### Requirement: Rate Limit Hold Order API
The system SHALL limit `POST /api/v1/orders/hold` before idempotency lookup and before opening the PostgreSQL transaction.

The Redis keys SHALL be:

```text
rate_limit:user:{userId}:hold-order
rate_limit:ip:{ip}:hold-order
```

Default limits SHALL be:

```text
HOLD_ORDER_USER_RATE_LIMIT=5
HOLD_ORDER_IP_RATE_LIMIT=20
HOLD_ORDER_RATE_LIMIT_WINDOW_SECONDS=60
```

#### Scenario: User exceeds hold limit
- **GIVEN** a user sends more than the allowed number of hold order requests in one minute
- **WHEN** the user calls `POST /api/v1/orders/hold`
- **THEN** the system SHALL reject the request with HTTP 429 and error code `TOO_MANY_REQUESTS`.

#### Scenario: IP exceeds hold limit
- **GIVEN** an IP sends more than the allowed number of hold order requests in one minute
- **WHEN** any authenticated user from that IP calls `POST /api/v1/orders/hold`
- **THEN** the system SHALL reject the request with HTTP 429 and error code `TOO_MANY_REQUESTS`.

#### Scenario: Redis unavailable for rate limit
- **GIVEN** Redis is temporarily unavailable
- **WHEN** an authenticated user calls `POST /api/v1/orders/hold`
- **THEN** the system SHALL log a warning
- **AND** continue to the existing hold-order flow.

---

### Requirement: Join Waiting Room
The system SHALL allow authenticated users to join a waiting room for hot concerts.

The waiting room key SHALL be:

```text
waiting:{concertId}:queue
```

#### Scenario: User joins a hot concert queue
- **GIVEN** a concert has waiting room enabled
- **WHEN** a user joins the waiting room
- **THEN** the system SHALL store the user in a Redis Sorted Set
- **AND** return the user's queue position.

#### Scenario: User checks waiting room status
- **GIVEN** a user is in the waiting room
- **WHEN** the user calls `GET /api/v1/concerts/:concertId/waiting-room/status`
- **THEN** the system SHALL return `WAITING` with the current queue position.

---

### Requirement: Release Users From Waiting Room
The system SHALL release a limited number of users from the waiting room per minute.

The checkout token key SHALL be:

```text
checkout_token:{concertId}:{userId}
```

Checkout tokens SHALL use `CHECKOUT_TOKEN_TTL_SECONDS`, defaulting to 300 seconds.

#### Scenario: Release worker runs
- **GIVEN** users are waiting in the queue
- **WHEN** the release worker runs
- **THEN** the system SHALL issue checkout tokens to the first N users
- **AND** remove those users from the queue.

---

### Requirement: Require Checkout Token For Hot Concert
The system SHALL require a valid checkout token before allowing hold order for hot concerts.

Hot concerts SHALL be configured with `WAITING_ROOM_ENABLED_CONCERT_IDS` until the database schema has a dedicated field.

#### Scenario: Hot concert hold without valid token
- **GIVEN** a concert has waiting room enabled
- **WHEN** a user calls `POST /api/v1/orders/hold` without a valid `Checkout-Token`
- **THEN** the system SHALL reject the request with HTTP 403 and error code `NOT_YOUR_TURN`.

#### Scenario: Non-hot concert hold
- **GIVEN** a concert does not have waiting room enabled
- **WHEN** a user calls `POST /api/v1/orders/hold` without `Checkout-Token`
- **THEN** the system SHALL continue to the existing hold order flow.

---

### Requirement: Allow Hold Order With Valid Checkout Token
The system SHALL allow hold order request when the user has a valid checkout token.

#### Scenario: Hot concert hold with valid token
- **GIVEN** a user has a valid checkout token
- **WHEN** the user calls `POST /api/v1/orders/hold`
- **THEN** the system SHALL continue to the existing hold order flow.

### Requirement: Keep Waiting Room Out Of RabbitMQ
The system SHALL NOT use RabbitMQ for waiting room queueing or checkout-token release.

#### Scenario: Waiting room release
- **GIVEN** users are waiting for a hot concert
- **WHEN** the system releases users
- **THEN** it SHALL read and update Redis waiting-room keys directly.

