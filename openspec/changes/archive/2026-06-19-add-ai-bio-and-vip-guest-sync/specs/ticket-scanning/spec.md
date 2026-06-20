## ADDED Requirements

### Requirement: Quét E-Ticket của khách mời VIP
Hệ thống SHALL cho phép nhân sự soát vé xác thực QR e-ticket của khách mời VIP tại cổng VIP bằng cùng cơ chế an toàn như e-ticket mua thường.

#### Scenario: Quét e-ticket VIP hợp lệ
- **WHEN** nhân sự soát vé gửi QR token hợp lệ của một khách mời VIP chưa check-in
- **THEN** hệ thống SHALL cập nhật trạng thái khách mời VIP thành đã check-in
- **AND** hệ thống SHALL trả về thông tin khách mời, công ty, concert và loại vé VIP guest

#### Scenario: Quét e-ticket VIP đã sử dụng
- **WHEN** nhân sự soát vé gửi QR token của một khách mời VIP đã check-in trước đó
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi cho biết e-ticket VIP đã được sử dụng

#### Scenario: Quét e-ticket VIP không hợp lệ
- **WHEN** nhân sự soát vé gửi QR token không tồn tại hoặc không khớp chữ ký hệ thống
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi cho biết e-ticket VIP không hợp lệ
