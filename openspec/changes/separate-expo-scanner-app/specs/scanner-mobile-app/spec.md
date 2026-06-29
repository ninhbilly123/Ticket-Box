## ADDED Requirements

### Requirement: Expo React Native Scanner App
Hệ thống SHALL cung cấp một ứng dụng mobile riêng trong workspace `scanner-app/` dùng Expo React Native để nhân viên soát vé thao tác tại cổng bằng điện thoại.

#### Scenario: Nhân viên mở app scanner
- **WHEN** nhân viên soát vé cần vận hành tại cổng
- **THEN** nhân viên SHALL dùng Scanner App thay vì admin web
- **AND** app SHALL chạy được trên điện thoại Android trong quá trình demo.

#### Scenario: Role không hợp lệ mở app
- **WHEN** user đăng nhập Scanner App nhưng không có role `CHECKIN_STAFF`
- **THEN** app SHALL từ chối vào màn hình quét
- **AND** app SHALL hiển thị thông báo không có quyền soát vé.

### Requirement: Staff Assignment Selection
Scanner App SHALL chỉ hiển thị các concert và gate mà nhân viên hiện tại được phân công.

#### Scenario: Nhân viên có phân công
- **WHEN** nhân viên đăng nhập thành công
- **THEN** app SHALL gọi API lấy danh sách concert/gate được phân công
- **AND** app SHALL cho nhân viên chọn một concert/gate trước khi quét.

#### Scenario: Nhân viên chưa được phân công
- **WHEN** nhân viên đăng nhập nhưng không có `StaffAssignment`
- **THEN** app SHALL không mở camera quét
- **AND** app SHALL hiển thị trạng thái chưa được phân công.

### Requirement: Mobile QR Scan and Manual Entry
Scanner App SHALL hỗ trợ quét QR bằng camera điện thoại và nhập mã thủ công.

#### Scenario: Quét QR online
- **WHEN** nhân viên quét QR trong trạng thái có mạng
- **THEN** app SHALL gửi token lên API check-in kèm Bearer token, `concertId`, `gateId`, `deviceId`, `scannedAtLocal`
- **AND** app SHALL hiển thị kết quả trả về từ backend.

#### Scenario: Camera không dùng được
- **WHEN** camera không được cấp quyền hoặc không quét được QR
- **THEN** app SHALL cho phép nhân viên nhập mã vé thủ công
- **AND** app SHALL xử lý kết quả giống luồng quét QR.

### Requirement: Offline Check-in Queue
Scanner App SHALL lưu lượt quét vào hàng đợi cục bộ khi không có mạng và đồng bộ lại khi có mạng.

#### Scenario: Quét khi mất mạng
- **WHEN** app không kết nối được backend tại thời điểm quét
- **THEN** app SHALL lưu lượt quét vào offline queue với `syncStatus` là `PENDING`
- **AND** app SHALL hiển thị rằng lượt quét mới chỉ được lưu tạm, chưa xác nhận hợp lệ.

#### Scenario: Đồng bộ lại khi có mạng
- **WHEN** app có mạng trở lại và offline queue có record `PENDING`
- **THEN** app SHALL đồng bộ các lượt quét theo thứ tự `scannedAtLocal`
- **AND** app SHALL cập nhật từng record thành `SYNCED`, `CONFLICT` hoặc `FAILED`.

#### Scenario: Có xung đột khi sync
- **WHEN** backend trả `ALREADY_USED`, `WRONG_CONCERT`, `WRONG_DATE`, `INVALID_TICKET` hoặc `CANCELLED` cho một lượt quét offline
- **THEN** app SHALL lưu record đó là `CONFLICT`
- **AND** app SHALL cho nhân viên xem lý do xung đột.

### Requirement: APK Build
Scanner App SHALL có cấu hình build Android APK phục vụ demo và cài đặt trên thiết bị thật.

#### Scenario: Build APK demo
- **WHEN** developer chạy lệnh build APK theo tài liệu của repo
- **THEN** hệ thống SHALL tạo được file APK Android hoặc cung cấp link artifact từ EAS Build
- **AND** APK SHALL kết nối được backend demo thông qua API base URL đã cấu hình.
