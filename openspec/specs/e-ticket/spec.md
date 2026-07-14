# E-Ticket

## Purpose
Đặc tả chi tiết các yêu cầu liên quan đến sinh mã QR, quản lý và gửi vé điện tử (E-ticket) cho khách hàng và khách mời VIP trong hệ thống TicketBox.

## Requirements
### Requirement: Sinh mã QR E-Ticket
Hệ thống SHALL tự động sinh một mã QR duy nhất và an toàn bằng thuật toán mã hóa cho mỗi vé sau khi thanh toán thành công.

#### Scenario: Sinh QR thành công
- **WHEN** một giao dịch thanh toán được xác nhận là thành công
- **THEN** hệ thống SHALL tạo một mã QR token duy nhất cho vé tương ứng
- **AND** hệ thống SHALL lưu token này vào cơ sở dữ liệu

### Requirement: Gửi E-Ticket qua Email
Hệ thống SHALL gửi email chứa thông tin E-ticket và hình ảnh mã QR đến địa chỉ email đã đăng ký của người dùng.

#### Scenario: Gửi email thành công
- **WHEN** một vé được tạo thành công cùng mã QR token
- **THEN** hệ thống SHALL đưa tác vụ gửi email vào hàng đợi (queue)
- **AND** người dùng SHALL nhận được email chứa chi tiết đơn hàng và hình ảnh mã QR

### Requirement: Hiển thị E-Ticket trong hồ sơ người dùng
Hệ thống SHALL cho phép người dùng xem các e-ticket đã mua trong trang quản lý tài khoản cá nhân.

#### Scenario: Người dùng xem e-ticket
- **WHEN** người dùng truy cập vào mục "Vé của tôi"
- **THEN** hệ thống SHALL hiển thị danh sách các vé đã mua
- **AND** khi click vào một vé, hệ thống SHALL hiển thị mã QR tương ứng của vé đó

### Requirement: Sinh E-Ticket cho khách mời VIP
Hệ thống SHALL sinh e-ticket QR cho khách mời VIP được import thành công từ CSV của nhà tài trợ.

#### Scenario: Tạo e-ticket VIP sau khi import khách hợp lệ
- **WHEN** một khách mời VIP được import thành công từ CSV và không bị trùng
- **THEN** hệ thống SHALL sinh một QR token duy nhất cho khách mời đó
- **AND** hệ thống SHALL lưu QR token để phục vụ gửi email và soát vé tại cổng VIP
- **AND** e-ticket SHALL được đánh dấu là loại khách mời VIP để phân biệt với vé mua thường

### Requirement: Gửi E-Ticket VIP qua email
Hệ thống SHALL gửi email chứa e-ticket QR đến địa chỉ email của từng khách mời VIP import thành công.

#### Scenario: Khách mời VIP có email hợp lệ
- **WHEN** khách mời VIP được tạo thành công và có email hợp lệ
- **THEN** hệ thống SHALL đưa tác vụ gửi e-ticket VIP vào hàng đợi email
- **AND** khách mời SHALL nhận được email chứa thông tin sự kiện và mã QR e-ticket

#### Scenario: Gửi email e-ticket VIP thất bại
- **WHEN** email worker không gửi được e-ticket VIP cho khách mời
- **THEN** hệ thống SHALL cập nhật trạng thái gửi email là `FAILED`
- **AND** import report SHALL ghi nhận lỗi gửi email để ban tổ chức có thể xử lý hoặc retry

#### Scenario: SMTP từ chối thông tin xác thực hoặc địa chỉ gửi
- **WHEN** SMTP từ chối credential hoặc `MAIL FROM` không hợp lệ
- **THEN** email job SHALL thất bại
- **AND** trạng thái email của khách VIP SHALL là `FAILED`
- **AND** hệ thống SHALL giữ nguyên QR token và bản ghi khách VIP để phục vụ kiểm tra hoặc gửi lại sau

---

### Requirement: Concert Reminder Email
Hệ thống SHALL gửi email nhắc lịch cho người có vé hợp lệ trước thời điểm diễn ra concert khoảng 24 giờ.

#### Scenario: Gửi reminder trước concert
- **WHEN** một concert sắp diễn ra trong cửa sổ nhắc 24 giờ
- **AND** user có ít nhất một vé `valid` thuộc order đã thanh toán cho concert đó
- **THEN** hệ thống SHALL gửi email nhắc lịch cho user
- **AND** hệ thống SHALL tạo notification type `concert_reminder_24h`.

#### Scenario: Không gửi reminder trùng
- **WHEN** hệ thống đã có notification email type `concert_reminder_24h` cho cùng user và concert
- **THEN** reminder worker SHALL skip user đó
- **AND** hệ thống SHALL NOT gửi email reminder lần thứ hai.
