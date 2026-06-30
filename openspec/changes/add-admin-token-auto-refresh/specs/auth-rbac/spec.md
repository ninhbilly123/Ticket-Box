## ADDED Requirements

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
