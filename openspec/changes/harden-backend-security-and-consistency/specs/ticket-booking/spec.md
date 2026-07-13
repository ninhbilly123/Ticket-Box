## MODIFIED Requirements

### Requirement: Quản lý giữ chỗ tạm thời và giải phóng vé khi thanh toán thất bại
Hệ thống SHALL chỉ cho phép luồng mua vé công khai tạo đơn hàng thông qua hold-order flow có xác thực, giữ tồn kho trước thanh toán và phát hành vé sau khi thanh toán thành công.

#### Scenario: API đặt vé legacy bị vô hiệu hóa
- **WHEN** client gọi `POST /api/v1/tickets/book`
- **THEN** hệ thống SHALL trả `410 GONE`
- **AND** hệ thống SHALL không tạo order, ticket hoặc thay đổi tồn kho.

#### Scenario: Xem order yêu cầu quyền sở hữu
- **WHEN** audience đã đăng nhập yêu cầu xem order của chính mình
- **THEN** hệ thống SHALL trả thông tin order và tickets tương ứng
- **WHEN** user khác yêu cầu xem order không thuộc quyền của họ
- **THEN** hệ thống SHALL trả `403 FORBIDDEN_RESOURCE`.
