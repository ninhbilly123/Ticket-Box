## Why

`GET /api/v1/concerts/:id` already returns real concert detail from PostgreSQL. During a hot concert, many users can open the same detail page and repeatedly refresh ticket counts, which can overload PostgreSQL and Redis if not bounded.

## What Changes

- Add Redis cache-aside for stable public concert detail metadata.
- Add a separate short-lived availability endpoint for display-only remaining ticket counts.
- Add Redis-backed IP rate limits for concert detail and availability endpoints.
- Ensure public detail and availability only return concerts with `PUBLISHED` or `ON_SALE` status.
- Document that sale time, max-per-account, and availability shown in detail are display data; final enforcement belongs to the ticket hold/order API.

## Out Of Scope

- Reservation or hold-order implementation.
- Payment.
- E-ticket QR.
- Notification.
- Offline check-in.
- AI bio.
- CSV VIP import.
- CAPTCHA or waiting room.
