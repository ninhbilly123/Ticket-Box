## Approach

### Booking and Payment

Luồng chính phải là:

1. `POST /api/v1/orders/hold` tạo order pending và giữ tồn kho.
2. `POST /api/v1/payments` yêu cầu JWT và chỉ nhận order của chính user.
3. VNPAY IPN/return xác minh chữ ký rồi chuyển order sang paid/failed.

Route legacy `/tickets/book` không còn phù hợp vì phát hành ticket `valid` trước payment và dùng `userId` từ body.

### Mock Webhook

Mock webhook chỉ phục vụ demo local. Backend mặc định từ chối route này. Khi cần demo, bật env:

- `ENABLE_MOCK_PAYMENT_WEBHOOK=true`
- `MOCK_PAYMENT_WEBHOOK_SECRET=<secret>`

Client simulator phải gửi `X-Mock-Payment-Secret`.

### Redis

Redis fallback cho cache/rate-limit vẫn fail-open để app demo không chết khi Redis tắt, nhưng các thao tác phải dùng `isRedisReady()` và `runRedisOperation()` để tránh socket mở nhưng chưa usable. Idempotency dùng atomic `SET NX EX`.

BullMQ dùng cùng `REDIS_URL`, gồm username/password/db/TLS nếu có.

### Check-in

Check-in vé thường dùng atomic update `Ticket where id/status='valid'`. Nếu update count bằng 0, backend đọc lại trạng thái và trả `ALREADY_USED`/`INVALID_TICKET`. Cách này tránh hai request đồng thời đều tạo check-in thành công.

### Object-Level Authorization

Role `ORGANIZER` chưa đủ. Các module AI Bio và VIP Sync phải kiểm tra concert/organization:

- AI Bio: upload/get/review/publish chỉ cho organizer quản lý concert đó.
- VIP Sync: danh sách sponsor/report chỉ trong organization hiện tại; row import chỉ chấp nhận eventCode thuộc sponsor/org hợp lệ.
