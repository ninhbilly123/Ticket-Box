## MODIFIED Requirements

### Requirement: Điều hướng tích hợp trong dashboard hiện tại
Admin frontend SHALL sử dụng session đã xác thực để hiển thị workspace đúng role. `ORGANIZER` SHALL thấy dashboard quản trị và các tab tích hợp; `CHECKIN_STAFF` SHALL chỉ thấy scanner workspace; role khác SHALL bị từ chối.

#### Scenario: Organizer mở chức năng quản trị
- **WHEN** tài khoản `ORGANIZER` đăng nhập admin frontend
- **THEN** UI SHALL hiển thị dashboard organizer và các tab quản trị hiện có
- **AND** UI SHALL tải dữ liệu quản trị bằng bearer token của organizer

#### Scenario: Check-in staff đăng nhập
- **WHEN** tài khoản `CHECKIN_STAFF` đăng nhập admin frontend
- **THEN** UI SHALL hiển thị scanner, VIP guest list, offline sync và thống kê check-in
- **AND** UI SHALL không tải API quản trị organizer

#### Scenario: Tài khoản audience đăng nhập
- **WHEN** tài khoản `AUDIENCE` đăng nhập admin frontend
- **THEN** UI SHALL hiển thị trạng thái từ chối truy cập
- **AND** UI SHALL không tải dữ liệu quản trị hoặc check-in

#### Scenario: Khôi phục session đã lưu
- **WHEN** admin frontend đọc session từ local storage và `/auth/me` xác nhận user còn hợp lệ
- **THEN** UI SHALL chọn lại workspace theo role từ user đã xác nhận
- **AND** token hết hạn hoặc user disabled SHALL đưa UI về màn hình đăng nhập
