## ADDED Requirements

### Requirement: Quản lý email nhãn hàng từ admin frontend
Admin frontend SHALL cho phép organizer xem và quản lý danh sách sponsor email mà VIP Guest Sync được phép xử lý.

#### Scenario: Xem danh sách email nhãn hàng
- **WHEN** organizer mở tab Email nhãn hàng
- **THEN** UI SHALL tải danh sách sponsor email
- **AND** UI SHALL hiển thị email, tên hiển thị, trạng thái và các `allowedEventCodes`

#### Scenario: Thêm email nhãn hàng
- **WHEN** organizer nhập email hợp lệ, tên hiển thị và các event code được phép rồi submit
- **THEN** UI SHALL gọi API tạo sponsor email
- **AND** danh sách SHALL hiển thị bản ghi vừa tạo khi request thành công

#### Scenario: Email không hợp lệ
- **WHEN** organizer nhập địa chỉ email sai định dạng
- **THEN** UI SHALL chặn submit
- **AND** UI SHALL hiển thị lỗi validation tại trường email

### Requirement: Cấu hình phạm vi eventCode cho email nhãn hàng
Admin frontend SHALL cho phép organizer chọn `allowedEventCodes` từ các concert có trong dashboard và gửi đúng mảng mã sự kiện cho backend.

#### Scenario: Giới hạn sponsor theo concert
- **WHEN** organizer chọn một hoặc nhiều concert cho sponsor
- **THEN** UI SHALL lưu các `eventCode` tương ứng vào `allowedEventCodes`
- **AND** UI SHALL hiển thị các mã đã chọn trong danh sách sponsor

#### Scenario: Không chọn eventCode
- **WHEN** organizer lưu sponsor với danh sách `allowedEventCodes` rỗng
- **THEN** UI SHALL gửi mảng rỗng theo contract backend
- **AND** UI SHALL thể hiện phạm vi là tất cả event code theo quy tắc backend hiện tại

### Requirement: Kích hoạt và vô hiệu hóa email nhãn hàng
Admin frontend SHALL cho phép organizer thay đổi `isActive` của sponsor email mà không xóa bản ghi.

#### Scenario: Vô hiệu hóa sponsor
- **WHEN** organizer tắt trạng thái một sponsor đang active
- **THEN** UI SHALL gọi API update với `isActive: false`
- **AND** badge trạng thái SHALL đổi thành inactive khi request thành công

#### Scenario: Update sponsor thất bại
- **WHEN** backend từ chối hoặc không thể update sponsor
- **THEN** UI SHALL trả toggle về trạng thái trước
- **AND** UI SHALL hiển thị thông điệp lỗi

### Requirement: Xem danh sách báo cáo VIP Sync
Admin frontend SHALL hiển thị các import report theo thứ tự mới nhất trước cùng trạng thái và số liệu tổng hợp.

#### Scenario: Hiển thị report đã xử lý
- **WHEN** organizer mở tab VIP Sync và API trả danh sách report
- **THEN** UI SHALL hiển thị thời gian, sender, tên file, trạng thái, `totalRows`, `successRows`, `duplicateRows`, `errorRows` và `emailSentRows`

#### Scenario: Không có file CSV
- **WHEN** report có trạng thái `NO_FILE`
- **THEN** UI SHALL hiển thị badge/cảnh báo phân biệt với lỗi hệ thống
- **AND** UI SHALL hiển thị `errorMessage` nếu backend cung cấp

#### Scenario: Mailbox hoặc import thất bại
- **WHEN** report có trạng thái `FAILED`
- **THEN** UI SHALL hiển thị trạng thái lỗi và thông điệp nguyên nhân
- **AND** UI SHALL không mô tả trường hợp đó như `NO_FILE`

### Requirement: Xem chi tiết báo cáo VIP Sync
Admin frontend SHALL tải và hiển thị chi tiết một report khi organizer chọn report đó.

#### Scenario: Xem lỗi từng dòng
- **WHEN** report có `rowErrors`
- **THEN** UI SHALL hiển thị số dòng, mã lỗi, thông điệp và dữ liệu thô của từng lỗi trong vùng chi tiết

#### Scenario: Xem khách đã import
- **WHEN** report có danh sách `vipGuests`
- **THEN** UI SHALL hiển thị tên, email/phone, company, trạng thái vé và trạng thái gửi email của từng khách
- **AND** lỗi SMTP của khách SHALL được hiển thị khi `emailStatus` là `FAILED`

#### Scenario: Report chưa hoàn tất
- **WHEN** report có trạng thái `PENDING` hoặc `PROCESSING`
- **THEN** UI SHALL thể hiện report đang chạy
- **AND** các bộ đếm chưa hoàn tất SHALL không bị trình bày như kết quả cuối cùng

### Requirement: Sponsor và report dùng đúng API được bảo vệ
Admin frontend SHALL gửi bearer token cho mọi request sponsor email và VIP import report, đồng thời SHALL dừng tải dữ liệu khi session không còn hợp lệ.

#### Scenario: Access token hết hạn
- **WHEN** API sponsor hoặc report trả lỗi xác thực
- **THEN** UI SHALL hiển thị lỗi session theo cơ chế hiện tại
- **AND** UI SHALL không tiếp tục polling hoặc retry vô hạn
