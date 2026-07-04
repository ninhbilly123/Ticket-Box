## ADDED Requirements

### Requirement: Stable Hold Idempotency Key
Customer frontend SHALL reuse one idempotency key for repeated submissions of the same hold-order attempt.

#### Scenario: User double-clicks hold order button
- **WHEN** the user submits the same hold-order form twice before the first response completes
- **THEN** both requests SHALL carry the same `Idempotency-Key`
- **AND** backend idempotency SHALL treat them as the same operation.

#### Scenario: User changes selected ticket type or quantity
- **WHEN** the user changes ticket type or quantity
- **THEN** customer frontend SHALL reset the hold-order idempotency key
- **AND** the next submit SHALL represent a new checkout attempt.
