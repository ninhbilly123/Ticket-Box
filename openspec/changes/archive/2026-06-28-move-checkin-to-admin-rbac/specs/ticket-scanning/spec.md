## MODIFIED Requirements

### Requirement: Quét và xác thực mã QR của vé
Hệ thống SHALL cung cấp API xác thực QR và cập nhật check-in chỉ cho `CHECKIN_STAFF` đã đăng nhập, được phân công vào concert đang soát. Backend SHALL xác định nhân viên từ access token và không tin staff ID do client gửi.

#### Scenario: Quét vé hợp lệ
- **WHEN** staff có assignment gửi Bearer token hợp lệ, concert ID được phân công và QR chưa sử dụng
- **THEN** hệ thống SHALL cập nhật trạng thái vé thành đã check-in
- **AND** check-in log SHALL lưu `gateStaffId` bằng user ID trong access token
- **AND** hệ thống SHALL trả thông tin chi tiết của vé

#### Scenario: Quét vé không hợp lệ
- **WHEN** staff gửi QR không tồn tại hoặc không hợp lệ
- **THEN** hệ thống SHALL từ chối check-in vé đó
- **AND** hệ thống SHALL trả trạng thái `INVALID_TICKET`

#### Scenario: Quét vé trùng lặp
- **WHEN** staff gửi QR đã được check-in trước đó
- **THEN** hệ thống SHALL không tạo check-in thành công thứ hai
- **AND** hệ thống SHALL trả trạng thái `ALREADY_USED`

#### Scenario: Request không có token hoặc sai role
- **WHEN** request check-in không có JWT hoặc user có role `AUDIENCE` hay `ORGANIZER`
- **THEN** hệ thống SHALL trả `401` hoặc `403`
- **AND** hệ thống SHALL không đọc hoặc thay đổi trạng thái vé

#### Scenario: Staff không được phân công concert
- **WHEN** `CHECKIN_STAFF` gửi request cho concert không có StaffAssignment tương ứng
- **THEN** hệ thống SHALL trả `403 FORBIDDEN_RESOURCE`
- **AND** hệ thống SHALL không tạo check-in log

## ADDED Requirements

### Requirement: Scanner chỉ tồn tại trong admin frontend
Hệ thống SHALL cung cấp scanner trong admin frontend và SHALL không hiển thị route hoặc liên kết soát vé trong customer frontend.

#### Scenario: Khán giả sử dụng customer frontend
- **WHEN** khán giả truy cập customer frontend hoặc thanh điều hướng
- **THEN** UI SHALL không hiển thị liên kết `Check-in`
- **AND** route `/checkin` của customer frontend SHALL không còn cung cấp scanner

#### Scenario: Nhân viên mở admin frontend
- **WHEN** user role `CHECKIN_STAFF` đăng nhập admin frontend
- **THEN** UI SHALL hiển thị scanner workspace
- **AND** UI SHALL không hiển thị chức năng quản lý concert, staff, tích hợp hoặc doanh thu

### Requirement: Staff chỉ xem concert được phân công
Backend SHALL trả cho staff đăng nhập danh sách concert và gate từ `StaffAssignment`, và SHALL kiểm tra assignment trên mọi thao tác check-in theo concert.

#### Scenario: Staff có assignment
- **WHEN** staff gọi danh sách concert check-in bằng JWT hợp lệ
- **THEN** API SHALL chỉ trả các concert có `StaffAssignment.staffId` bằng user ID hiện tại
- **AND** mỗi concert SHALL kèm các `gateIds` được phân công

#### Scenario: Staff chưa được phân công
- **WHEN** staff hợp lệ chưa có StaffAssignment
- **THEN** API SHALL trả danh sách rỗng
- **AND** scanner SHALL hiển thị empty state và vô hiệu hóa thao tác quét

### Requirement: Offline sync được xác thực theo staff và concert
Offline sync SHALL yêu cầu JWT, `concertId`, device ID và danh sách log; backend SHALL xác thực assignment và concert của từng vé trước khi ghi dữ liệu.

#### Scenario: Đồng bộ offline hợp lệ
- **WHEN** staff online trở lại và gửi các log của concert được phân công
- **THEN** backend SHALL ghi nhận các lượt hợp lệ bằng staff ID từ token
- **AND** SHALL trả số lượt sync và conflict

#### Scenario: Log chứa vé của concert khác
- **WHEN** một offline log tham chiếu vé không thuộc `concertId` trong request
- **THEN** backend SHALL không check-in vé đó
- **AND** SHALL ghi nhận conflict `WRONG_CONCERT`

### Requirement: Tất cả chức năng cổng vào dùng cùng RBAC
Tra cứu VIP, check-in VIP và thống kê check-in SHALL yêu cầu `CHECKIN_STAFF` có assignment cho concert liên quan.

#### Scenario: Tra cứu và check-in VIP được phép
- **WHEN** staff được phân công truy cập guest list hoặc check-in VIP của concert
- **THEN** backend SHALL xử lý request và ghi nhận staff từ token

#### Scenario: Xem thống kê concert không được phân công
- **WHEN** staff yêu cầu thống kê của concert không được phân công
- **THEN** backend SHALL trả `403`
- **AND** SHALL không trả dữ liệu vận hành của concert
