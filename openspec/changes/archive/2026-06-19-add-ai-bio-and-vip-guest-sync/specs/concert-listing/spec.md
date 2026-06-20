## ADDED Requirements

### Requirement: Định danh concert bằng event code duy nhất
Hệ thống SHALL lưu một mã sự kiện `eventCode` duy nhất cho mỗi concert để các tích hợp bên ngoài, đặc biệt là CSV khách mời VIP, có thể tham chiếu đến đúng concert.

#### Scenario: Tạo concert với event code hợp lệ
- **WHEN** Ban tổ chức tạo hoặc cập nhật concert với một `eventCode` chưa tồn tại
- **THEN** hệ thống SHALL lưu `eventCode` đó cho concert
- **AND** hệ thống SHALL đảm bảo không có concert khác dùng cùng `eventCode`

#### Scenario: Event code bị trùng
- **WHEN** Ban tổ chức tạo hoặc cập nhật concert với `eventCode` đã tồn tại ở concert khác
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi cho biết mã sự kiện đã được sử dụng

### Requirement: Hiển thị Artist Bio đã publish trên trang chi tiết concert
Hệ thống SHALL chỉ hiển thị Artist Bio cho khán giả khi bio đó đã được ban tổ chức duyệt và publish.

#### Scenario: Concert có Artist Bio đã publish
- **WHEN** Khán giả truy cập trang chi tiết concert có Artist Bio trạng thái `PUBLISHED`
- **THEN** hệ thống SHALL hiển thị nội dung bio đã publish trên trang chi tiết concert

#### Scenario: Concert chưa có Artist Bio được publish
- **WHEN** Khán giả truy cập trang chi tiết concert chưa có Artist Bio trạng thái `PUBLISHED`
- **THEN** hệ thống SHALL không hiển thị bio nháp, bio đang xử lý hoặc bio bị lỗi cho khán giả
