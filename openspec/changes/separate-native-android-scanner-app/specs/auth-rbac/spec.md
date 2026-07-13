## MODIFIED Requirements

### Requirement: Role-Based Access Control
The system SHALL restrict protected APIs based on the authenticated user's role.

#### Scenario: Check-in staff can use scanner APIs
- **WHEN** a user with role `CHECKIN_STAFF` calls scanner/check-in APIs
- **THEN** the system SHALL allow the request if object-level assignment checks also pass.

#### Scenario: Organizer cannot use Scanner App as staff
- **WHEN** a user with role `ORGANIZER` logs into Scanner App
- **THEN** the app SHALL reject scanner access
- **AND** the backend SHALL reject check-in scan APIs that require `CHECKIN_STAFF`.

### Requirement: Object-Level Authorization
The system SHALL prevent users from accessing resources they do not own or are not assigned to.

#### Scenario: Staff can only see assigned concerts in Scanner App
- **WHEN** check-in staff requests assigned concerts for Scanner App
- **THEN** the system SHALL return only concerts and gates assigned to that staff user.

#### Scenario: Staff cannot sync offline logs for unassigned concert
- **WHEN** check-in staff submits offline logs for a concert/gate without assignment
- **THEN** the system SHALL reject the sync request
- **AND** no check-in state SHALL be changed.
