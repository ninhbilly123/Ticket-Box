## 1. Checkout idempotency

- [x] 1.1 Replace `Date.now()` hold idempotency key in customer booking page with a stable per-attempt key.
- [x] 1.2 Reset the key only when ticket type/quantity changes or checkout is reset.
- [x] 1.3 Remove dynamic `Date.now()` fallback from `holdOrder` API helper.

## 2. Offline VIP sync

- [x] 2.1 Update `syncOfflineLogs` to reuse `scanTicket` so offline QR sync supports normal tickets and VIP guests.
- [x] 2.2 Preserve sync conflict reporting for invalid/duplicate/wrong concert/wrong date scans.

## 3. Concert reminder worker

- [x] 3.1 Add `concert-reminder.worker.ts`.
- [x] 3.2 Send reminder email around 24 hours before concert start to users with paid valid tickets.
- [x] 3.3 Store `concert_reminder_24h` notification records and skip already-sent reminders.
- [x] 3.4 Start the worker from `app.ts`.

## 4. Verification

- [x] 4.1 Run backend build.
- [x] 4.2 Run customer frontend build.
- [x] 4.3 Run OpenSpec validation.
