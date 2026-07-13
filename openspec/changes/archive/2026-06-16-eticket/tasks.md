## 1. Database & Schema Updates

- [x] 1.1 Thêm các trường `qrToken` (string, unique) và `isCheckedIn` (boolean, default: false) vào table `Ticket` trong schema.
- [x] 1.2 Cập nhật database và chạy migration tương ứng.

## 2. E-ticket Core Services

- [x] 2.1 Viết utility function để sinh mã `qrToken` bảo mật (dùng HMAC kết hợp ID vé và secret key).
- [x] 2.2 Viết service xử lý sự kiện `PaymentCompleted` để gọi function sinh QR token và lưu vào cơ sở dữ liệu.
- [x] 2.3 Cấu hình hệ thống và tạo service gửi email (chứa chi tiết vé và hình ảnh QR code) thông qua template.
- [x] 2.4 Tích hợp queue processing (ví dụ: BullMQ hoặc RabbitMQ) để chạy ngầm tiến trình gửi email.

## 3. Ticket Scanning API

- [x] 3.1 Tạo API endpoint `POST /api/tickets/scan` nhận payload `{ qrToken }`.
- [x] 3.2 Viết logic validation để kiểm tra `qrToken` có tồn tại trong hệ thống hay không và kiểm tra trạng thái `isCheckedIn`.
- [x] 3.3 Viết xử lý cập nhật `isCheckedIn = true` nếu vé hợp lệ, và trả về thông tin thành công.
- [x] 3.4 Bổ sung xử lý trả về mã lỗi thích hợp nếu vé đã check-in (đã sử dụng) hoặc mã không hợp lệ/giả mạo.

## 4. Frontend - User Profile & E-ticket UI

- [x] 4.1 Cập nhật trang "Vé của tôi" (My Tickets) để hiển thị danh sách vé cùng trạng thái tương ứng của từng vé.
- [x] 4.2 Cài đặt thư viện hiển thị mã QR (ví dụ: `qrcode.react` hoặc tương đương) ở phía frontend.
- [x] 4.3 Tạo UI/Modal để hiển thị thông tin vé điện tử cùng mã QR rõ nét để người dùng có thể quét qua cổng sự kiện.
