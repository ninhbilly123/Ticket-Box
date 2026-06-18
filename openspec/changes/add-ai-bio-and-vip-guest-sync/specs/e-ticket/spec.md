## ADDED Requirements

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
