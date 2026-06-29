## Context

The current schema already has the needed hold-order tables and counters:

- `Order.status`, `Order.idempotencyKey`, `Order.createdAt`, `Order.paidAt`
- `OrderItem.ticketTypeId`, `OrderItem.quantity`, `OrderItem.unitPrice`
- `TicketType.maxPerAccount`, sale time fields, `reservedQuantity`, `soldQuantity`
- `TicketInventory.availableQuantity`, `reservedQuantity`, `soldQuantity`

No `expiresAt` column is added. Hold expiry is calculated as `order.createdAt + ORDER_HOLD_TTL_SECONDS`.

## Decisions

### 1. Hold API

The hold endpoint is:

```text
POST /api/v1/orders/hold
Authorization: Bearer <access_token>
Idempotency-Key: <random-key>
```

The backend derives `userId` from `req.user.id` and ignores any client-provided `userId`.

### 2. Inventory Locking

Each ticket type inventory row is locked inside a PostgreSQL transaction:

```sql
SELECT *
FROM ticket_inventory
WHERE ticket_type_id = $1
FOR UPDATE
```

After the lock is acquired, the system verifies `availableQuantity >= quantity`, then decrements `availableQuantity` and increments `reservedQuantity`.

The synchronized `TicketType.reservedQuantity` field is also incremented to keep admin inventory views consistent.

### 3. Max Per Account

`TicketType.maxPerAccount` is enforced using the sum of existing `OrderItem.quantity` for the same user, concert, and ticket type where the order is:

- `paid`
- or `pending` and `createdAt >= now - ORDER_HOLD_TTL_SECONDS`

This prevents a user from bypassing the limit by opening multiple active pending orders.

Assumption: this check runs inside the hold transaction. For extremely high contention per user and ticket type, a dedicated user-ticket counter table could make the limit stricter, but this task does not add schema.

### 4. Idempotency

`Order.idempotencyKey` is unique. If the key already belongs to the same user and the order is `pending` or `paid`, the API returns the existing order response without holding inventory again.

If the key belongs to a different user or to a completed failed/expired order, the API rejects the request with `ORDER_HOLD_DUPLICATED`.

### 5. RabbitMQ Expiration

After the transaction commits, the API publishes:

```json
{
  "type": "EXPIRE_ORDER",
  "orderId": "...",
  "delayMs": 600000
}
```

RabbitMQ delayed delivery uses TTL plus dead-letter routing:

```text
orders.expire.delay.queue
  -> message TTL
  -> dead-letter exchange orders.expire.dlx
  -> orders.expire.queue
```

The worker consumes `orders.expire.queue`.

RabbitMQ job is only a trigger after 10 minutes. Database `order.status` is the source of truth. If the order is already `paid`, the worker skips it and does not return inventory.

### 6. Expiration

The expire worker opens a transaction, checks the order status, and only expires orders that are still `pending` and older than `createdAt + ORDER_HOLD_TTL_SECONDS`.

For each order item, the worker locks `TicketInventory`, increments `availableQuantity`, decrements `reservedQuantity`, and decrements `TicketType.reservedQuantity`.

### 7. Cache Invalidation

After a successful hold or expiration, the system deletes:

```text
ticket:availability:{concertId}
```

This keeps the detail-page availability API fresh. Payment, QR generation, and notification behavior stay out of scope.
