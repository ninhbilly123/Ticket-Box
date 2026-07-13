## MODIFIED Requirements

### Requirement: Quản lý giữ chỗ tạm thời và giải phóng vé khi thanh toán thất bại
Hệ thống SHALL yêu cầu việc khóa giữ chỗ thành công trên Redis trước khi tiến hành ghi nhận đơn hàng (Order) trạng thái PENDING và các vé (Ticket) trạng thái RESERVED. Hệ thống SHALL đếm ngược 10 phút. Nếu giao dịch thanh toán thất bại hoặc hết hạn 10 phút mà chưa thanh toán, hệ thống SHALL tự động giải phóng khóa Redis, hủy đơn hàng và đánh dấu lại các vé RESERVED thành AVAILABLE.

#### Scenario: Giải phóng vé giữ chỗ khi thanh toán thất bại hoặc hết hạn
- **WHEN** Khán giả thanh toán đơn hàng thất bại trên cổng thanh toán đối tác hoặc không hoàn tất thanh toán sau 10 phút đếm ngược
- **THEN** Hệ thống SHALL giải phóng (delete) khóa giữ chỗ trên Redis cho các vé tương ứng
- **AND** Hệ thống SHALL chuyển trạng thái Order sang CANCELLED
- **AND** Hệ thống SHALL cập nhật các Ticket liên quan từ RESERVED về lại AVAILABLE để người khác có thể mua.
