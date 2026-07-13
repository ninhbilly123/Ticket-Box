## MODIFIED Requirements

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
