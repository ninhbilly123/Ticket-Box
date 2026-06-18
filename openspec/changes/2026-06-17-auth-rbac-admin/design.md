## Context

Member A owns account security and organizer administration for TicketBox. This change adds the backend foundation that other modules can depend on without implementing their core business flows.

## Goals / Non-Goals

**Goals:**
- Implement JWT-based authentication and refresh-token revocation.
- Enforce RBAC for admin and protected APIs.
- Enforce object-level authorization for concerts, organizations, orders, tickets, and check-in assignments.
- Provide admin APIs for concerts, ticket types, inventory, staff assignments, whitelist email config, revenue, and users.
- Seed demo accounts with hashed passwords.

**Non-Goals:**
- Do not implement payment gateway core logic.
- Do not implement offline check-in internals beyond assignment authorization helpers.
- Do not implement AI Artist Bio or CSV import workers.
- Do not build a full admin frontend in this change.

## Decisions

### 1. Module Layout

The project currently uses Express modules under `backend/src/modules`. This change adds:

```text
backend/src/modules/auth/
backend/src/modules/admin/
backend/src/modules/rbac/
backend/src/shared/middleware/auth.ts
backend/src/shared/middleware/roles.ts
backend/src/shared/types/auth.ts
```

Existing `concert`, `ticket`, `payment`, and `checkin` modules remain in place. Admin APIs reuse the existing Prisma models instead of creating duplicate concert or ticket-type modules.

### 2. Role Model

Roles are stored as uppercase strings:

- `AUDIENCE`
- `ORGANIZER`
- `CHECKIN_STAFF`
- `ADMIN`

Legacy lowercase roles from earlier seed data are treated as aliases during auth checks, but new seed data and admin writes use uppercase roles.

### 3. Database Model Extensions

The change adds or extends these models:

- `User`: add `organization_id`, `status`, and `updated_at`.
- `Organization`: organizer ownership boundary.
- `RefreshToken`: hashed refresh token with expiry and revocation.
- `Concert`: add `organization_id`, cancellation fields, and `updated_at`.
- `TicketType`: add `status`, `sold_quantity`, and `reserved_quantity`.
- `TicketInventory`: explicit inventory counters per ticket type.
- `StaffAssignment`: assign check-in staff to concert/gate.
- `WhitelistEmailConfig`: allowed mailbox/sender/subject config for VIP CSV import.
- `AuditLog`: append-only admin/security audit trail.

### 4. Object-Level Authorization

`AuthorizationService` exposes:

- `canManageConcert(user, concertId)`
- `canViewOrder(user, orderId)`
- `canViewTicket(user, ticketId)`
- `canScanConcert(user, concertId, gateId?)`
- `canManageOrganization(user, organizationId)`

Role checks alone are not enough. Organizer access is scoped to the user's organization. Audience access is scoped to owned orders/tickets. Staff access is scoped to `staff_assignments`.

### 5. Concert Lifecycle

Supported statuses:

- `DRAFT`
- `PUBLISHED`
- `ON_SALE`
- `SALE_CLOSED`
- `COMPLETED`
- `CANCELLED`

Rules:

- `DRAFT`: organizer can edit; audience cannot see it.
- `PUBLISHED`: audience can see it; purchase still depends on sale time.
- `ON_SALE`: purchase is allowed if the ticket type is also on sale.
- `SALE_CLOSED`: purchase is blocked.
- `CANCELLED`: purchase is blocked and `cancelled_reason`/`cancelled_at` are recorded.

### 6. Inventory Update Rule

When an organizer changes inventory:

```text
new_total_quantity >= sold_quantity + reserved_quantity
available_quantity = new_total_quantity - sold_quantity - reserved_quantity
```

If the rule is violated, the API returns `TICKET_QUANTITY_INVALID`.

### 7. Whitelist Email Config

This module only stores allowed sender/mailbox/subject configuration. It does not read email or parse CSV files. CSV import workers can use:

- `GET /api/v1/admin/whitelist-email-configs`
- `GET /api/v1/internal/whitelist-email-configs/active`

No mailbox password or secret is stored as plain text.

## Risks / Trade-offs

- **Express does not use Nest decorators**: The project is Express-based, so the implementation uses middleware and an OpenAPI JSON route instead of Nest `@ApiTags`/`@Roles` decorators.
- **Existing modules use legacy role/status values**: This change normalizes writes to uppercase role strings and lowercase order/ticket status strings where existing schema expects string values.
- **Payment table is not in the current Prisma schema**: This change does not add payment attempts because it belongs to the payment module owner.

