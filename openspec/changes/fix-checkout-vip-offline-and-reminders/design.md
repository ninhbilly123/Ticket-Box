## Approach

### Stable Hold Idempotency Key

Customer booking page owns the user's checkout attempt. A key is generated once and stored in a ref/state, then reused for repeated submits of the same ticket type and quantity. The key is reset only when:

- selected ticket type changes,
- quantity changes,
- user explicitly resets checkout / starts a new booking.

This prevents rapid double-clicks from bypassing backend idempotency.

### Offline VIP Sync

`syncOfflineLogs` should not reimplement scan lookup with only `Ticket`. It should reuse `scanTicket()` for each sorted offline log. `scanTicket()` already:

- searches normal ticket by id/qrCode,
- falls back to VIP guest QR token when normal ticket is not found,
- applies wrong concert/date/cancelled/already-used checks,
- updates normal tickets atomically,
- updates VIP guests with `updateMany`.

The sync response keeps the existing shape: `syncedCount`, `conflictCount`, `conflicts`.

### 24h Reminder Worker

A cron worker runs periodically and queries concerts whose `startAt` is within a reminder window around 24 hours from now. For every user with paid valid tickets, it checks whether an email notification with:

- `type = concert_reminder_24h`
- `channel = email`
- same `userId`
- same `concertId`

already exists. If not, it sends an email and creates email/app notification records.

The query window is configurable to avoid missing concerts between cron ticks.

Environment variables:

- `CONCERT_REMINDER_CRON`, default `*/15 * * * *`
- `CONCERT_REMINDER_HOURS_BEFORE`, default `24`
- `CONCERT_REMINDER_LOOKAHEAD_MINUTES`, default `30`
