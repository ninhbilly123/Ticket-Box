# Ticket Booking

## Purpose
TBD

## Requirements

### Requirement: Cập nhật trạng thái vé sau thanh toán
Hệ thống SHALL cập nhật trạng thái đặt vé thành công và kích hoạt quy trình tạo e-ticket ngay khi thanh toán được xác minh.

#### Scenario: Nhận thông báo thanh toán thành công
- **WHEN** cổng thanh toán xác nhận một đơn đặt vé đã được thanh toán thành công
- **THEN** trạng thái của đơn đặt vé SHALL chuyển sang "Đã thanh toán"
- **AND** quy trình sinh vé điện tử (e-ticket) SHALL được gọi thực thi

### Requirement: Quản lý giữ chỗ tạm thời và giải phóng vé khi thanh toán thất bại
Hệ thống SHALL yêu cầu việc khóa giữ chỗ thành công trên Redis trước khi tiến hành ghi nhận đơn hàng (Order) trạng thái PENDING và các vé (Ticket) trạng thái RESERVED. Hệ thống SHALL đếm ngược 10 phút. Nếu giao dịch thanh toán thất bại hoặc hết hạn 10 phút mà chưa thanh toán, hệ thống SHALL tự động giải phóng khóa Redis, hủy đơn hàng và đánh dấu lại các vé RESERVED thành AVAILABLE.

#### Scenario: Giải phóng vé giữ chỗ khi thanh toán thất bại hoặc hết hạn
- **WHEN** Khán giả thanh toán đơn hàng thất bại trên cổng thanh toán đối tác hoặc không hoàn tất thanh toán sau 10 phút đếm ngược
- **THEN** Hệ thống SHALL giải phóng (delete) khóa giữ chỗ trên Redis cho các vé tương ứng
- **AND** Hệ thống SHALL chuyển trạng thái Order sang CANCELLED
- **AND** Hệ thống SHALL cập nhật các Ticket liên quan từ RESERVED về lại AVAILABLE để người khác có thể mua.

### Requirement: Chọn loại vé và số lượng để đặt mua
Hệ thống SHALL cho phép khán giả chọn phân hạng vé mong muốn và nhập số lượng vé cần mua trước khi tiến hành xác nhận đặt hàng.

#### Scenario: Chọn số lượng vé hợp lệ
- **WHEN** Khán giả chọn phân hạng "VIP" và nhập số lượng "2" vé (trong khi số lượng vé khả dụng còn lại là 10 và người dùng chưa vi phạm giới hạn mua)
- **THEN** Hệ thống SHALL hiển thị thông tin tạm tính (tổng tiền) và cho phép người dùng click "Xác nhận đặt vé" để chuyển sang bước thanh toán.

### Requirement: Kiểm tra và áp dụng giới hạn số lượng vé trên mỗi tài khoản (Per-user Limit)
Hệ thống SHALL kiểm tra số lượng vé mà tài khoản người dùng đã mua thành công trong lịch sử giao dịch. Nếu tổng số lượng vé đã mua thành công cộng với số lượng vé đang yêu cầu mua mới vượt quá giới hạn tối đa được cấu hình cho loại vé đó, hệ thống SHALL từ chối đặt vé và thông báo lỗi.

#### Scenario: Đặt mua vé vượt quá giới hạn cho phép của tài khoản
- **WHEN** Tài khoản của người dùng đã mua thành công 3 vé VIP trong lịch sử, giới hạn VIP là 4 vé, và người dùng cố gắng đặt mua thêm 2 vé VIP trong đơn hàng mới
- **THEN** Hệ thống SHALL ngăn chặn giao dịch, hiển thị thông báo lỗi "Bạn chỉ được mua thêm tối đa 1 vé VIP cho tài khoản này" và chặn không cho chuyển sang cổng thanh toán.

#### Scenario: Đặt mua vé hợp lệ nằm trong giới hạn của tài khoản
- **WHEN** Tài khoản của người dùng đã mua thành công 2 vé VIP trong lịch sử, giới hạn VIP là 4 vé, và người dùng tiến hành đặt mua thêm 2 vé VIP trong đơn hàng mới
- **THEN** Hệ thống SHALL phê duyệt yêu cầu đặt chỗ, tạo đơn hàng ở trạng thái chờ thanh toán, và chuyển người dùng đến trang thanh toán.
