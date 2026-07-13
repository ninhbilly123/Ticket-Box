# admin-management Specification

## Purpose
TBD - created by archiving change 2026-06-17-auth-rbac-admin. Update Purpose after archive.
## Requirements
### Requirement: Concert Management
The system SHALL allow organizers to create, update, publish, and cancel concerts within their organization.

#### Scenario: Organizer creates draft concert
- **WHEN** an organizer creates a new concert
- **THEN** the system SHALL store it as `DRAFT` by default.

#### Scenario: Organizer publishes own concert
- **WHEN** an organizer publishes a concert owned by their organization
- **THEN** the system SHALL transition it from `DRAFT` to `PUBLISHED`.

#### Scenario: Organizer cannot update another organization's concert
- **WHEN** an organizer attempts to update a concert outside their organization
- **THEN** the system SHALL reject the request with `FORBIDDEN_RESOURCE`.

#### Scenario: Cancelled concert cannot be sold
- **WHEN** a concert is `CANCELLED`
- **THEN** the system SHALL block ticket sales for that concert.

---

### Requirement: Ticket Type Management
The system SHALL allow organizers to configure ticket types for their own concerts.

Required fields:
- `name`
- `price`
- `max_per_user`
- `sale_start_at`
- `sale_end_at`

#### Scenario: Sale start must be before sale end
- **WHEN** an organizer creates or updates a ticket type with `sale_start_at >= sale_end_at`
- **THEN** the system SHALL reject the request with `SALE_TIME_INVALID`.

#### Scenario: Max per user must be positive
- **WHEN** an organizer creates or updates a ticket type with `max_per_user <= 0`
- **THEN** the system SHALL reject the request with `TICKET_QUANTITY_INVALID`.

#### Scenario: Price must be non-negative
- **WHEN** an organizer creates or updates a ticket type with `price < 0`
- **THEN** the system SHALL reject the request with `TICKET_QUANTITY_INVALID`.

---

### Requirement: Inventory Management
The system SHALL allow organizers to update ticket inventory safely.

#### Scenario: Inventory cannot drop below sold plus reserved quantity
- **WHEN** `new_total_quantity < sold_quantity + reserved_quantity`
- **THEN** the system SHALL reject the update with `TICKET_QUANTITY_INVALID`.

#### Scenario: Valid inventory update recalculates available quantity
- **WHEN** `new_total_quantity >= sold_quantity + reserved_quantity`
- **THEN** the system SHALL update total quantity and recalculate available quantity.

---

### Requirement: Staff Assignment
The system SHALL allow organizers to assign `CHECKIN_STAFF` users to a concert and gate.

#### Scenario: Organizer creates check-in staff account
- **WHEN** an organizer creates a staff account with email, password, full name, and optional phone
- **THEN** the system SHALL store the user as `CHECKIN_STAFF` in the organizer's organization.

#### Scenario: Cannot assign non-staff user
- **WHEN** an organizer attempts to assign a user whose role is not `CHECKIN_STAFF`
- **THEN** the system SHALL reject the request with `FORBIDDEN_ROLE`.

#### Scenario: Cannot assign staff outside organization
- **WHEN** an organizer attempts to assign a staff user from another organization
- **THEN** the system SHALL reject the request with `FORBIDDEN_RESOURCE`.

#### Scenario: Staff can only scan assigned concert or gate
- **WHEN** a staff user scans a concert or gate without assignment
- **THEN** the system SHALL reject the request with `STAFF_NOT_ASSIGNED`.

---

### Requirement: Whitelist Email Config
The system SHALL allow organizers to configure allowed sender email and subject keyword for VIP CSV import.

#### Scenario: Organizer creates config for own organization or concert
- **WHEN** an organizer creates a whitelist config scoped to their organization or own concert
- **THEN** the system SHALL store the config as `ACTIVE` unless another status is supplied.

#### Scenario: Disabled config is ignored by CSV worker
- **WHEN** a whitelist config status is `DISABLED`
- **THEN** the internal active-config API SHALL not return it.

#### Scenario: Password or secret is not stored as plain text
- **WHEN** a whitelist config is created
- **THEN** the system SHALL store only mailbox address, allowed sender email, subject keyword, and status.

---

### Requirement: Revenue Dashboard
The system SHALL allow organizers to view sales and revenue summaries for their own concerts only.

#### Scenario: Organizer sees own concert revenue
- **WHEN** an organizer requests revenue for a concert in their organization
- **THEN** the system SHALL return total paid orders, tickets sold, and revenue.

#### Scenario: Organizer cannot see another organization's revenue
- **WHEN** an organizer requests revenue for another organization's concert
- **THEN** the system SHALL reject the request with `FORBIDDEN_RESOURCE`.

