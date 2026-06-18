## ADDED Requirements

### Requirement: Upload PDF hồ sơ nghệ sĩ
Hệ thống SHALL cho phép ban tổ chức upload file PDF hồ sơ nghệ sĩ hoặc press kit cho một concert cụ thể. File PDF SHALL được lưu vào object storage và hệ thống SHALL tạo bản ghi xử lý AI bio có trạng thái ban đầu để ban tổ chức theo dõi.

#### Scenario: Upload PDF hợp lệ
- **WHEN** Ban tổ chức upload file PDF hợp lệ cho một concert tồn tại
- **THEN** hệ thống SHALL lưu file PDF vào MinIO
- **AND** hệ thống SHALL tạo bản ghi AI bio gắn với concert đó
- **AND** trạng thái xử lý SHALL là `UPLOADED` hoặc `PROCESSING`
- **AND** hệ thống SHALL đưa job xử lý PDF vào hàng đợi nền

#### Scenario: Upload file không phải PDF
- **WHEN** Ban tổ chức upload file không có định dạng PDF
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi cho biết chỉ chấp nhận file PDF

### Requirement: Trích xuất và làm sạch nội dung PDF
Hệ thống SHALL tự động xử lý file PDF đã upload để trích xuất văn bản thô và làm sạch nội dung trước khi gửi sang mô hình AI.

#### Scenario: Trích xuất nội dung thành công
- **WHEN** worker nhận job xử lý AI bio từ hàng đợi
- **THEN** worker SHALL đọc file PDF từ MinIO
- **AND** worker SHALL trích xuất văn bản thô từ PDF
- **AND** worker SHALL làm sạch các ký tự thừa, dòng trống và nội dung nhiễu trước khi gọi AI

#### Scenario: PDF không trích xuất được text
- **WHEN** worker không thể trích xuất nội dung text từ PDF
- **THEN** hệ thống SHALL chuyển trạng thái AI bio sang `FAILED`
- **AND** hệ thống SHALL lưu thông tin lỗi để ban tổ chức biết nguyên nhân xử lý thất bại

### Requirement: Tạo bio tiếng Việt bằng Gemini API
Hệ thống SHALL gửi nội dung đã làm sạch sang Google Gemini API thật để sinh bản giới thiệu nghệ sĩ bằng tiếng Việt, ngắn gọn, dễ đọc và phù hợp để hiển thị trên trang chi tiết concert.

#### Scenario: Gemini tạo bio thành công
- **WHEN** worker có văn bản đã làm sạch từ PDF
- **THEN** worker SHALL gọi Google Gemini API thật với prompt yêu cầu sinh bio bằng tiếng Việt
- **AND** hệ thống SHALL lưu bio AI tạo ra vào trường bản nháp
- **AND** trạng thái xử lý SHALL chuyển sang `AI_GENERATED`

#### Scenario: Gemini API lỗi
- **WHEN** Google Gemini API trả lỗi hoặc quá thời gian chờ
- **THEN** hệ thống SHALL không publish bất kỳ bio nào cho khán giả
- **AND** hệ thống SHALL chuyển trạng thái xử lý sang `FAILED`
- **AND** hệ thống SHALL lưu thông tin lỗi để ban tổ chức có thể chạy lại hoặc upload lại PDF

### Requirement: Duyệt và chỉnh sửa bio trước khi publish
Hệ thống SHALL bắt buộc ban tổ chức xem lại, chỉnh sửa nếu cần và duyệt bio AI tạo ra trước khi bio được hiển thị công khai cho khán giả.

#### Scenario: Ban tổ chức chỉnh sửa và duyệt bio
- **WHEN** AI bio đang ở trạng thái `AI_GENERATED` và ban tổ chức gửi nội dung bio đã chỉnh sửa để duyệt
- **THEN** hệ thống SHALL lưu nội dung đã được duyệt
- **AND** trạng thái SHALL chuyển sang `APPROVED`
- **AND** bio SHALL chưa hiển thị công khai cho đến khi được publish

#### Scenario: Publish bio đã duyệt
- **WHEN** Ban tổ chức publish một bio đang ở trạng thái `APPROVED`
- **THEN** hệ thống SHALL chuyển trạng thái bio sang `PUBLISHED`
- **AND** trang chi tiết concert SHALL có thể hiển thị bio đã publish cho khán giả

#### Scenario: Không cho publish bio chưa duyệt
- **WHEN** Ban tổ chức hoặc hệ thống cố publish một bio chưa ở trạng thái `APPROVED`
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL không hiển thị bio đó cho khán giả

### Requirement: Theo dõi trạng thái xử lý AI bio
Hệ thống SHALL cung cấp trạng thái xử lý AI bio để ban tổ chức biết file đang được xử lý, đã hoàn tất hay gặp lỗi.

#### Scenario: Ban tổ chức xem trạng thái xử lý
- **WHEN** Ban tổ chức xem thông tin AI bio của một concert
- **THEN** hệ thống SHALL trả về trạng thái hiện tại của AI bio
- **AND** trạng thái SHALL phản ánh một trong các giai đoạn `UPLOADED`, `PROCESSING`, `AI_GENERATED`, `APPROVED`, `PUBLISHED` hoặc `FAILED`

#### Scenario: Xem thông tin lỗi khi xử lý thất bại
- **WHEN** AI bio có trạng thái `FAILED`
- **THEN** hệ thống SHALL trả về thông điệp lỗi đã lưu
- **AND** hệ thống SHALL giữ lại file PDF nguồn để ban tổ chức có thể kiểm tra hoặc chạy lại quy trình
