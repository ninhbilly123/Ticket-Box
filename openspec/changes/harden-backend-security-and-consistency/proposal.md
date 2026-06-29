## Why

Backend hiện còn một số đường legacy và điểm fail-open có thể làm sai nghiệp vụ bán vé: API đặt vé cũ có thể phát hành vé trước thanh toán, payment mock webhook có thể bị gọi công khai, một số API trả dữ liệu order không kiểm tra chủ sở hữu, check-in có race condition, và Redis/idempotency chưa nhất quán khi connection chưa sẵn sàng.

## What Changes

- Vô hiệu hóa luồng đặt vé legacy `/api/v1/tickets/book` để mọi đơn hàng đi qua hold-order và payment flow.
- Bảo vệ payment/order bằng authentication và ownership authorization.
- Chặn mock payment webhook mặc định, chỉ cho phép khi bật rõ bằng env và có secret.
- Làm check-in vé thường atomic để tránh quét trùng đồng thời.
- Chuẩn hóa Redis usage cho idempotency/circuit breaker/invalidation và hỗ trợ Redis URL đầy đủ cho BullMQ.
- Bổ sung object-level authorization cho AI Artist Bio và VIP Guest Sync theo concert/organization.
- Loại bỏ giả lập lỗi payment ngẫu nhiên khỏi runtime mặc định.

## Impact

- Customer frontend cần gửi access token khi tạo payment và kiểm tra order.
- Các test/demo dùng mock webhook phải cấu hình `ENABLE_MOCK_PAYMENT_WEBHOOK=true` và `MOCK_PAYMENT_WEBHOOK_SECRET`.
- `/api/v1/tickets/book` trả `410 GONE`; frontend chính đã dùng `/api/v1/orders/hold`.
