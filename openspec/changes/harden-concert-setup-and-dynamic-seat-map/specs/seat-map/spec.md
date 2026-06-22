## MODIFIED Requirements

### Requirement: Hiển thị sơ đồ khu vực dạng SVG tương tác
Hệ thống SHALL hiển thị SVG đã được ban tổ chức cấu hình riêng cho concert. Sơ đồ SHALL mô tả khu vực vé, không mô tả ghế riêng lẻ, và SHALL ánh xạ phần tử có `data-zone-code` tới loại vé có cùng `zoneCode`.

#### Scenario: Xem sơ đồ khu vực của concert
- **WHEN** khán giả mở trang booking của concert có `seatMapEnabled = true` và SVG hợp lệ
- **THEN** hệ thống SHALL hiển thị đúng SVG của concert đó
- **AND** SHALL thể hiện trạng thái còn vé, hết vé và đang chọn theo từng khu vực

#### Scenario: Concert không sử dụng sơ đồ
- **WHEN** concert có `seatMapEnabled = false` hoặc không có SVG công khai
- **THEN** hệ thống SHALL không render sơ đồ gán cứng
- **AND** SHALL hiển thị danh sách loại vé để khán giả chọn trực tiếp

### Requirement: Chọn khu vực vé trên sơ đồ tương tác
Khán giả SHALL có thể chọn loại vé bằng cách click phần tử SVG có `data-zone-code` khớp với `TicketType.zoneCode`.

#### Scenario: Chọn khu vực còn vé
- **WHEN** khán giả click khu vực có zone code hợp lệ và loại vé còn tồn kho
- **THEN** hệ thống SHALL highlight khu vực
- **AND** SHALL chọn đúng loại vé tương ứng để nhập số lượng

#### Scenario: Chọn khu vực hết vé
- **WHEN** khán giả click khu vực có loại vé hết tồn kho
- **THEN** khu vực SHALL ở trạng thái disabled
- **AND** hệ thống SHALL không thay đổi loại vé đang chọn

## ADDED Requirements

### Requirement: Upload và kiểm tra an toàn SVG
Ban tổ chức SHALL upload file SVG qua endpoint quản trị riêng; backend SHALL làm sạch và kiểm tra cấu trúc trước khi lưu.

#### Scenario: Upload SVG hợp lệ
- **WHEN** file nằm trong giới hạn kích thước, có root SVG, viewBox và các `data-zone-code` khớp loại vé active
- **THEN** backend SHALL loại bỏ nội dung không thuộc allowlist
- **AND** SHALL lưu phiên bản đã làm sạch để preview và phục vụ customer

#### Scenario: SVG có nội dung nguy hiểm
- **WHEN** file chứa script, event handler, foreignObject, stylesheet hoặc liên kết ngoài
- **THEN** backend SHALL loại bỏ nội dung nguy hiểm
- **AND** SHALL không lưu phiên bản có khả năng thực thi nội dung đó

#### Scenario: SVG thiếu hoặc thừa zone code
- **WHEN** concert bật sơ đồ nhưng SVG thiếu zone code của loại vé active hoặc chứa zone code không tồn tại
- **THEN** backend SHALL từ chối upload hoặc readiness SHALL không đạt
- **AND** SHALL trả danh sách zone code cần sửa
