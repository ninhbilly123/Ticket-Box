## 1. Booking/payment hardening

- [x] 1.1 Vô hiệu hóa `/api/v1/tickets/book` bằng response `410`.
- [x] 1.2 Yêu cầu authentication và ownership cho `POST /api/v1/payments`.
- [x] 1.3 Yêu cầu authentication và authorization cho `GET /api/v1/tickets/order/:id`.
- [x] 1.4 Chặn mock payment webhook mặc định và yêu cầu secret khi bật.
- [x] 1.5 Tắt giả lập lỗi payment ngẫu nhiên mặc định.

## 2. Check-in consistency

- [x] 2.1 Làm online scan atomic để tránh quét trùng đồng thời.
- [x] 2.2 Loại bỏ việc gán seatNumber giả khi phát hành vé thanh toán.
- [x] 2.3 Chặn hoặc làm rõ nhánh VIP fallback tạo vé 0đ không ảnh hưởng tồn kho.

## 3. Redis and queue consistency

- [x] 3.1 Cập nhật BullMQ Redis connection để hỗ trợ đầy đủ `REDIS_URL`.
- [x] 3.2 Cập nhật idempotency dùng `SET NX EX`.
- [x] 3.3 Dùng readiness/timeout wrapper cho Redis operations trong payment và ticket invalidation.

## 4. Object authorization

- [x] 4.1 Bổ sung object-level authorization cho AI Artist Bio.
- [x] 4.2 Scope sponsor email và import report theo organization.
- [x] 4.3 Bảo đảm import CSV chỉ map eventCode thuộc organization/allowlist hợp lệ.

## 5. Frontend compatibility and verification

- [x] 5.1 Cập nhật customer frontend gửi access token khi tạo payment/check order.
- [x] 5.2 Chạy backend build.
- [x] 5.3 Chạy frontend build nếu có thay đổi frontend.
- [x] 5.4 Chạy OpenSpec validation.
