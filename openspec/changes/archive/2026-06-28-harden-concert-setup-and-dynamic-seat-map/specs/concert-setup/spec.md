## ADDED Requirements

### Requirement: Concert được cấu hình theo vòng đời bản nháp
Hệ thống SHALL tạo concert ở trạng thái `DRAFT` và SHALL chỉ cho phép công khai concert sau khi backend xác nhận toàn bộ điều kiện readiness bắt buộc.

#### Scenario: Tạo concert hợp lệ
- **WHEN** ban tổ chức gửi event code duy nhất, tên, địa điểm và ngày giờ hợp lệ
- **THEN** hệ thống SHALL tạo concert ở trạng thái `DRAFT`
- **AND** concert SHALL chưa xuất hiện trong API công khai

#### Scenario: Lịch concert không hợp lệ
- **WHEN** ngày mở bán không trước ngày biểu diễn hoặc ngày giờ không thể phân tích
- **THEN** hệ thống SHALL từ chối tạo hoặc cập nhật concert
- **AND** SHALL trả lỗi validation xác định trường không hợp lệ

### Requirement: Readiness check là nguồn quyết định publish
Hệ thống SHALL cung cấp readiness check cho concert và SHALL đánh giá lại cùng bộ quy tắc trong thao tác publish.

#### Scenario: Concert đủ điều kiện publish
- **WHEN** concert có thông tin và lịch hợp lệ, ít nhất một nghệ sĩ, ít nhất một loại vé active có tồn kho dương, zone code hợp lệ và sơ đồ hợp lệ nếu được bật
- **THEN** readiness SHALL trả `ready = true`
- **AND** publish SHALL chuyển concert từ `DRAFT` sang `PUBLISHED`

#### Scenario: Concert chưa đủ điều kiện publish
- **WHEN** một hoặc nhiều điều kiện bắt buộc chưa đạt
- **THEN** readiness SHALL trả `ready = false` cùng từng check lỗi
- **AND** endpoint publish SHALL từ chối thay đổi trạng thái

#### Scenario: Cấu hình tùy chọn chưa hoàn tất
- **WHEN** concert chưa có Artist Bio được publish hoặc chưa phân công nhân viên soát vé
- **THEN** readiness MAY trả warning
- **AND** các warning này SHALL không chặn publish

### Requirement: Quản lý nghệ sĩ của concert
Ban tổ chức SHALL có thể gắn và gỡ nghệ sĩ khi concert còn `DRAFT`, và concert SHALL có ít nhất một nghệ sĩ trước publish.

#### Scenario: Gắn nghệ sĩ theo tên
- **WHEN** ban tổ chức nhập tên nghệ sĩ cho một concert `DRAFT`
- **THEN** hệ thống SHALL tái sử dụng nghệ sĩ cùng tên nếu đã tồn tại hoặc tạo nghệ sĩ mới
- **AND** SHALL tạo quan hệ giữa nghệ sĩ và concert mà không tạo quan hệ trùng

#### Scenario: Thử sửa nghệ sĩ sau publish
- **WHEN** ban tổ chức gắn hoặc gỡ nghệ sĩ của concert không còn `DRAFT`
- **THEN** hệ thống SHALL từ chối yêu cầu

### Requirement: Hạn chế thay đổi cấu hình thương mại sau publish
Hệ thống SHALL khóa các thuộc tính ảnh hưởng đến định danh concert, lịch bán, khu vực và giá vé sau publish; mô tả và tồn kho SHALL tiếp tục được cập nhật theo quy tắc an toàn.

#### Scenario: Sửa cấu hình thương mại sau publish
- **WHEN** ban tổ chức cố đổi event code, ngày diễn, địa điểm, chế độ sơ đồ, nghệ sĩ, tên/zone/giá/cửa sổ bán loại vé của concert đã publish
- **THEN** hệ thống SHALL từ chối thay đổi

#### Scenario: Sửa mô tả hoặc tăng tồn kho sau publish
- **WHEN** ban tổ chức cập nhật mô tả hoặc điều chỉnh tồn kho không thấp hơn tổng số vé đã giữ và đã bán
- **THEN** hệ thống SHALL chấp nhận thay đổi

### Requirement: Admin hiển thị tiến độ cấu hình concert
Admin frontend SHALL hiển thị các bước cấu hình, readiness checklist và chỉ cung cấp thao tác publish khả dụng khi concert được backend xác nhận sẵn sàng.

#### Scenario: Chọn concert bản nháp
- **WHEN** ban tổ chức chọn một concert `DRAFT`
- **THEN** UI SHALL hiển thị thông tin cơ bản, nghệ sĩ, loại vé, cấu hình sơ đồ và từng readiness check
- **AND** SHALL cung cấp đường dẫn thao tác để hoàn tất các mục còn thiếu

#### Scenario: Publish từ admin
- **WHEN** readiness trả `ready = true` và ban tổ chức bấm Publish
- **THEN** UI SHALL gọi endpoint publish
- **AND** SHALL tải lại trạng thái concert cùng checklist sau khi thành công
