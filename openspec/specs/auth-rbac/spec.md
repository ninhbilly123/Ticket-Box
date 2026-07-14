# auth-rbac Specification

## Purpose
Quy định cơ chế xác thực người dùng (Authentication), phân quyền theo vai trò (Role-Based Access Control - RBAC) và phân quyền ở mức dữ liệu (Object-Level Authorization) trong hệ thống TicketBox.

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

### Requirement: Admin Session Auto Refresh
Admin frontend SHALL automatically refresh an expired access token when a valid refresh token is available.

#### Scenario: Admin API request receives expired access token
- **WHEN** admin frontend calls a protected API with an expired access token
- **AND** the stored refresh token is still valid
- **THEN** admin frontend SHALL call the refresh endpoint
- **AND** admin frontend SHALL persist the new access token and refresh token
- **AND** admin frontend SHALL retry the original API request once.

#### Scenario: Refresh token is invalid or expired
- **WHEN** admin frontend attempts to refresh the session
- **AND** the backend rejects the refresh token
- **THEN** admin frontend SHALL clear the stored session
- **AND** admin frontend SHALL return to the login state.

#### Scenario: Multiple requests expire at the same time
- **WHEN** multiple admin API requests receive `AUTH_TOKEN_EXPIRED` concurrently
- **THEN** admin frontend SHALL perform at most one refresh request at a time
- **AND** pending requests SHALL reuse the refreshed session before retrying.

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

#### Scenario: Check-in staff can use scanner APIs
- **WHEN** a user with role `CHECKIN_STAFF` calls scanner/check-in APIs
- **THEN** the system SHALL allow the request if object-level assignment checks also pass.

#### Scenario: Organizer cannot use Scanner App as staff
- **WHEN** a user with role `ORGANIZER` logs into Scanner App
- **THEN** the app SHALL reject scanner access
- **AND** the backend SHALL reject check-in scan APIs that require `CHECKIN_STAFF`.

---

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

#### Scenario: Organizer thao tác AI Bio của concert ngoài tổ chức
- **WHEN** organizer gửi request AI Bio cho concert không thuộc tổ chức hoặc không do họ quản lý
- **THEN** hệ thống SHALL trả `403 FORBIDDEN_RESOURCE`.

#### Scenario: Organizer xem báo cáo VIP Sync ngoài tổ chức
- **WHEN** organizer yêu cầu import report không thuộc organization của mình
- **THEN** hệ thống SHALL trả `403 FORBIDDEN_RESOURCE`.

#### Scenario: Staff can only see assigned concerts in Scanner App
- **WHEN** check-in staff requests assigned concerts for Scanner App
- **THEN** the system SHALL return only concerts and gates assigned to that staff user.

#### Scenario: Staff cannot sync offline logs for unassigned concert
- **WHEN** check-in staff submits offline logs for a concert/gate without assignment
- **THEN** the system SHALL reject the sync request
- **AND** no check-in state SHALL be changed.
