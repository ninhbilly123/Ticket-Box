## ADDED Requirements

### Requirement: Quản lý giữ chỗ tạm thời và giải phóng vé khi thanh toán thất bại
Hệ thống SHALL chuyển trạng thái đơn hàng sang PENDING và giữ chỗ các vé dưới trạng thái RESERVED khi tạo đơn hàng mới. Nếu giao dịch thanh toán thất bại hoặc quá hạn 10 phút, hệ thống SHALL giải phóng giữ chỗ bằng cách hủy đơn hàng và xóa các vé RESERVED tương ứng.

#### Scenario: Giải phóng vé giữ chỗ khi thanh toán thất bại
- **WHEN** Khán giả thanh toán đơn hàng thất bại trên cổng thanh toán đối tác hoặc không hoàn tất thanh toán sau 10 phút
- **THEN** Hệ thống SHALL chuyển trạng thái Order sang CANCELLED, xóa các Ticket có trạng thái RESERVED liên quan, và xóa cache số vé trên Redis.
