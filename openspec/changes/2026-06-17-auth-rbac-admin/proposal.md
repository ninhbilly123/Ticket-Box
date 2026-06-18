## Why

TicketBox serves multiple user groups: audience members, organizers, check-in staff, and system admins. The current application exposes booking, payment, concert listing, and check-in APIs, but it does not yet have a consistent authentication, role-based access control, or admin management layer. Without that layer, users can pass raw user IDs in requests and access data or actions outside their responsibility.

## What Changes

- **Authentication**: Add register, login, logout, optional refresh token, and current profile APIs.
- **RBAC**: Add roles `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, and `ADMIN`, plus JWT authentication middleware, role middleware, and current-user request context.
- **Object-level authorization**: Add an authorization service that checks ownership and assignments before allowing access to concerts, orders, tickets, organizations, and check-in operations.
- **Admin management**: Add APIs for concert management, ticket type management, inventory configuration, staff assignments, whitelist email configuration, revenue summary, and admin user management.

## Capabilities

### New Capabilities

- `auth-rbac`: Account registration, login, logout, refresh tokens, JWT protected APIs, role checks, and object-level authorization helpers.
- `admin-management`: Organizer/admin APIs for concerts, ticket types, inventory, staff assignments, whitelist email configuration, revenue summaries, and user role/status management.

### Modified Capabilities

- `ticket-booking`: Protected ownership checks can use authenticated user context instead of trusting client-provided user IDs.
- `ticket-scanning`: Check-in staff can be authorized by assignment instead of a temporary default staff ID.
- `online-payment`: Order/ticket visibility can be restricted to the authenticated owner or authorized admin/organizer.

## Impact

- **Backend (Express)**:
  - Add `auth`, `rbac`, and `admin` modules inside the Core Backend API.
  - Add shared auth and role middleware.
  - Add `AuthorizationService` for object-level checks.
- **Database (PostgreSQL & Prisma)**:
  - Extend `users` with organization and status fields.
  - Add `organizations`, `refresh_tokens`, `ticket_inventory`, `staff_assignments`, `whitelist_email_configs`, and `audit_logs`.
- **Frontend (Next.js)**:
  - No deep admin UI is required in this change. Existing clients can call the new APIs directly during demo/testing.
- **Out of scope**:
  - Deep reservation/payment implementation, offline sync internals, notification workers, AI Artist Bio workers, and CSV import workers remain owned by other members.

