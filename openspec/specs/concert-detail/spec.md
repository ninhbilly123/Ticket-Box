# concert-detail Specification

## Purpose
TBD - created by archiving change 2026-06-18-concert-detail-hardening. Update Purpose after archive.
## Requirements
### Requirement: Redis Detail Cache
The system SHALL cache public concert detail metadata in Redis.

#### Scenario: Detail cache miss queries PostgreSQL
- **WHEN** a public concert detail request has no `concert:detail:{concertId}` cache entry
- **THEN** the system SHALL query PostgreSQL using the existing concert detail logic
- **AND** store stable detail metadata in Redis with a TTL between 60 and 300 seconds.

#### Scenario: Detail cache hit returns cached metadata
- **WHEN** a public concert detail request has a matching `concert:detail:{concertId}` cache entry
- **THEN** the system SHALL use the cached metadata
- **AND** compose volatile ticket availability from the short-lived availability source.

#### Scenario: Redis failure falls back to PostgreSQL
- **WHEN** Redis detail cache operations fail
- **THEN** the system SHALL log a warning
- **AND** continue by querying PostgreSQL.

---

### Requirement: Separate Availability API
The system SHALL expose display-only ticket availability separately from stable concert detail metadata.

#### Scenario: Availability is requested
- **WHEN** a client requests `GET /api/v1/concerts/:id/availability`
- **THEN** the system SHALL return remaining ticket counts by ticket type.

#### Scenario: Availability cache is short-lived
- **WHEN** availability is read or written
- **THEN** the system SHALL use `ticket:availability:{concertId}` with a TTL between 3 and 5 seconds.

#### Scenario: Availability is display-only
- **WHEN** availability is shown on the detail page
- **THEN** the system SHALL treat it as informational only
- **AND** the hold/order API SHALL re-check PostgreSQL inside a transaction before holding tickets.

---

### Requirement: Public Detail Rate Limit
The system SHALL protect public concert detail and availability APIs from excessive repeated requests.

#### Scenario: Detail limit exceeded
- **WHEN** an IP sends more than 120 requests per minute to `GET /api/v1/concerts/:id`
- **THEN** the system SHALL return HTTP 429 with error code `TOO_MANY_REQUESTS`.

#### Scenario: Availability limit exceeded
- **WHEN** an IP sends more than 60 requests per minute to `GET /api/v1/concerts/:id/availability`
- **THEN** the system SHALL return HTTP 429 with error code `TOO_MANY_REQUESTS`.

#### Scenario: Rate-limit counters are Redis-backed
- **WHEN** detail or availability requests are counted
- **THEN** the system SHALL store counters in Redis with a 60 second TTL.

---

### Requirement: Public Status Guard
The system SHALL only expose public concert detail for public concerts.

#### Scenario: Published or on-sale concert is requested
- **WHEN** a concert has status `PUBLISHED` or `ON_SALE`
- **THEN** public detail and availability endpoints MAY return that concert.

#### Scenario: Draft or cancelled concert is requested
- **WHEN** a concert has status `DRAFT`, `CANCELLED`, or any other non-public status
- **THEN** public detail and availability endpoints SHALL return 404.

---

### Requirement: Display Fields Are Not Enforcement
The system SHALL distinguish display data from purchase enforcement.

#### Scenario: Sale constraints are shown
- **WHEN** detail includes sale time, max-per-account, or availability values
- **THEN** those values SHALL be considered display data for the detail page
- **AND** final enforcement SHALL happen in the ticket hold/order API.

