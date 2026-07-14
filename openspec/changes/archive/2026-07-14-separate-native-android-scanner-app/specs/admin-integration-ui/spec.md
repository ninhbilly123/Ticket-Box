## MODIFIED Requirements

### Requirement: Admin Integration Management UI
Admin frontend SHALL provide organizer-facing management pages for integrations and operations, while operational scanning at the gate SHALL be handled by Android Scanner App.

#### Scenario: Organizer manages check-in operation
- **WHEN** organizer opens admin frontend
- **THEN** admin frontend SHALL provide management/reporting views for check-in operation
- **AND** admin frontend MAY provide staff assignment, scan history and APK installation guidance
- **AND** admin frontend SHALL not be the primary camera scanning client for gate staff.

#### Scenario: Staff opens admin frontend
- **WHEN** user with role `CHECKIN_STAFF` opens admin frontend
- **THEN** admin frontend SHALL guide the user to use Android Scanner App for gate scanning
- **AND** admin frontend SHALL not expose organizer-only management actions.
