# hold-order Specification

## Purpose
TBD - created by archiving change 2026-06-18-hold-order-expiration. Update Purpose after archive.
## Requirements
### Requirement: Hold Tickets and Create Pending Order
The system SHALL allow an authenticated audience user to hold selected tickets and create a pending order.

#### Scenario: Valid hold request creates pending order
- **GIVEN** a user selects a valid ticket type and quantity
- **WHEN** the user calls `POST /api/v1/orders/hold`
- **THEN** the system SHALL reduce `availableQuantity`
- **AND** increase `reservedQuantity`
- **AND** create an `Order` with status `pending`
- **AND** create corresponding `OrderItem` records.

---

### Requirement: Prevent Oversell
The system SHALL prevent selling more tickets than available.

#### Scenario: Concurrent holds contend for the last ticket
- **GIVEN** only 1 ticket remains
- **WHEN** 2 users attempt to hold it concurrently
- **THEN** only one request SHALL succeed.

---

### Requirement: Enforce Max Tickets Per Account
The system SHALL enforce `TicketType.maxPerAccount`.

#### Scenario: User already reached limit
- **GIVEN** `maxPerAccount` is 2
- **WHEN** a user already has 2 paid or active pending tickets for the same concert and ticket type
- **THEN** holding more tickets SHALL be rejected.

---

### Requirement: Idempotent Hold Order
The system SHALL not create duplicate orders for repeated requests with the same `Idempotency-Key`.

#### Scenario: Duplicate key is sent twice
- **GIVEN** a user sends the same `Idempotency-Key` twice
- **WHEN** the first request already created a pending order
- **THEN** the second request SHALL return the same order response
- **AND** SHALL NOT hold more tickets.

---

### Requirement: Expire Unpaid Pending Order
The system SHALL expire unpaid pending orders after 10 minutes.

#### Scenario: Pending order is expired
- **GIVEN** `order.status` is `pending`
- **AND** `order.createdAt` is older than 10 minutes
- **WHEN** the expire worker processes the job
- **THEN** the system SHALL set `order.status` to `expired`
- **AND** return reserved tickets to inventory.

---

### Requirement: Do Not Expire Paid Order
The system SHALL not expire an order that has already been paid.

#### Scenario: Paid order receives expire job
- **GIVEN** `order.status` is `paid`
- **WHEN** the expire worker processes the expire job
- **THEN** the system SHALL skip the order
- **AND** SHALL NOT update inventory.

