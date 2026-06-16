## Why

Hệ thống cần cung cấp cho người dùng một phương thức xác thực và quản lý vé tiện lợi sau khi mua vé thành công. Vé điện tử (e-ticket) dưới dạng mã QR giúp giảm thiểu chi phí in ấn, tránh rủi ro mất vé giấy và hỗ trợ quá trình soát vé tại cổng sự kiện diễn ra nhanh chóng, chính xác.

## What Changes

- Sinh mã QR tự động sau khi giao dịch thanh toán hoàn tất và thành công.
- Cung cấp giao diện để người dùng có thể xem và tải xuống e-ticket.
- Gửi e-ticket qua email của người mua.
- Cung cấp cơ chế soát vé (scan QR) để kiểm tra tính hợp lệ của vé tại sự kiện.

## Capabilities

### New Capabilities
- `e-ticket`: Sinh và quản lý e-ticket (mã QR), hiển thị vé cho người dùng và gửi email vé điện tử.
- `ticket-scanning`: Quét và xác thực mã QR tại cổng sự kiện để check-in.

### Modified Capabilities
- `ticket-booking`: Cập nhật trạng thái vé và liên kết vé điện tử sau khi thanh toán thành công.
- `online-payment`: Gửi sự kiện để kích hoạt việc sinh e-ticket sau khi thanh toán hoàn tất.

## Impact

- **Backend**: Cần thêm module/service để sinh mã QR, quản lý trạng thái vé (chưa check-in, đã check-in), và gửi email.
- **Frontend**: Thêm trang hiển thị e-ticket cho user trong mục "Vé của tôi", cập nhật thông tin đơn hàng thành công.
- **App/Scanner**: Giao diện hoặc API để nhân viên soát vé quét mã QR và xác thực.
- **Database**: Cập nhật schema vé (ticket) để lưu trữ chuỗi bảo mật của QR code và trạng thái check-in.
