## Why

The current booking path creates a pending order and tickets directly. A safer TicketBox flow needs a dedicated hold step that reserves inventory, creates a pending order, and hands the order id to the payment flow without creating e-ticket QR records.

## What Changes

- Add authenticated `POST /api/v1/orders/hold`.
- Use `Idempotency-Key` to prevent double-click duplicate holds.
- Hold inventory with PostgreSQL transaction and row-level lock on `ticket_inventory`.
- Enforce sale window, ticket type ownership, available quantity, and `maxPerAccount`.
- Create pending `Order` and `OrderItem` records without creating `Ticket` or QR records.
- Publish RabbitMQ delayed expire jobs using TTL plus dead-letter queue.
- Add an expire worker that returns reserved inventory when unpaid orders expire after 10 minutes.

## Out Of Scope

- Payment request and callback handling.
- QR/e-ticket generation.
- Notification sending.
- Check-in.
- AI bio.
- CSV VIP import.
