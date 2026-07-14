# Online Payment

## Purpose
Đặc tả chi tiết các yêu cầu liên quan đến tích hợp cổng thanh toán trực tuyến (VNPAY, MoMo), chống thanh toán lặp, và đảm bảo an toàn giao dịch thanh toán trong hệ thống TicketBox.

## Requirements

### Requirement: Phát sự kiện thanh toán thành công
Hệ thống SHALL phát ra một sự kiện (event) nội bộ thông báo thanh toán thành công để kích hoạt các dịch vụ liên quan như tạo e-ticket.

#### Scenario: Hoàn tất thanh toán
- **WHEN** webhook của cổng thanh toán nhận được payload thông báo thanh toán thành công
- **THEN** hệ thống SHALL xử lý luồng thanh toán
- **AND** hệ thống SHALL phát sự kiện `PaymentCompleted` vào message broker/queue

---

### Requirement: Lựa chọn cổng thanh toán trực tuyến và hoàn tất giao dịch
Hệ thống SHALL chỉ tạo giao dịch thanh toán cho user đã đăng nhập và chỉ với order thuộc user đó. Mock webhook SHALL bị tắt mặc định và không được dùng thay thế webhook/IPN có xác thực chữ ký.

#### Scenario: User tạo payment cho order của mình
- **WHEN** user đã đăng nhập gửi `orderId` của order đang pending thuộc chính user
- **THEN** hệ thống SHALL tạo payment pending và trả payment URL.

#### Scenario: User tạo payment cho order của người khác
- **WHEN** user đã đăng nhập gửi `orderId` không thuộc chính user
- **THEN** hệ thống SHALL trả `403 FORBIDDEN_RESOURCE`
- **AND** không tạo payment.

#### Scenario: Mock webhook bị tắt
- **WHEN** mock webhook không được bật bằng cấu hình runtime
- **THEN** hệ thống SHALL từ chối request mock webhook
- **AND** không cập nhật trạng thái payment/order.

#### Scenario: Khán giả thanh toán qua VNPAY thành công
- **WHEN** Khán giả chọn thanh toán qua VNPAY và hoàn tất thanh toán thành công trên cổng đối tác
- **THEN** Hệ thống SHALL nhận callback/webhook từ VNPAY, chuyển trạng thái Order sang PAID, chuyển các Ticket liên quan sang BOOKED, sinh mã e-ticket QR, và thông báo thành công cho khán giả.

#### Scenario: Khán giả thanh toán qua MoMo thành công
- **WHEN** Khán giả chọn thanh toán qua MoMo và hoàn tất thanh toán thành công trên cổng đối tác
- **THEN** Hệ thống SHALL nhận callback/webhook từ MoMo, chuyển trạng thái Order sang PAID, chuyển các Ticket liên quan sang BOOKED, sinh mã e-ticket QR, và thông báo thành công cho khán giả.

---

### Requirement: Chống giao dịch trùng lặp bằng Idempotency Key
Hệ thống SHALL áp dụng cơ chế Idempotency Key đối với tất cả yêu cầu thanh toán nhằm ngăn chặn việc trừ tiền trùng lặp do lỗi mạng hoặc click đúp từ người dùng.

#### Scenario: Gửi lại yêu cầu thanh toán trùng lặp
- **WHEN** Khán giả gửi yêu cầu thanh toán đi kèm Idempotency Key của một giao dịch đã xử lý thành công trước đó
- **THEN** Hệ thống SHALL trả về thông tin kết quả của giao dịch cũ ngay lập tức mà không thực hiện trừ tiền hoặc tạo giao dịch mới trong database.

#### Scenario: Nhận webhook/IPN trùng lặp từ đối tác
- **WHEN** Webhook/IPN của cổng thanh toán gửi lại thông báo kết quả thanh toán cho một giao dịch đã được ghi nhận thành công trước đó
- **THEN** Hệ thống SHALL đối chiếu Idempotency Key (hoặc mã giao dịch đối tác)
- **AND** SHALL phản hồi thành công (IPN OK) ngay lập tức mà không thực hiện xử lý lại giao dịch hay ghi đè database.

---

### Requirement: Tự động ngắt kết nối cổng thanh toán bằng Circuit Breaker
Hệ thống SHALL sử dụng cơ chế Circuit Breaker để tự động ngắt kết nối tạm thời với cổng thanh toán đối tác (VNPAY hoặc MoMo) khi phát hiện cổng đó gặp lỗi kết nối liên tục (vượt quá 5 lần).

#### Scenario: Cổng thanh toán MoMo gặp lỗi hệ thống liên tục
- **WHEN** Hệ thống gọi API sang MoMo gặp lỗi kết nối liên tiếp 5 lần
- **THEN** Circuit Breaker cho cổng MoMo SHALL chuyển sang trạng thái OPEN, tự động chặn toàn bộ yêu cầu thanh toán qua MoMo mới, và thông báo cho khán giả rằng cổng thanh toán đang bảo trì.
