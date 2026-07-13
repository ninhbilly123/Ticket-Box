## ADDED Requirements

### Requirement: Admin frontend sử dụng tiếng Việt thống nhất
Admin frontend SHALL hiển thị tiếng Việt cho toàn bộ nội dung tĩnh do frontend sở hữu, bao gồm đăng nhập, điều hướng, tiêu đề, nhãn biểu mẫu, bảng, nút, tooltip, trạng thái tải/rỗng và thông báo do UI tạo.

#### Scenario: Ban tổ chức sử dụng dashboard
- **WHEN** tài khoản ban tổ chức đăng nhập và chuyển qua các tab quản trị
- **THEN** tên tab, tiêu đề, trường nhập, thao tác và phản hồi UI SHALL được hiển thị bằng tiếng Việt
- **AND** cùng một khái niệm SHALL dùng cùng thuật ngữ trên các màn hình

#### Scenario: Nhân viên sử dụng workspace soát vé
- **WHEN** tài khoản nhân viên soát vé đăng nhập
- **THEN** hướng dẫn, nút thao tác, trạng thái kết nối và nội dung bảng SHALL dùng tiếng Việt

### Requirement: Role và status có nhãn tiếng Việt
UI SHALL chuyển role/status kỹ thuật từ API thành nhãn tiếng Việt khi hiển thị, nhưng SHALL giữ nguyên giá trị gốc trong logic, request và response.

#### Scenario: Hiển thị role người dùng
- **WHEN** API trả role `ORGANIZER`, `CHECKIN_STAFF` hoặc `AUDIENCE`
- **THEN** UI SHALL hiển thị lần lượt `Ban tổ chức`, `Nhân viên soát vé` hoặc `Khán giả`

#### Scenario: Hiển thị trạng thái nghiệp vụ
- **WHEN** API trả một status đã được hỗ trợ như `DRAFT`, `PUBLISHED`, `PROCESSING`, `FAILED` hoặc `PARTIAL_SUCCESS`
- **THEN** badge và thông tin chi tiết SHALL hiển thị nhãn tiếng Việt tương ứng
- **AND** màu sắc cùng logic trạng thái SHALL không thay đổi

#### Scenario: Nhận trạng thái mới chưa được ánh xạ
- **WHEN** API trả một status chưa có trong bảng nhãn
- **THEN** UI SHALL hiển thị giá trị gốc thay vì để trống hoặc báo lỗi render

### Requirement: Thuật ngữ kỹ thuật được giữ đúng ngữ cảnh
UI SHALL giữ nguyên tên thương hiệu, chữ viết tắt và mã kỹ thuật cần đối chiếu, nhưng câu, nhãn và thao tác bao quanh SHALL dùng tiếng Việt.

#### Scenario: Hiển thị trường hoặc thao tác kỹ thuật
- **WHEN** UI hiển thị TicketBox, API, AI, VIP, PDF, CSV, SVG, QR, UUID, eventCode hoặc zoneCode
- **THEN** thuật ngữ kỹ thuật SHALL được giữ nguyên
- **AND** phần mô tả hoặc động từ xung quanh SHALL dùng tiếng Việt

### Requirement: Chuẩn hóa ngôn ngữ không thay đổi nghiệp vụ
Việc thay nhãn hiển thị SHALL không thay đổi route, RBAC, payload API, validation, trạng thái lưu trong database hoặc hành vi thao tác.

#### Scenario: Thực hiện thao tác sau khi đổi nhãn
- **WHEN** người dùng bấm một thao tác đã được đổi sang nhãn tiếng Việt
- **THEN** UI SHALL gọi cùng API và gửi cùng giá trị kỹ thuật như trước thay đổi
