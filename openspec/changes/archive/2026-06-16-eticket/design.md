## Context

Sau khi khách hàng mua vé trên hệ thống Ticket-Box, cần có một phương thức để xác nhận thông tin mua vé và cung cấp công cụ để soát vé tại cổng. E-ticket (vé điện tử) kết hợp QR code là giải pháp tiêu chuẩn.

## Goals / Non-Goals

**Goals:**
- Tự động sinh QR code chứa chuỗi bảo mật an toàn cho từng vé khi thanh toán thành công.
- Gửi thông tin e-ticket và QR code vào email của người mua.
- Cung cấp giao diện soát vé cho nhân viên sự kiện.
- Ghi nhận trạng thái check-in thời gian thực.

**Non-Goals:**
- Không hỗ trợ vé cứng (in giấy và giao tận nhà).
- Không xử lý chuyển nhượng vé giữa các user trong phase này.
- Không hỗ trợ soát vé ngoại tuyến (offline scanning).

## Decisions

- **Cơ chế sinh QR Code:** Sinh mã chuỗi ngẫu nhiên kết hợp với ID vé, hash bằng HMAC với secret key (hoặc sử dụng JWT) để chống làm giả. (Lý do: bảo mật, khó đoán, không cần lưu trữ state phức tạp ngoài DB).
- **Lưu trữ mã:** Mã bảo mật của QR code được lưu vào cơ sở dữ liệu ở bảng `Ticket` với cột `qrToken` (để định danh) và trạng thái `isCheckedIn` (boolean).
- **Gửi Email:** Sử dụng background worker / hàng đợi (ví dụ: BullMQ/RabbitMQ) để tiến hành gửi email chứa mã QR. (Lý do: tránh làm block luồng thanh toán và phản hồi nhanh cho người dùng).
- **Soát vé (Check-in):** Ứng dụng quét mã gọi API `POST /api/tickets/scan` với payload chứa `qrToken`. Nếu vé hợp lệ và chưa sử dụng -> cập nhật trạng thái `isCheckedIn = true`, trả kết quả thành công.

## Risks / Trade-offs

- **[Risk] Mã QR bị sao chép hoặc chụp lại màn hình:**
  - **Mitigation:** Hệ thống chỉ cho phép check-in 1 lần duy nhất cho mỗi mã vé. Bất kỳ ai sở hữu mã đến cổng trước sẽ được tính là hợp lệ, mã sẽ bị vô hiệu hóa sau lần quét đầu tiên.
- **[Risk] Cổng soát vé bị gián đoạn mạng (No Internet):**
  - **Mitigation:** Luồng thiết kế hiện tại bắt buộc thiết bị quét phải có kết nối mạng liên tục (Online scanning). Xử lý quét ngoại tuyến (Offline) sẽ được đưa vào các phase sau nếu cần.
