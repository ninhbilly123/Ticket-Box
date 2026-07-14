## Why

Ba lỗi còn lại ảnh hưởng trực tiếp đến tính đúng đắn của luồng bán vé và vận hành cổng:

- Customer frontend sinh idempotency key giữ vé bằng `Date.now()`, nên double click nhanh có thể tạo nhiều hold request khác key.
- Backend offline sync chỉ tra bảng `Ticket`, làm QR khách VIP bị đánh dấu `INVALID_TICKET` khi đồng bộ từ Scanner App.
- Hệ thống chưa có worker nhắc người mua trước 24 giờ diễn ra concert.

## What Changes

- Giữ idempotency key ổn định cho một checkout attempt ở customer booking page và chỉ reset khi người dùng đổi loại vé/số lượng hoặc bắt đầu đặt vé mới.
- Bỏ fallback `Date.now()` trong API client hold order; nếu caller không truyền key thì sinh key ổn định theo payload đủ cụ thể.
- Cập nhật `syncOfflineLogs` để dùng chung logic `scanTicket`, nhờ đó offline sync xử lý được cả vé thường và QR VIP guest.
- Thêm `concert-reminder.worker` chạy cron định kỳ, tìm concert diễn trong khoảng 24 giờ tới, gửi email nhắc lịch cho người có vé đã thanh toán, và chống gửi trùng bằng `Notification`.

## Impact

- Không cần migration database.
- Có thêm worker chạy nền khi backend start.
- Có thêm notification type `concert_reminder_24h`.
- Scanner App offline sync sẽ nhận `SYNCED` cho QR VIP hợp lệ thay vì conflict `INVALID_TICKET`.
