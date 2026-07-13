# TicketBox - Project Proposal

## 1. Vấn đề

Các đêm nhạc, concert và sự kiện giải trí thường có lượng người mua vé tăng đột biến trong thời gian rất ngắn, đặc biệt là vài phút đầu mở bán. Nếu ban tổ chức xử lý bán vé bằng các kênh thủ công như Google Form, Zalo OA, inbox fanpage, chuyển khoản ngân hàng hoặc file Excel nội bộ, quy trình rất dễ bị quá tải, sai sót và thiếu minh bạch.

Các vấn đề chính cần giải quyết gồm:

### 1.1. Quy trình bán vé thủ công không còn đủ tin cậy

Khi số lượng người mua ít, ban tổ chức có thể dùng Google Form để thu thông tin, sau đó đối chiếu chuyển khoản và gửi vé thủ công qua email hoặc tin nhắn. Tuy nhiên, khi lượng người mua tăng lên hàng nghìn hoặc hàng chục nghìn người, cách làm này phát sinh nhiều rủi ro:

- Người mua đã chuyển khoản nhưng ban tổ chức chưa kịp xác nhận.
- Nhiều người cùng chọn một loại vé trong khi số lượng còn lại không được cập nhật tức thời.
- Dữ liệu khách hàng nằm rải rác ở nhiều nơi: form, email, file Excel, tin nhắn.
- Nhân sự vận hành phải xử lý thủ công nên dễ nhập sai email, số điện thoại, loại vé hoặc trạng thái thanh toán.
- Người mua không biết đơn hàng của mình đang ở trạng thái nào: đang giữ vé, đã thanh toán, thanh toán lỗi hay đã được phát vé.

Điều này làm giảm trải nghiệm khách hàng và tạo áp lực lớn cho ban tổ chức trong thời điểm mở bán.

### 1.2. Tải truy cập tăng đột biến làm hệ thống dễ sập

Với các concert có nghệ sĩ nổi tiếng, số lượng người truy cập có thể tăng rất nhanh ngay khi mở bán. Nếu hệ thống không có cơ chế kiểm soát tải, các lỗi thường gặp gồm:

- Website phản hồi chậm hoặc không truy cập được.
- Người dùng bị treo ở bước đặt vé.
- Một số request thanh toán bị gửi nhiều lần.
- Vé bị giữ quá lâu dù người mua không hoàn tất thanh toán.
- Tồn kho vé bị sai lệch do nhiều người đặt cùng lúc.

Hậu quả nghiêm trọng là người mua bị trừ tiền nhưng không nhận được vé, hoặc hệ thống ghi nhận sai số lượng vé còn lại.

### 1.3. Tranh chấp vé và lỗi tồn kho khi nhiều người đặt cùng lúc

Vé concert của nhóm không có số ghế cố định. Mỗi vé chỉ thuộc một loại vé hoặc khu vực, ví dụ VIP, VVIP, GA, Zone A, Zone B. Khán giả trong cùng khu vực sẽ đến trước ngồi trước. Vì vậy hệ thống không cần quản lý `seat_number`, nhưng vẫn phải quản lý chính xác số lượng vé theo từng loại vé.

Nếu không có cơ chế giữ vé tạm thời và khóa tồn kho đúng cách, có thể xảy ra:

- Hai người cùng mua được vé cuối cùng của một loại vé.
- Vé đã hết nhưng frontend vẫn hiển thị còn vé.
- Đơn hàng chưa thanh toán vẫn chiếm tồn kho vĩnh viễn.
- Ban tổ chức không biết chính xác đã bán bao nhiêu vé theo từng loại.

Do đó, bài toán chính không phải là chọn từng ghế cụ thể, mà là đảm bảo tồn kho theo loại vé/khu vực luôn chính xác.

### 1.4. Thanh toán online cần đồng bộ với trạng thái đơn hàng

Khi tích hợp cổng thanh toán như VNPAY hoặc MoMo, hệ thống phải xử lý các tình huống thực tế:

- Người dùng thanh toán thành công.
- Người dùng hủy thanh toán.
- Cổng thanh toán phản hồi chậm.
- Webhook/IPN gửi lại nhiều lần.
- Người dùng mở nhiều tab và gửi nhiều request thanh toán.
- Thanh toán thành công nhưng quá trình phát hành vé bị lỗi.

Nếu không thiết kế cẩn thận, hệ thống có thể ghi nhận sai trạng thái đơn hàng, phát hành vé trùng hoặc không phát hành vé dù đã thanh toán.

### 1.5. E-ticket QR cần được phát hành và soát vé an toàn

Sau khi thanh toán thành công, người mua cần nhận e-ticket qua email. E-ticket có QR để nhân viên soát vé quét tại cổng. Nếu QR chỉ là mã đơn giản, người dùng có thể chụp màn hình, gửi cho người khác hoặc bị quét nhiều lần.

Hệ thống cần đảm bảo:

- Mỗi vé có QR/token riêng.
- Vé chỉ check-in thành công một lần.
- Nếu hai thiết bị quét cùng lúc, chỉ một lượt được tính hợp lệ.
- Nhân viên chỉ được soát vé cho concert/gate đã được phân công.
- Có thể xử lý trường hợp mất mạng tại cổng.

Vì bối cảnh soát vé diễn ra tại cổng bằng điện thoại, việc dùng chung admin web để quét là không phù hợp. Nhân viên cần một Scanner App riêng trên mobile.

### 1.6. Ban tổ chức cần công cụ quản lý nội dung concert hiệu quả

Trang chi tiết concert cần có phần giới thiệu nghệ sĩ hoặc đêm nhạc. Trong thực tế, ban tổ chức thường có sẵn press kit hoặc hồ sơ nghệ sĩ dạng PDF. Nếu nhập thủ công toàn bộ nội dung này sẽ mất thời gian và không nhất quán.

Hệ thống cần hỗ trợ:

- Tải PDF hồ sơ nghệ sĩ.
- Trích xuất và làm sạch nội dung.
- Gửi nội dung sang AI để tạo bio ngắn gọn, dễ đọc.
- Cho ban tổ chức xem lại, chỉnh sửa và duyệt trước khi publish.
- Có trạng thái xử lý rõ ràng: đang xử lý, hoàn tất, lỗi.

Điểm quan trọng là bio do AI tạo không được tự động hiển thị công khai nếu chưa được ban tổ chức duyệt.

### 1.7. Danh sách khách mời VIP từ nhà tài trợ khó tích hợp trực tiếp

Một số nhà tài trợ hoặc đối tác không có API để gửi danh sách khách mời VIP. Cách thực tế hơn là họ gửi file CSV qua email cho ban tổ chức. Nếu ban tổ chức nhập thủ công, có thể xảy ra:

- Bỏ sót khách mời.
- Nhập sai email hoặc số điện thoại.
- Trùng khách mời.
- File CSV sai định dạng.
- Đến đêm trước ngày diễn vẫn chưa nhận được file từ nhà tài trợ.

Hệ thống cần tự động đọc email, lấy file CSV đính kèm, import khách VIP, lọc trùng, ghi nhận lỗi và gửi e-ticket qua email cho khách mời hợp lệ.

## 2. Mục tiêu

Mục tiêu của TicketBox là xây dựng một nền tảng bán vé concert có khả năng xử lý luồng nghiệp vụ chính từ lúc ban tổ chức tạo sự kiện đến lúc khán giả vào cổng bằng e-ticket QR.

Các mục tiêu cụ thể:

### 2.1. Mục tiêu nghiệp vụ

- Cho phép ban tổ chức tạo và quản lý concert.
- Cho phép cấu hình loại vé/khu vực, giá vé, số lượng vé và thời gian mở bán.
- Cho phép khán giả xem danh sách concert, xem chi tiết concert và đặt vé.
- Cho phép hệ thống giữ vé tạm thời trong lúc chờ thanh toán.
- Cho phép thanh toán online qua cổng thanh toán.
- Phát hành e-ticket QR sau khi thanh toán thành công.
- Gửi email xác nhận và e-ticket cho khán giả.
- Cho phép nhân viên soát vé quét QR tại cổng.
- Cho phép ban tổ chức theo dõi doanh thu, số vé bán ra và số vé đã check-in.
- Hỗ trợ tạo AI Artist Bio từ PDF.
- Hỗ trợ đồng bộ khách mời VIP từ file CSV gửi qua email.

### 2.2. Mục tiêu kỹ thuật

- Tách rõ các client theo vai trò:
  - Customer Web App cho khán giả.
  - Admin Dashboard cho ban tổ chức.
  - Scanner App cho nhân viên soát vé.
  - Backend API xử lý nghiệp vụ trung tâm.
- Sử dụng RBAC để phân quyền theo vai trò: khán giả, ban tổ chức, nhân viên soát vé.
- Đảm bảo object-level authorization, ví dụ:
  - Ban tổ chức chỉ quản lý concert thuộc tổ chức của mình.
  - Nhân viên soát vé chỉ quét concert/gate được phân công.
  - Khán giả chỉ xem đơn hàng/vé của chính mình.
- Quản lý tồn kho vé theo loại vé/khu vực, không theo số ghế.
- Dùng cơ chế hold order để giữ vé tạm thời và tự động giải phóng nếu hết hạn.
- Đảm bảo check-in là thao tác atomic để tránh quét trùng.
- Hỗ trợ background workers cho các tác vụ:
  - Hết hạn giữ vé.
  - Gửi email.
  - Xử lý AI Bio.
  - Import CSV khách VIP.
  - Đồng bộ hoặc dọn dẹp dữ liệu nền.
- Sử dụng Redis cho cache, lock, idempotency, hàng đợi hoặc hỗ trợ worker.
- Sử dụng PostgreSQL làm nguồn dữ liệu chính.
- Sử dụng MinIO/S3-compatible object storage để lưu file PDF, CSV, SVG sơ đồ khu vực và tài sản liên quan.

### 2.3. Mục tiêu về trải nghiệm người dùng

Đối với khán giả:

- Có thể xem concert dễ dàng.
- Có thể xem thông tin chi tiết, thời gian, địa điểm, Artist Bio và loại vé.
- Có thể đặt vé theo loại vé/khu vực.
- Có trạng thái rõ ràng khi đang giữ vé, chờ thanh toán hoặc thanh toán thành công.
- Nhận e-ticket qua email.
- Dùng QR để vào cổng nhanh.

Đối với ban tổ chức:

- Có dashboard quản lý concert.
- Có thể tạo concert, cấu hình loại vé, upload sơ đồ SVG khu vực nếu có.
- Có thể quản lý nhân viên soát vé và phân công gate.
- Có thể quản lý email nhà tài trợ gửi CSV khách VIP.
- Có thể xem kết quả import VIP: thành công, trùng, lỗi.
- Có thể xem và duyệt AI Artist Bio trước khi publish.
- Có thể xem doanh thu và số liệu check-in.

Đối với nhân viên soát vé:

- Có app riêng trên điện thoại.
- Đăng nhập bằng tài khoản được phân quyền.
- Chỉ thấy concert/gate được phân công.
- Quét QR bằng camera.
- Có thể nhập mã thủ công nếu camera lỗi.
- Có thể quét offline khi mất mạng và đồng bộ lại sau.
- Nhận phản hồi rõ ràng: vé hợp lệ, vé đã dùng, sai concert, sai ngày, vé hủy hoặc vé không hợp lệ.

### 2.4. Mục tiêu định lượng đề xuất

Trong phạm vi đồ án, hệ thống hướng tới các mục tiêu demo và kiểm thử sau:

- Hỗ trợ nhiều người dùng đặt vé cùng lúc mà không bán vượt quá tồn kho.
- Một vé chỉ có tối đa một lượt check-in thành công.
- Hold order tự hết hạn nếu người mua không thanh toán trong thời gian quy định.
- Import CSV khách VIP ghi nhận đầy đủ số dòng thành công, số dòng trùng và số dòng lỗi.
- AI Bio có vòng đời rõ ràng: uploaded, processing, generated, approved, published hoặc failed.
- Scanner App có thể lưu lượt quét offline và đồng bộ lại khi có mạng.

## 3. Người dùng và nhu cầu

### 3.1. Khán giả

Khán giả là người truy cập hệ thống để xem concert, đặt vé, thanh toán và sử dụng e-ticket để vào cổng.

Nhu cầu chính:

- Xem danh sách concert đang mở bán.
- Xem thông tin chi tiết concert: tên, địa điểm, thời gian, mô tả, Artist Bio, sơ đồ khu vực nếu có.
- Chọn loại vé/khu vực phù hợp.
- Đặt vé nhanh, tránh bị mất vé khi đang thanh toán.
- Thanh toán online.
- Nhận e-ticket QR qua email.
- Xem lại vé đã mua trong tài khoản.
- Dùng QR để check-in tại cổng.

Điều quan trọng nhất với khán giả là hệ thống phải minh bạch trạng thái đơn hàng và không xảy ra tình trạng đã thanh toán nhưng không nhận được vé.

### 3.2. Ban tổ chức

Ban tổ chức là người tạo và vận hành concert trên hệ thống.

Nhu cầu chính:

- Tạo concert mới.
- Cập nhật mã sự kiện `eventCode` để đồng bộ dữ liệu ngoài như CSV khách VIP.
- Cấu hình loại vé/khu vực, giá, số lượng, giới hạn mua.
- Upload sơ đồ SVG khu vực nếu concert có layout riêng.
- Theo dõi doanh thu và số vé đã bán.
- Quản lý nhân viên soát vé.
- Phân công nhân viên vào concert/gate.
- Theo dõi số lượng check-in theo thời gian thực.
- Upload PDF hồ sơ nghệ sĩ để AI tạo bio.
- Duyệt/chỉnh sửa Artist Bio trước khi công khai.
- Quản lý email nhà tài trợ được phép gửi CSV.
- Theo dõi kết quả import khách VIP.

Điều quan trọng nhất với ban tổ chức là dữ liệu bán vé, thanh toán, e-ticket và check-in phải nhất quán.

### 3.3. Nhân viên soát vé

Nhân viên soát vé là người đứng tại cổng để kiểm tra e-ticket của khán giả hoặc khách mời VIP.

Nhu cầu chính:

- Đăng nhập bằng tài khoản riêng.
- Chỉ thấy concert/gate được phân công.
- Dùng điện thoại để quét QR.
- Có phản hồi nhanh và dễ hiểu.
- Vẫn có thể xử lý khi mạng tại cổng không ổn định.
- Đồng bộ lại lượt quét offline khi có mạng.

Điều quan trọng nhất với nhân viên soát vé là thao tác phải nhanh, rõ ràng và phù hợp với mobile.

### 3.4. Nhà tài trợ

Nhà tài trợ là bên gửi danh sách khách mời VIP cho ban tổ chức. Họ không trực tiếp đăng nhập hệ thống trong phạm vi đồ án này.

Nhu cầu chính:

- Gửi file CSV khách mời qua email.
- CSV có cấu trúc thống nhất, ví dụ:
  - `fullName`
  - `email`
  - `phone`
  - `company`
  - `eventCode`
  - `note`
- Khách mời hợp lệ nhận được e-ticket qua email.

Điều quan trọng nhất là danh sách khách mời được import đúng concert và không bị trùng.

### 3.5. Hệ thống bên ngoài

Các hệ thống ngoài được tích hợp gồm:

- Cổng thanh toán: xử lý thanh toán và gửi kết quả giao dịch.
- Máy chủ email: gửi e-ticket, gửi thông báo và đọc CSV khách VIP qua IMAP.
- Google Gemini API: tạo Artist Bio từ nội dung PDF.
- Object storage MinIO/S3: lưu PDF, CSV, SVG và tài sản liên quan.

## 4. Phạm vi

### 4.1. Phạm vi thuộc đồ án

Đồ án TicketBox bao gồm các nhóm chức năng sau:

#### Customer Web App

- Xem danh sách concert.
- Xem trang chi tiết concert.
- Hiển thị thông tin concert, thời gian, địa điểm, mô tả, Artist Bio.
- Hiển thị loại vé/khu vực còn bán.
- Đặt vé theo loại vé.
- Thanh toán.
- Xem vé/đơn hàng của người dùng.

#### Admin Dashboard

- Đăng nhập ban tổ chức.
- Quản lý concert.
- Thêm/cập nhật `eventCode`.
- Cấu hình loại vé/khu vực.
- Quản lý sơ đồ SVG khu vực.
- Quản lý nhân viên soát vé.
- Phân công nhân viên vào concert/gate.
- Xem doanh thu.
- Xem thống kê check-in.
- Quản lý AI Artist Bio.
- Quản lý email nhà tài trợ.
- Xem báo cáo import khách VIP.

#### Scanner App

- Đăng nhập nhân viên soát vé.
- Tải danh sách concert/gate được phân công.
- Quét QR bằng camera điện thoại.
- Nhập mã thủ công.
- Gửi yêu cầu check-in online.
- Lưu lượt quét offline.
- Đồng bộ lại offline queue.
- Hiển thị kết quả check-in.
- Build APK để demo trên Android.

#### Backend API

- Authentication và RBAC.
- Quản lý concert.
- Quản lý loại vé.
- Hold order.
- Payment flow.
- Phát hành ticket/e-ticket.
- Check-in API.
- AI Artist Bio processing.
- VIP Guest Sync từ CSV email.
- Email sending.
- Worker/background jobs.
- Object storage integration.

#### Database và hạ tầng local

- PostgreSQL lưu dữ liệu chính.
- Redis hỗ trợ cache, lock, queue hoặc idempotency.
- MinIO lưu file.
- Docker Compose phục vụ môi trường local/demo.

### 4.2. Ngoài phạm vi đồ án

Các phần sau không phải mục tiêu chính của đồ án:

- Triển khai production thật trên cloud.
- Tối ưu hệ thống ở quy mô hàng triệu người dùng.
- Tích hợp đầy đủ tất cả cổng thanh toán thương mại.
- Xử lý đối soát tài chính thực tế với ngân hàng.
- Phát hành app lên Google Play hoặc App Store.
- Xây dựng native Android/iOS thuần.
- Hệ thống chống bot chuyên sâu như CAPTCHA nâng cao, device fingerprinting hoặc fraud detection.
- Chọn ghế cụ thể theo `seat_number`.
- Tích hợp API trực tiếp từ hệ thống nhà tài trợ.
- Quản lý hợp đồng, hóa đơn VAT hoặc kế toán nội bộ.

## 5. Rủi ro và ràng buộc

### 5.1. Rủi ro tồn kho vé

Rủi ro:

- Nhiều người đặt cùng một loại vé trong cùng thời điểm.
- Đơn hàng giữ vé nhưng không thanh toán.
- Payment callback đến muộn hoặc gửi lại nhiều lần.

Hướng xử lý:

- Dùng hold order để giữ vé tạm thời.
- Giới hạn thời gian giữ vé.
- Khi hết hạn, worker tự giải phóng tồn kho.
- Dùng transaction/lock để cập nhật tồn kho.
- Dùng idempotency key để tránh xử lý trùng request thanh toán.

### 5.2. Rủi ro thanh toán

Rủi ro:

- Cổng thanh toán lỗi hoặc timeout.
- Người dùng bị trừ tiền nhưng hệ thống chưa cập nhật.
- Webhook bị gọi lại nhiều lần.
- Mock webhook bị lạm dụng trong môi trường demo.

Hướng xử lý:

- Chỉ phát hành vé sau khi payment được xác nhận thành công.
- Xác minh webhook/IPN.
- Ghi log payment.
- Dùng idempotency để tránh xử lý trùng.
- Mock webhook chỉ bật khi cấu hình rõ bằng biến môi trường.

### 5.3. Rủi ro check-in trùng

Rủi ro:

- Một QR bị chụp màn hình và gửi cho nhiều người.
- Hai thiết bị quét cùng một vé gần như cùng lúc.
- Offline queue sync lên sau khi vé đã được quét online.

Hướng xử lý:

- Mỗi vé có QR/token riêng.
- Backend cập nhật trạng thái check-in bằng thao tác atomic.
- Một vé chỉ có một lượt `VALID`.
- Các lượt còn lại trả `ALREADY_USED` hoặc conflict.
- Offline sync theo quy tắc First-Scan Wins.

### 5.4. Rủi ro mạng tại cổng soát vé

Rủi ro:

- Điểm tổ chức sự kiện có mạng yếu.
- Nhân viên không thể gọi API check-in liên tục.
- Dữ liệu offline có thể xung đột khi đồng bộ lại.

Hướng xử lý:

- Scanner App lưu offline queue.
- Mỗi lượt quét offline lưu `ticketId`, `concertId`, `gateId`, `deviceId`, `staffId`, `scannedAtLocal`.
- Khi có mạng, app sync theo thứ tự thời gian.
- App hiển thị rõ lượt nào đã sync, lượt nào conflict.
- Backend vẫn là nguồn xác thực cuối cùng.

### 5.5. Rủi ro AI Artist Bio

Rủi ro:

- PDF khó đọc hoặc chứa nội dung không liên quan.
- AI tạo bio sai, thiếu chính xác hoặc không phù hợp.
- Bio tự động publish mà chưa được duyệt.

Hướng xử lý:

- Lưu trạng thái xử lý: processing, generated, failed.
- Lưu raw text, cleaned text và generated bio để debug.
- Ban tổ chức phải review/chỉnh sửa trước khi publish.
- Nếu AI lỗi, hệ thống ghi error message và cho phép upload/xử lý lại.

### 5.6. Rủi ro CSV khách VIP

Rủi ro:

- Nhà tài trợ gửi sai định dạng CSV.
- Thiếu `eventCode`.
- Dữ liệu khách bị trùng.
- Email khách mời sai.
- Đến giờ cron không có file CSV.

Hướng xử lý:

- Chỉ xử lý CSV từ email nhà tài trợ đã được cấu hình.
- CSV phải có cấu trúc thống nhất.
- Dùng `eventCode` để xác định concert.
- Lọc trùng theo concert + email/phone.
- Lưu báo cáo import: tổng dòng, thành công, trùng, lỗi.
- Nếu không có file, tạo report/cảnh báo `NO_FILE`.

### 5.7. Ràng buộc về kiến trúc

Hệ thống được chia thành các thành phần chính:

- Customer Web App: Next.js/React.
- Admin Dashboard: Next.js/React.
- Scanner App: Expo React Native.
- Backend API: Node.js/Express/TypeScript.
- Database: PostgreSQL.
- Cache/Queue/Lock: Redis.
- Object Storage: MinIO/S3-compatible.
- Email: SMTP/IMAP.
- AI: Google Gemini API.

Ràng buộc chính là các thành phần phải giao tiếp qua API rõ ràng, không để frontend thao tác trực tiếp database hoặc object storage.

### 5.8. Ràng buộc bảo mật

- API quản trị phải yêu cầu JWT.
- API check-in phải yêu cầu role `CHECKIN_STAFF`.
- API organizer phải yêu cầu role `ORGANIZER`.
- Không tin tưởng dữ liệu gửi từ frontend.
- Backend phải kiểm tra ownership và assignment.
- Không lưu mật khẩu dạng plain text.
- Không hard-code secret trong code production.
- Không cho phép user xem order/ticket của người khác.

## 6. Kết luận

TicketBox giải quyết bài toán bán vé concert theo hướng đầy đủ từ quản lý sự kiện, bán vé, thanh toán, phát hành e-ticket, soát vé tại cổng đến các tích hợp vận hành như AI Artist Bio và đồng bộ khách VIP từ CSV.

Điểm trọng tâm của hệ thống không phải là chọn ghế cụ thể, mà là đảm bảo quy trình bán vé theo loại vé/khu vực diễn ra nhất quán, không bán vượt tồn kho, không phát hành vé trước khi thanh toán thành công và không cho phép một vé được check-in nhiều lần.

Việc tách Customer Web App, Admin Dashboard và Scanner App giúp hệ thống phù hợp hơn với từng nhóm người dùng:

- Khán giả cần trải nghiệm mua vé đơn giản.
- Ban tổ chức cần công cụ quản lý và giám sát.
- Nhân viên soát vé cần app mobile nhanh, rõ ràng và có offline mode.

Trong phạm vi đồ án, hệ thống tập trung vào tính đúng đắn của nghiệp vụ, khả năng demo end-to-end và thiết kế kiến trúc rõ ràng, có thể mở rộng về sau.
