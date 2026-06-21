## ADDED Requirements

### Requirement: Sinh mã QR E-Ticket
Hệ thống SHALL tự động sinh một mã QR duy nhất và an toàn bằng thuật toán mã hóa cho mỗi vé sau khi thanh toán thành công.

#### Scenario: Sinh QR thành công
- **WHEN** một giao dịch thanh toán được xác nhận là thành công
- **THEN** hệ thống SHALL tạo một mã QR token duy nhất cho vé tương ứng
- **AND** hệ thống SHALL lưu token này vào cơ sở dữ liệu

---

### Requirement: Gửi E-Ticket qua Email
Hệ thống SHALL gửi email chứa thông tin E-ticket và hình ảnh mã QR đến địa chỉ email đã đăng ký của người dùng.

#### Scenario: Gửi email thành công
- **WHEN** một vé được tạo thành công cùng mã QR token
- **THEN** hệ thống SHALL đưa tác vụ gửi email vào hàng đợi (queue)
- **AND** người dùng SHALL nhận được email chứa chi tiết đơn hàng và hình ảnh mã QR

---

### Requirement: Hiển thị E-Ticket trong hồ sơ người dùng
Hệ thống SHALL cho phép người dùng xem các e-ticket đã mua trong trang quản lý tài khoản cá nhân.

#### Scenario: Người dùng xem e-ticket
- **WHEN** người dùng truy cập vào mục "Vé của tôi"
- **THEN** hệ thống SHALL hiển thị danh sách các vé đã mua
- **AND** khi click vào một vé, hệ thống SHALL hiển thị mã QR tương ứng của vé đó
