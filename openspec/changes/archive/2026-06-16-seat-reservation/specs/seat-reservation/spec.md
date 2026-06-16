## ADDED Requirements

### Requirement: Giữ chỗ tạm thời trong phiên giao dịch (Session)
Hệ thống SHALL khóa các ghế/vé do người dùng lựa chọn vào Redis với một định danh phiên giao dịch (Session ID) và thời gian sống (TTL) là 10 phút ngay khi người dùng chuyển sang bước thanh toán.

#### Scenario: Khóa vé thành công
- **WHEN** khán giả xác nhận chọn ghế hợp lệ và tiến hành sang màn hình thanh toán
- **THEN** hệ thống SHALL lưu trạng thái "khóa" các ghế này vào Redis với TTL là 10 phút
- **AND** hệ thống SHALL phản hồi thành công và cung cấp Session ID cho Client để bắt đầu đếm ngược

### Requirement: Tự động giải phóng vé khi hết hạn (Timeout)
Hệ thống SHALL tự động xóa bỏ trạng thái khóa ghế và chuyển đơn hàng sang trạng thái hủy nếu giao dịch thanh toán không được hoàn tất trong vòng 10 phút.

#### Scenario: Hết thời gian giữ chỗ
- **WHEN** thời gian TTL 10 phút trên Redis kết thúc mà chưa có xác nhận thanh toán thành công
- **THEN** hệ thống SHALL tự động giải phóng (release) số lượng vé/ghế tương ứng trên Redis
- **AND** trạng thái đơn hàng (Order) trong database SHALL được chuyển thành CANCELLED
- **AND** trạng thái vé (Ticket) SHALL được chuyển lại thành AVAILABLE
