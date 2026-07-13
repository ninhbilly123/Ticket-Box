## 1. OpenSpec

- [x] 1.1 Inspect existing OpenSpec style.
- [x] 1.2 Create `openspec/changes/2026-06-17-auth-rbac-admin/`.
- [x] 1.3 Write `proposal.md`.
- [x] 1.4 Write `design.md`.
- [x] 1.5 Write `specs/auth-rbac/spec.md`.
- [x] 1.6 Write `specs/admin-management/spec.md`.

## 2. Database & Seed

- [x] 2.1 Extend Prisma schema for organizations, refresh tokens, inventory, staff assignments, whitelist configs, audit logs, and user admin fields.
- [x] 2.2 Add/update migration.
- [x] 2.3 Seed organizer, staff, and audience accounts with hashed passwords.

## 3. Auth & RBAC Backend

- [x] 3.1 Implement register, login, logout, refresh, and me APIs.
- [x] 3.2 Implement JWT auth middleware.
- [x] 3.3 Implement role middleware and current-user request typing.
- [x] 3.4 Implement `AuthorizationService` object-level checks.

## 4. Admin Backend

- [x] 4.1 Implement admin concert APIs.
- [x] 4.2 Implement ticket type APIs.
- [x] 4.3 Implement inventory config APIs.
- [x] 4.4 Implement staff assignment APIs.
- [x] 4.5 Implement whitelist email config APIs.
- [x] 4.6 Implement revenue summary and sales stats APIs.
- [x] 4.7 Implement organizer staff lookup APIs.
- [x] 4.8 Add OpenAPI documentation endpoint for Member A APIs.

## 5. Verification

- [x] 5.1 Add auth/admin smoke tests.
- [x] 5.2 Run Prisma validate/format.
- [x] 5.3 Run backend build.
- [x] 5.4 Run migration/seed/API smoke verification.
- [x] 5.5 Update README with seed accounts and A-owned API notes.
