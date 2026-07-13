# auth-rbac Specification

## Purpose
TBD - created by archiving change 2026-06-17-auth-rbac-admin. Update Purpose after archive.
## Requirements
### Requirement: User Authentication
The system SHALL allow users to register, login, logout, refresh tokens, and get the current authenticated profile.

#### Scenario: Successful login returns tokens and profile
- **WHEN** a user submits a valid email and password
- **THEN** the system SHALL return an access token, refresh token, and the user's profile.

#### Scenario: Invalid password is rejected
- **WHEN** a user submits an existing email with an invalid password
- **THEN** the system SHALL reject the request with `AUTH_INVALID_CREDENTIALS`.

#### Scenario: Disabled user cannot login
- **WHEN** a user with status `DISABLED` attempts to login
- **THEN** the system SHALL reject the request with `AUTH_INVALID_CREDENTIALS`.

#### Scenario: Logout revokes refresh token
- **WHEN** an authenticated user logs out with a refresh token
- **THEN** the system SHALL mark that refresh token as revoked.

---

### Requirement: Role-Based Access Control
The system SHALL restrict protected APIs based on the authenticated user's role.

#### Scenario: Audience cannot access admin APIs
- **WHEN** a user with role `AUDIENCE` calls an admin API
- **THEN** the system SHALL reject the request with `FORBIDDEN_ROLE`.

#### Scenario: Organizer can access organizer admin APIs
- **WHEN** a user with role `ORGANIZER` calls an organizer-scoped admin API
- **THEN** the system SHALL allow the request if the object-level authorization check also passes.

#### Scenario: Check-in staff cannot access organizer admin APIs
- **WHEN** a user with role `CHECKIN_STAFF` calls an organizer admin API
- **THEN** the system SHALL reject the request with `FORBIDDEN_ROLE`.

### Requirement: Object-Level Authorization
The system SHALL prevent users from accessing resources they do not own or are not assigned to.

#### Scenario: Organizer cannot update another organization's concert
- **WHEN** organizer A attempts to update a concert owned by organizer B's organization
- **THEN** the system SHALL reject the request with `FORBIDDEN_RESOURCE`.

#### Scenario: Audience cannot view another user's order
- **WHEN** audience A attempts to view an order owned by audience B
- **THEN** the system SHALL reject the request with `FORBIDDEN_RESOURCE`.

#### Scenario: Staff cannot scan unassigned concert or gate
- **WHEN** check-in staff attempts to scan a concert/gate without assignment
- **THEN** the system SHALL reject the request with `STAFF_NOT_ASSIGNED`.

