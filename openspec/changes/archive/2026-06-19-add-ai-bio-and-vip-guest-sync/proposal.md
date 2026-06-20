## Why

Đề bài TicketBox yêu cầu hệ thống tích hợp AI để sinh giới thiệu nghệ sĩ từ hồ sơ PDF và đồng bộ danh sách khách mời VIP từ file CSV do nhà tài trợ gửi qua email. Hiện repo chưa có vòng đời xử lý cho AI bio, chưa có cơ chế duyệt trước khi publish, và chưa có quy trình import khách mời VIP có kiểm soát lỗi, chống trùng và báo cáo kết quả.

Hai tích hợp này nằm trực tiếp trong C4 Diagram của nhóm: Admin Dashboard, Core Backend API, Background Workers, Object Storage, Primary Database, Message Queue, Google Gemini API và Máy chủ Email.

## What Changes

- Thêm tính năng AI Artist Bio:
  - Ban tổ chức upload file PDF hồ sơ nghệ sĩ hoặc press kit cho từng concert.
  - Hệ thống lưu PDF vào MinIO, tạo job xử lý nền và hiển thị trạng thái xử lý.
  - Worker trích xuất text từ PDF, làm sạch nội dung và gọi Google Gemini API thật để sinh bio tiếng Việt.
  - Bio AI sinh ra chỉ được lưu ở dạng bản nháp cho ban tổ chức xem lại, chỉnh sửa và duyệt trước khi publish.
  - Khán giả chỉ nhìn thấy bio đã được publish trên trang chi tiết concert.
- Thêm tính năng VIP Guest Sync:
  - Ban tổ chức cấu hình danh sách email nhà tài trợ được phép gửi CSV.
  - Worker định kỳ đọc mailbox IMAP thật, lấy file CSV đính kèm từ sender hợp lệ.
  - CSV có cấu trúc `fullName,email,phone,company,eventCode,note`.
  - Hệ thống map `eventCode` sang concert, validate từng dòng, bỏ qua dòng trùng và tiếp tục import các dòng hợp lệ.
  - Hệ thống tạo e-ticket cho khách mời VIP được import thành công và gửi email e-ticket đến từng khách.
  - Hệ thống lưu báo cáo import, gồm số dòng thành công, số dòng trùng, số dòng lỗi và trạng thái khi không có file.
- Thêm mã sự kiện `eventCode` duy nhất cho concert để nhận diện concert từ CSV của nhà tài trợ.
- Thêm MinIO làm object storage local cho PDF, CSV gốc, CSV lỗi và các file phục vụ audit.

## Capabilities

### New Capabilities

- `ai-artist-bio`: Quản lý luồng upload PDF hồ sơ nghệ sĩ, xử lý AI bằng Gemini, lưu draft bio, duyệt/chỉnh sửa và publish bio tiếng Việt.
- `vip-guest-sync`: Quản lý email nhà tài trợ, đọc CSV từ IMAP, import khách mời VIP theo `eventCode`, chống trùng, gửi e-ticket và lưu báo cáo import.

### Modified Capabilities

- `concert-listing`: Bổ sung yêu cầu trang chi tiết concert chỉ hiển thị Artist Bio đã được publish và concert có `eventCode` duy nhất để phục vụ tích hợp CSV khách mời.
- `e-ticket`: Bổ sung yêu cầu sinh và gửi e-ticket qua email cho khách mời VIP được import thành công từ CSV.
- `ticket-scanning`: Bổ sung yêu cầu mã QR của khách mời VIP có thể được xác thực tại cổng VIP như một loại e-ticket hợp lệ.

## Impact

- Backend:
  - Thêm module AI Artist Bio, module VIP Guest Sync và các worker xử lý nền.
  - Thêm API cho upload PDF, xem trạng thái bio, duyệt/chỉnh sửa/publish bio, quản lý sponsor email và xem import report.
  - Tích hợp Google Gemini API thật, IMAP thật, SMTP gửi e-ticket và MinIO object storage.
- Database:
  - Bổ sung `Concert.eventCode`.
  - Bổ sung bảng lưu AI bio/job, sponsor email allowlist, VIP guest, import job/report và lỗi từng dòng.
- Infrastructure:
  - Bổ sung MinIO vào môi trường local.
  - Bổ sung biến môi trường cho Gemini, MinIO, IMAP và SMTP.
- Frontend:
  - Chỉ cần các điểm hiển thị/truy cập dữ liệu tối thiểu cho admin và trang chi tiết concert ở giai đoạn triển khai; không thiết kế UI chi tiết trong change này.
