## 1. Database Schema Updates

- [x] 1.1 Cập nhật schema.prisma thêm model Payment và thiết lập quan hệ với Order
- [x] 1.2 Thêm trường idempotencyKey vào model Order trong schema.prisma
- [x] 1.3 Chạy lệnh npx prisma migrate dev để đồng bộ cấu trúc PostgreSQL

## 2. Backend - Cập Nhật Luồng Booking & Background Worker

- [x] 2.1 Điều chỉnh API đặt vé để lưu Order trạng thái PENDING và Ticket trạng thái RESERVED (Giữ chỗ)
- [x] 2.2 Phát triển background cron job tự động giải phóng vé (hủy Order PENDING và xóa Ticket RESERVED quá hạn 10 phút)

## 3. Backend - Module Thanh Toán & Bảo Vệ Hệ Thống

- [x] 3.1 Xây dựng service tích hợp cổng thanh toán VNPAY/MoMo và tạo bản ghi Payment
- [x] 3.2 Phát triển các endpoint Webhook/IPN nhận kết quả thanh toán đối tác để cập nhật trạng thái đơn hàng và sinh e-ticket
- [x] 3.3 Tích hợp middleware kiểm tra trùng lặp giao dịch sử dụng Idempotency Key lưu trên Redis
- [x] 3.4 Triển khai cơ chế Circuit Breaker lưu trạng thái lỗi cổng thanh toán trên Redis

## 4. Frontend - Giao Diện Checkout & Kết Quả

- [x] 4.1 Nâng cấp form đặt vé ở Frontend Next.js để cho phép chọn cổng thanh toán (VNPAY/MoMo)
- [x] 4.2 Xây dựng màn hình hiển thị kết quả đặt vé và e-ticket QR Code sau khi thanh toán thành công
