## 1. Database và Migration

- [x] 1.1 Thêm trường `eventCode` unique vào model `Concert` và cập nhật migration tương ứng.
- [x] 1.2 Tạo model lưu AI bio/job với các trường concert, object key PDF, raw text, cleaned text, generated bio, reviewed bio, published bio, status và error message.
- [x] 1.3 Tạo model quản lý sponsor email allowlist và phạm vi `eventCode` được phép gửi nếu cần.
- [x] 1.4 Tạo model `VipGuest` để lưu khách mời VIP, QR token, trạng thái gửi email và trạng thái check-in.
- [x] 1.5 Tạo model import report và row error để lưu kết quả xử lý CSV theo từng file và từng dòng.
- [x] 1.6 Cập nhật seed data để mỗi concert mẫu có `eventCode` dễ nhận diện.

## 2. Infrastructure và Environment

- [x] 2.1 Thêm MinIO service vào `docker-compose.yml` và cấu hình bucket dùng cho PDF/CSV/e-ticket assets.
- [x] 2.2 Bổ sung biến môi trường cho MinIO, Gemini API, IMAP mailbox và SMTP trong `.env.example`.
- [x] 2.3 Tạo shared object storage client dùng API S3-compatible để upload/download file từ MinIO.
- [x] 2.4 Tạo shared Gemini client gọi API thật và xử lý lỗi/rate limit ở mức service.
- [x] 2.5 Tạo shared IMAP mail client để đọc email mới và lấy attachment CSV từ mailbox demo.

## 3. AI Artist Bio Backend

- [x] 3.1 Tạo module AI Artist Bio gồm routes, controller, service và validation schema.
- [x] 3.2 Tạo API upload PDF cho một concert và lưu file vào MinIO.
- [x] 3.3 Khi upload thành công, tạo bản ghi AI bio trạng thái `UPLOADED` hoặc `PROCESSING` và enqueue job xử lý PDF.
- [x] 3.4 Tạo API xem trạng thái AI bio của concert, bao gồm trạng thái hiện tại và lỗi nếu có.
- [x] 3.5 Tạo API lưu nội dung bio đã được ban tổ chức chỉnh sửa và chuyển trạng thái sang `APPROVED`.
- [x] 3.6 Tạo API publish bio đã duyệt và đảm bảo chỉ bio `PUBLISHED` mới được trả cho khán giả.

## 4. AI Artist Bio Worker

- [x] 4.1 Tạo worker `ProcessArtistBioJob` đọc PDF từ MinIO.
- [x] 4.2 Trích xuất text từ PDF và chuẩn hóa/làm sạch nội dung trước khi gọi Gemini.
- [x] 4.3 Gọi Google Gemini API thật để sinh bio tiếng Việt ngắn gọn, dễ đọc.
- [x] 4.4 Lưu generated bio và chuyển trạng thái sang `AI_GENERATED` khi xử lý thành công.
- [x] 4.5 Chuyển trạng thái sang `FAILED` và lưu `errorMessage` khi PDF extraction hoặc Gemini API lỗi.

## 5. VIP Guest Sync Backend

- [x] 5.1 Tạo module VIP Guest Sync gồm routes, controller, service và validation schema.
- [x] 5.2 Tạo API quản lý sponsor email allowlist và trạng thái active/inactive.
- [x] 5.3 Tạo API xem danh sách import report, chi tiết report và lỗi từng dòng.
- [x] 5.4 Tạo service validate CSV header `fullName,email,phone,company,eventCode,note`.
- [x] 5.5 Tạo service map `eventCode` sang concert và validate từng dòng khách mời.
- [x] 5.6 Tạo service dedupe theo `concertId + email`, fallback `concertId + phone`.

## 6. VIP Guest Sync Workers

- [x] 6.1 Tạo cron worker đọc mailbox IMAP theo lịch ban đêm.
- [x] 6.2 Worker chỉ xử lý attachment CSV từ sponsor email đang active trong allowlist.
- [x] 6.3 Khi không có CSV hợp lệ ở thời điểm chạy cron, tạo import report `NO_FILE` và cảnh báo ban tổ chức.
- [x] 6.4 Khi phát hiện CSV hợp lệ, lưu file gốc vào MinIO và enqueue import job.
- [x] 6.5 Tạo import worker parse CSV, validate từng dòng, bỏ qua dòng trùng/lỗi và tiếp tục import dòng hợp lệ.
- [x] 6.6 Lưu import report `SUCCESS`, `PARTIAL_SUCCESS` hoặc `FAILED` cùng thống kê total/success/duplicate/error/email sent.
- [x] 6.7 Lưu chi tiết lỗi từng dòng gồm row number, raw data, error code và message.

## 7. VIP Guest E-Ticket và Check-in

- [x] 7.1 Sinh QR token duy nhất cho mỗi khách mời VIP import thành công.
- [x] 7.2 Enqueue job gửi email e-ticket VIP cho khách mời có email hợp lệ.
- [x] 7.3 Cập nhật trạng thái gửi email của khách mời sau khi email worker chạy.
- [x] 7.4 Bổ sung logic scan QR để nhận diện và check-in e-ticket khách mời VIP.
- [x] 7.5 Đảm bảo scan trùng hoặc QR VIP không hợp lệ trả lỗi rõ ràng.

## 8. Public Concert Data

- [x] 8.1 Cập nhật API chi tiết concert để trả về Artist Bio chỉ khi bio có trạng thái `PUBLISHED`.
- [x] 8.2 Đảm bảo bio ở trạng thái `UPLOADED`, `PROCESSING`, `AI_GENERATED`, `APPROVED` hoặc `FAILED` không hiển thị cho khán giả.
- [x] 8.3 Đảm bảo `eventCode` không làm lộ dữ liệu nhạy cảm và chỉ dùng để map import CSV.

## 9. Testing và Verification

- [ ] 9.1 Viết test/service check upload PDF tạo job AI bio đúng trạng thái.
- [ ] 9.2 Viết test worker xử lý Gemini thành công và lỗi.
- [ ] 9.3 Viết test CSV import cho các case hợp lệ, thiếu header, thiếu email/phone, eventCode sai và dòng trùng.
- [ ] 9.4 Viết test import report cho `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED` và `NO_FILE`.
- [ ] 9.5 Viết test sinh e-ticket VIP, gửi email queue và scan QR VIP.
- [x] 9.6 Chạy `openspec validate --all` và build/test backend sau khi triển khai.

## 10. Documentation

- [x] 10.1 Cập nhật README hướng dẫn cấu hình MinIO, Gemini API, IMAP và SMTP.
- [x] 10.2 Bổ sung ví dụ CSV khách mời VIP với header `fullName,email,phone,company,eventCode,note`.
- [x] 10.3 Bổ sung hướng dẫn demo luồng AI Artist Bio và VIP Guest Sync cho người chấm.
