## ADDED Requirements

### Requirement: Quản lý email nhà tài trợ được phép gửi CSV
Hệ thống SHALL cho phép ban tổ chức cấu hình danh sách email nhà tài trợ được phép gửi file CSV khách mời VIP vào mailbox của TicketBox.

#### Scenario: Thêm email nhà tài trợ hợp lệ
- **WHEN** Ban tổ chức thêm một địa chỉ email nhà tài trợ vào danh sách cho phép
- **THEN** hệ thống SHALL lưu địa chỉ email đó ở trạng thái đang hoạt động
- **AND** worker import CSV SHALL chỉ xử lý file đính kèm từ các sender đang hoạt động trong danh sách cho phép

#### Scenario: Bỏ qua email từ sender không hợp lệ
- **WHEN** worker IMAP phát hiện email có file CSV nhưng sender không nằm trong danh sách cho phép
- **THEN** hệ thống SHALL không import file CSV đó
- **AND** hệ thống SHALL ghi nhận sự kiện bị bỏ qua để phục vụ audit

### Requirement: Đọc file CSV định kỳ từ mailbox IMAP
Hệ thống SHALL chạy tác vụ nền theo lịch để đăng nhập mailbox IMAP thật, tìm email mới có file CSV đính kèm và tạo job import cho các file hợp lệ.

#### Scenario: Phát hiện CSV hợp lệ trong mailbox
- **WHEN** cron worker chạy đến lịch đọc mailbox và phát hiện email mới từ sender hợp lệ có file CSV đính kèm
- **THEN** hệ thống SHALL lưu file CSV gốc vào MinIO
- **AND** hệ thống SHALL tạo import job trạng thái `PENDING` hoặc `PROCESSING`
- **AND** hệ thống SHALL đánh dấu message/attachment đã được phát hiện để tránh import trùng cùng một file

#### Scenario: Không có file CSV vào giờ chạy cron
- **WHEN** cron worker chạy đến lịch nhưng không tìm thấy file CSV hợp lệ nào từ các sponsor email đang hoạt động
- **THEN** hệ thống SHALL tạo import report trạng thái `NO_FILE`
- **AND** hệ thống SHALL tạo cảnh báo để ban tổ chức biết nhà tài trợ chưa gửi file đúng lịch

### Requirement: Validate cấu trúc CSV khách mời VIP
Hệ thống SHALL validate file CSV khách mời VIP theo cấu trúc `fullName,email,phone,company,eventCode,note` trước và trong quá trình import từng dòng.

#### Scenario: CSV có đầy đủ header bắt buộc
- **WHEN** worker bắt đầu import một file CSV có header `fullName,email,phone,company,eventCode,note`
- **THEN** hệ thống SHALL parse file CSV và xử lý từng dòng dữ liệu
- **AND** hệ thống SHALL map `eventCode` của từng dòng sang concert tương ứng

#### Scenario: CSV thiếu header bắt buộc
- **WHEN** worker nhận file CSV thiếu một trong các header `fullName`, `email`, `phone`, `company`, `eventCode` hoặc `note`
- **THEN** hệ thống SHALL không import file đó
- **AND** hệ thống SHALL chuyển import report sang `FAILED`
- **AND** hệ thống SHALL lưu lý do file sai cấu trúc

#### Scenario: Một dòng thiếu thông tin định danh khách
- **WHEN** một dòng CSV thiếu `fullName` hoặc thiếu cả `email` và `phone`
- **THEN** hệ thống SHALL đánh dấu dòng đó là lỗi
- **AND** hệ thống SHALL tiếp tục xử lý các dòng còn lại trong file

#### Scenario: Event code không tồn tại
- **WHEN** một dòng CSV có `eventCode` không map được sang concert nào
- **THEN** hệ thống SHALL đánh dấu dòng đó là lỗi `EVENT_CODE_NOT_FOUND`
- **AND** hệ thống SHALL không tạo khách mời VIP cho dòng đó

### Requirement: Chống trùng khách mời VIP khi import
Hệ thống SHALL chống trùng khách mời VIP theo concert bằng khóa `concertId + email` nếu có email, và fallback sang `concertId + phone` nếu dòng không có email.

#### Scenario: Dòng khách mời bị trùng email trong cùng concert
- **WHEN** file CSV chứa một khách mời có email đã tồn tại trong cùng concert
- **THEN** hệ thống SHALL bỏ qua dòng đó
- **AND** hệ thống SHALL tăng số lượng dòng trùng trong import report
- **AND** hệ thống SHALL không tạo e-ticket mới cho khách mời trùng

#### Scenario: Dòng khách mời bị trùng phone khi thiếu email
- **WHEN** file CSV chứa một khách mời không có email nhưng có số điện thoại đã tồn tại trong cùng concert
- **THEN** hệ thống SHALL bỏ qua dòng đó
- **AND** hệ thống SHALL tăng số lượng dòng trùng trong import report

#### Scenario: File gửi lại lần hai
- **WHEN** nhà tài trợ gửi lại file CSV có cùng danh sách khách mời đã được import trước đó
- **THEN** hệ thống SHALL nhận diện các dòng trùng
- **AND** hệ thống SHALL không tạo lại e-ticket cho các khách mời đã tồn tại
- **AND** import report SHALL thể hiện số dòng bị bỏ qua vì trùng

### Requirement: Tạo và gửi e-ticket cho khách mời VIP
Hệ thống SHALL tạo e-ticket QR cho mỗi khách mời VIP được import thành công và gửi e-ticket đó qua email cho khách.

#### Scenario: Import khách mời VIP có email hợp lệ
- **WHEN** một dòng CSV hợp lệ có email và không bị trùng
- **THEN** hệ thống SHALL tạo bản ghi khách mời VIP gắn với concert tương ứng
- **AND** hệ thống SHALL sinh QR token duy nhất cho khách mời đó
- **AND** hệ thống SHALL đưa job gửi e-ticket vào hàng đợi email

#### Scenario: Gửi e-ticket thành công
- **WHEN** email worker gửi e-ticket thành công cho khách mời VIP
- **THEN** hệ thống SHALL cập nhật trạng thái gửi email của khách mời là `SENT`
- **AND** import report SHALL ghi nhận số email đã gửi thành công

#### Scenario: Khách mời không có email
- **WHEN** một dòng CSV hợp lệ chỉ có phone nhưng không có email
- **THEN** hệ thống SHALL có thể lưu khách mời VIP để phục vụ kiểm tra thủ công
- **AND** hệ thống SHALL ghi nhận dòng đó là không gửi được e-ticket qua email trong import report

### Requirement: Báo cáo kết quả import CSV
Hệ thống SHALL lưu báo cáo kết quả cho mỗi lần import CSV để ban tổ chức biết số lượng bản ghi thành công, trùng, lỗi và email đã gửi.

#### Scenario: Import thành công toàn bộ
- **WHEN** worker xử lý một file CSV và tất cả dòng dữ liệu đều hợp lệ, không trùng và gửi email thành công
- **THEN** import report SHALL có trạng thái `SUCCESS`
- **AND** report SHALL lưu `totalRows`, `successRows`, `duplicateRows`, `errorRows` và `emailSentRows`

#### Scenario: Import thành công một phần
- **WHEN** worker xử lý một file CSV có cả dòng hợp lệ, dòng trùng hoặc dòng lỗi
- **THEN** import report SHALL có trạng thái `PARTIAL_SUCCESS`
- **AND** report SHALL lưu chi tiết lỗi theo từng dòng để ban tổ chức kiểm tra

#### Scenario: Import thất bại toàn bộ
- **WHEN** worker không thể parse file CSV hoặc file không có dòng hợp lệ nào
- **THEN** import report SHALL có trạng thái `FAILED`
- **AND** report SHALL lưu lỗi tổng quát và object key của file CSV gốc trong MinIO
