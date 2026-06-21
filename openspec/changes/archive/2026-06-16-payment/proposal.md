## Why

Khán giả cần các phương thức thanh toán trực tuyến nhanh chóng, tiện lợi và an toàn qua VNPAY hoặc MoMo. Đồng thời, hệ thống cần giải quyết triệt để vấn đề trừ tiền hai lần (bằng Idempotency Key) và bảo vệ hệ thống khỏi các lỗi kết nối kéo dài từ bên đối tác thanh toán (bằng Circuit Breaker) nhằm nâng cao trải nghiệm người dùng và đảm bảo tính nhất quán dữ liệu.

## What Changes

- **Tích hợp cổng thanh toán trực tuyến**: Hỗ trợ tích hợp VNPAY và MoMo vào quy trình mua vé của Khán giả.
- **Cập nhật luồng xử lý đơn hàng**:
  - Giao dịch thành công: Cập nhật trạng thái đơn hàng (`Order`) thành `PAID` và tự động sinh mã vé điện tử (e-ticket QR).
  - Giao dịch thất bại: Hủy đơn hàng và giải phóng các vé/ghế đã được khóa giữ chỗ tạm thời (seat reservation).
- **Circuit Breaker cho cổng thanh toán**: Tự động ngắt kết nối và trả về mã lỗi bảo trì khi phát hiện cổng thanh toán đối tác bị lỗi liên tục, tránh treo luồng giao dịch của hệ thống.
- **Idempotency Key**: Áp dụng cơ chế Idempotency Key đối với các yêu cầu thanh toán để ngăn chặn việc trừ tiền trùng lặp do click đúp hoặc do lỗi kết nối mạng.

## Capabilities

### New Capabilities
- `online-payment`: Tích hợp các cổng thanh toán trực tuyến VNPAY/MoMo, cơ chế Idempotency Key chống trùng giao dịch, và Circuit Breaker tự ngắt bảo vệ hệ thống khi lỗi liên tục.

### Modified Capabilities
- `ticket-booking`: Thay đổi luồng đặt vé để liên kết với kết quả thanh toán (chuyển sang trạng thái `PAID` và sinh e-ticket, hoặc giải phóng giữ chỗ khi thanh toán thất bại).

## Impact

- **Backend (Express)**:
  - Tạo mới module `payment` chứa logic tích hợp VNPAY/MoMo API, nhận webhook và xử lý trạng thái.
  - Sử dụng Redis để kiểm tra Idempotency Key và ghi nhận trạng thái Circuit Breaker (Open, Closed, Half-Open).
  - Bổ sung logic xử lý e-ticket QR trong module `ticket` khi thanh toán thành công.
- **Database (PostgreSQL)**:
  - Tạo bảng `payments` để ghi nhận các giao dịch thanh toán.
  - Cấu hình các quan hệ giữa `Order`, `Payment` và `Ticket`.
- **Frontend (Next.js)**:
  - Bổ sung giao diện chọn cổng thanh toán trong luồng đặt vé.
  - Thêm trang hiển thị kết quả thanh toán, thông tin đơn hàng và mã QR e-ticket sau khi giao dịch thành công.
