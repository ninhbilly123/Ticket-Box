## Why

`POST /api/v1/orders/hold` opens PostgreSQL transactions and locks ticket inventory rows. During hot sales, repeated calls from bots or many users can overload the database before the hold logic can protect inventory. Hot concerts also need a queue so only released users can enter checkout.

## What Changes

- Add Redis-backed user/IP rate limiting before the hold transaction.
- Add Redis Sorted Set waiting room APIs for hot concerts.
- Add checkout tokens with short TTL for users released from the waiting room.
- Add a scheduled waiting-room release worker.
- Require `Checkout-Token` for hot concerts before allowing `/orders/hold`.

## Out Of Scope

- Reworking hold-order transaction logic.
- Payment request/callback.
- QR or e-ticket generation.
- Notification.
- Check-in.
- AI bio or CSV import.
