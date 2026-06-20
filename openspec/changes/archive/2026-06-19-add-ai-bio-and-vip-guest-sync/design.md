## Context

TicketBox hiện đã có các capability nền tảng như concert listing, seat reservation, online payment, e-ticket và ticket scanning. Theo C4 Level 2 của nhóm, hai tích hợp còn thiếu nằm ở các container sau:

- **Admin Dashboard**: ban tổ chức upload PDF, duyệt bio, cấu hình email nhà tài trợ và xem báo cáo import.
- **Core Backend API**: nhận request quản trị, lưu trạng thái nghiệp vụ và cung cấp dữ liệu cho trang chi tiết concert.
- **Background Workers**: xử lý job trích xuất PDF, gọi Gemini, đọc IMAP, import CSV và gửi email.
- **Object Storage (MinIO/S3)**: lưu PDF nghệ sĩ, CSV gốc, CSV lỗi và file phục vụ audit.
- **Primary Database (PostgreSQL)**: lưu source of truth cho concert, bio, sponsor email, khách VIP, import report và e-ticket.
- **Message Queue (BullMQ on Redis)**: điều phối job nền.
- **Google Gemini API**: sinh bio tiếng Việt từ text đã làm sạch.
- **Máy chủ Email**: nguồn IMAP nhận CSV và kênh SMTP gửi e-ticket/cảnh báo.

Thiết kế này chỉ làm rõ backend, worker, data model và contract nghiệp vụ. UI chi tiết không thuộc phạm vi change này.

## Goals / Non-Goals

**Goals:**

- Bổ sung `eventCode` duy nhất cho mỗi concert để map CSV khách mời vào đúng sự kiện.
- Cho phép ban tổ chức upload PDF hồ sơ nghệ sĩ và theo dõi trạng thái xử lý.
- Tự động trích xuất/làm sạch nội dung PDF, gọi Gemini API thật và tạo bio tiếng Việt.
- Bắt buộc bio AI phải qua bước xem lại, chỉnh sửa và duyệt trước khi publish cho khán giả.
- Tự động đọc email IMAP từ mailbox demo, lấy CSV đính kèm từ sender hợp lệ và import khách mời VIP.
- Validate CSV theo từng dòng, bỏ qua dữ liệu trùng/lỗi nhưng không làm dừng toàn bộ file nếu còn dòng hợp lệ.
- Tạo e-ticket QR cho khách mời VIP import thành công và gửi email đến từng khách.
- Lưu báo cáo import đầy đủ để ban tổ chức biết kết quả và xử lý sự cố trước ngày diễn.
- Tạo cảnh báo khi đến lịch cron nhưng không có file CSV hợp lệ.
- Dùng MinIO local để mô phỏng object storage đúng theo C4 Diagram.

**Non-Goals:**

- Không xây dựng UI chi tiết cho admin trong change này.
- Không tích hợp OCR cho PDF scan dạng ảnh; chỉ hỗ trợ PDF có text extractable.
- Không xây dựng hệ thống email marketing hoặc template editor phức tạp.
- Không đồng bộ hai chiều với hệ thống nhà tài trợ.
- Không cho phép nhà tài trợ gọi API trực tiếp; nguồn dữ liệu chính là email CSV đính kèm.

## Decisions

### 1. Dùng `Concert.eventCode` unique để map CSV vào concert

**Quyết định:** Thêm trường `eventCode` duy nhất vào bảng `Concert`, ví dụ `ATSH-2026-HCM`.

**Lý do:** CSV đến từ hệ thống ngoài qua email, không có API và có thể chứa khách của nhiều sự kiện. `eventCode` giúp worker tự xác định concert mà không phụ thuộc hoàn toàn vào cấu hình "email sponsor này chỉ thuộc một concert".

**Ràng buộc:**

- `eventCode` MUST unique.
- Dòng CSV thiếu `eventCode` hoặc có `eventCode` không tồn tại SHALL bị ghi lỗi dòng.
- Sponsor email vẫn phải nằm trong allowlist. Nếu triển khai thêm phạm vi cho sponsor, hệ thống SHALL kiểm tra sender có quyền gửi cho `eventCode` đó.

### 2. AI Bio có vòng đời rõ ràng và không tự publish

**Quyết định:** Lưu AI bio theo vòng đời:

```text
UPLOADED -> PROCESSING -> AI_GENERATED -> APPROVED -> PUBLISHED
                         \-> FAILED
```

**Lý do:** Gemini có thể tạo nội dung sai, thiếu ngữ cảnh hoặc không phù hợp. Vì vậy AI chỉ tạo bản nháp. Ban tổ chức phải xem lại, chỉnh sửa và duyệt trước khi bio xuất hiện công khai.

**Hành vi chính:**

- Sau khi upload PDF, hệ thống tạo record bio/job trạng thái `UPLOADED` hoặc `PROCESSING`.
- Worker xử lý thành công thì lưu `generatedBio`, `cleanedText`, metadata và chuyển sang `AI_GENERATED`.
- Ban tổ chức có thể chỉnh sửa `reviewedBio`.
- Chỉ record `PUBLISHED` mới được trả về cho khán giả trên trang chi tiết concert.
- Khi Gemini/PDF extraction lỗi, trạng thái chuyển `FAILED` và lưu `errorMessage`.

### 3. Lưu file nguồn vào MinIO, lưu metadata và trạng thái trong PostgreSQL

**Quyết định:** MinIO lưu file nhị phân; PostgreSQL lưu đường dẫn object key, trạng thái, metadata và dữ liệu nghiệp vụ.

**Bucket đề xuất:**

- `artist-bio-source`: PDF press kit/hồ sơ nghệ sĩ.
- `vip-guest-imports`: CSV gốc, file lỗi và report phụ trợ.
- `ticket-assets`: QR/e-ticket nếu cần lưu file render sẵn.

**Retention đề xuất:**

- PDF press kit: giữ đến khi concert bị xóa hoặc được archive.
- CSV gốc và file lỗi: giữ 90 ngày để audit.
- Import log trong PostgreSQL: giữ lâu dài trong phạm vi đồ án.
- E-ticket/QR asset: giữ đến 30 ngày sau ngày diễn ra concert nếu có lưu file vật lý.

### 4. Worker xử lý bất đồng bộ qua queue

**Quyết định:** Core Backend API chỉ nhận request, lưu trạng thái và enqueue job; Background Workers xử lý tác vụ nặng.

**Job đề xuất:**

- `ProcessArtistBioJob`: nhận `artistBioId`, đọc PDF từ MinIO, extract text, làm sạch, gọi Gemini và lưu draft.
- `PollSponsorMailboxJob`: chạy theo cron ban đêm, đọc IMAP, phát hiện CSV đính kèm hợp lệ.
- `ImportVipGuestCsvJob`: parse CSV, validate từng dòng, dedupe, tạo guest pass/e-ticket và import report.
- `SendVipGuestTicketEmailJob`: gửi e-ticket đến từng khách mời VIP.
- `NotifyOrganizerJob`: gửi cảnh báo khi import lỗi hoặc không có file đúng lịch.

**Lý do:** PDF extraction, Gemini, IMAP và gửi email đều chậm/dễ lỗi. Đẩy vào worker giúp API không bị timeout và có thể retry.

### 5. CSV import tiếp tục khi có lỗi từng dòng

**Quyết định:** Import theo chiến lược best-effort trên từng dòng. File chỉ fail toàn bộ khi không parse được CSV, thiếu header bắt buộc hoặc không có dòng hợp lệ nào để xử lý.

**Header bắt buộc:**

```csv
fullName,email,phone,company,eventCode,note
```

**Quy tắc validate:**

- `fullName` bắt buộc.
- `eventCode` bắt buộc và phải map được sang concert.
- Ít nhất một trong `email` hoặc `phone` bắt buộc.
- `email` nếu có phải đúng định dạng email.
- Sender phải nằm trong sponsor email allowlist.
- Dedupe theo `concertId + email` nếu có email, fallback `concertId + phone`.

**Trạng thái import:**

```text
PENDING -> PROCESSING -> SUCCESS
                      -> PARTIAL_SUCCESS
                      -> FAILED
                      -> NO_FILE
```

### 6. Khách mời VIP nhận e-ticket qua email

**Quyết định:** Mỗi khách mời VIP import thành công được tạo một guest e-ticket có QR token riêng và được gửi qua email của khách.

**Lý do:** Yêu cầu của phần tích hợp là hệ thống xử lý CSV từ nhãn hàng và gửi e-ticket về mail cho từng khách mời. Việc dùng QR token cũng giúp nhân sự soát vé xác thực tại cổng VIP bằng cùng nguyên lý với e-ticket thường.

**Hành vi:**

- Nếu khách có email hợp lệ, hệ thống SHALL enqueue email e-ticket.
- Nếu khách chỉ có phone mà không có email, record vẫn có thể được lưu để check-in thủ công nhưng SHALL bị ghi vào report là không gửi được email.
- E-ticket VIP SHALL có loại/nguồn riêng để phân biệt với vé mua thường.

### 7. Báo cáo import là source of truth cho vận hành

**Quyết định:** Mỗi lần worker xử lý mailbox/file phải tạo import report.

**Thông tin chính:**

- `status`: `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `NO_FILE`.
- `senderEmail`, `mailboxMessageId`, `originalFileName`, `objectKey`.
- `totalRows`, `successRows`, `duplicateRows`, `errorRows`, `emailSentRows`.
- `startedAt`, `finishedAt`.
- Danh sách lỗi từng dòng: số dòng, raw data, error code, message.

**Lý do:** Ban tổ chức cần biết kết quả vào đêm trước ngày diễn. Nếu không có file hoặc có lỗi nhiều dòng, report/cảnh báo giúp xử lý kịp thời.

## Data Model Draft

### Concert

- Thêm `eventCode String @unique`.

### ArtistBio

- `id`
- `concertId`
- `sourcePdfObjectKey`
- `status`
- `rawText`
- `cleanedText`
- `generatedBio`
- `reviewedBio`
- `publishedBio`
- `errorMessage`
- `createdBy`
- `reviewedBy`
- `publishedAt`
- `createdAt`
- `updatedAt`

### SponsorEmail

- `id`
- `email`
- `displayName`
- `isActive`
- `allowedEventCodes` hoặc bảng nối với `Concert`
- `createdAt`
- `updatedAt`

### VipGuest

- `id`
- `concertId`
- `fullName`
- `email`
- `phone`
- `company`
- `note`
- `sourceImportId`
- `qrToken`
- `ticketStatus`
- `emailStatus`
- `checkedInAt`
- `createdAt`
- `updatedAt`

Unique index đề xuất:

- `(concertId, email)` khi email không null.
- `(concertId, phone)` khi phone không null.

### GuestImportJob

- `id`
- `status`
- `senderEmail`
- `mailboxMessageId`
- `originalFileName`
- `objectKey`
- `totalRows`
- `successRows`
- `duplicateRows`
- `errorRows`
- `emailSentRows`
- `errorMessage`
- `startedAt`
- `finishedAt`

### GuestImportRowError

- `id`
- `guestImportJobId`
- `rowNumber`
- `rawData`
- `errorCode`
- `message`

## Risks / Trade-offs

- **Gemini API lỗi hoặc rate limit** -> Worker retry có giới hạn, lưu trạng thái `FAILED`, giữ PDF nguồn để ban tổ chức chạy lại.
- **PDF là ảnh scan không có text** -> Ghi lỗi `PDF_TEXT_EXTRACTION_FAILED`; OCR nằm ngoài phạm vi change này.
- **CSV từ sponsor sai header hoặc encoding** -> Lưu file gốc, đánh `FAILED`, ghi lỗi rõ trong report.
- **Một số dòng CSV lỗi** -> Tiếp tục import dòng hợp lệ, trạng thái `PARTIAL_SUCCESS`.
- **File CSV gửi lại lần 2** -> Dedupe theo `concertId + email/phone`, không tạo e-ticket mới cho dòng trùng.
- **Không có file vào giờ cron** -> Tạo report `NO_FILE` và cảnh báo ban tổ chức.
- **Email khách mời không gửi được** -> Guest vẫn được lưu, email status là `FAILED`, report thể hiện số email gửi lỗi để có thể retry.
- **MinIO local khác S3 production** -> Chỉ dùng API S3-compatible để khi cần có thể thay MinIO bằng S3.
- **IMAP mailbox có nhiều file cũ** -> Lưu `mailboxMessageId` đã xử lý để không import lại cùng attachment.

## Implementation Alignment

### Queue và lịch chạy

- Hệ thống dùng BullMQ trên Redis cho AI bio, import CSV và email jobs; RabbitMQ không được dùng trong implementation hiện tại.
- `node-cron` kích hoạt tác vụ poll mailbox. Worker SHALL không mở poll mới khi lần poll trước chưa kết thúc.

### Quy tắc đọc mailbox IMAP

- Worker chỉ tìm email chưa đọc có attachment `.csv`; với Gmail, truy vấn giới hạn các email phù hợp trong 14 ngày gần nhất.
- Worker SHALL fetch xong metadata trước khi download attachment để tránh chạy lệnh IMAP lồng trong fetch iterator trên cùng connection.
- Attachment được download bằng sequence number; message chỉ được đánh dấu `Seen` sau khi download CSV thành công.
- Nếu kết nối hoặc đọc IMAP thất bại, hệ thống SHALL tạo report `FAILED`. `NO_FILE` chỉ được tạo khi mailbox được đọc thành công nhưng không có CSV hợp lệ.
- File đã xử lý được chống trùng theo `mailboxMessageId + originalFileName`.

### Trạng thái import và gửi email

- `SUCCESS`: tất cả dòng được import mới, không có dòng lỗi hoặc trùng.
- `PARTIAL_SUCCESS`: có ít nhất một dòng trùng hoặc lỗi, bao gồm trường hợp toàn bộ dòng đều trùng.
- `FAILED`: file sai cấu trúc/không parse được, toàn bộ dòng lỗi, sender không hợp lệ hoặc mailbox IMAP không đọc được.
- `NO_FILE`: poll mailbox thành công nhưng không tìm thấy attachment CSV hợp lệ.
- Import status được chốt sau bước import dữ liệu; gửi email diễn ra bất đồng bộ. Email thành công tăng `emailSentRows`; email thất bại cập nhật `VipGuest.emailStatus = FAILED` nhưng không rollback khách đã import và không đổi import status.

### Cấu hình tích hợp ngoài

- Gemini model được cấu hình qua `GEMINI_MODEL`; lỗi tạm thời 429/5xx được retry có giới hạn trước khi bio chuyển `FAILED`.
- SMTP SHALL dùng credential đúng với `SMTP_HOST`, và `SMTP_FROM` SHALL parse thành mailbox RFC hợp lệ. Với Gmail SMTP, sender dùng địa chỉ Gmail đã xác thực.
