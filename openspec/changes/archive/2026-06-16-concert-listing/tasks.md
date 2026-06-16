## 1. Database & Prisma Setup

- [x] 1.1 Khởi tạo schema.prisma với các model: Concert, TicketType, Order, Ticket
- [x] 1.2 Chạy migration tạo bảng trong cơ sở dữ liệu PostgreSQL
- [x] 1.3 Viết mã script seed dữ liệu mẫu cho Concert, Artist, TicketType và sơ đồ SVG để kiểm thử

## 2. Backend - Module Concert & Redis Caching

- [x] 2.1 Xây dựng service & controller lấy danh sách concert sắp diễn ra với các bộ lọc tìm kiếm
- [x] 2.2 Tích hợp Redis client và xây dựng helper đọc/ghi dữ liệu vé còn lại (TTL 30s)
- [x] 2.3 Xây dựng route và controller cho API `GET /api/v1/concerts` (danh sách) và `GET /api/v1/concerts/:id` (chi tiết concert kèm số vé)

## 3. Backend - Module Ticket & Booking (Per-User Limit)

- [x] 3.1 Xây dựng API `POST /api/v1/tickets/book` nhận thông tin đặt vé và số lượng
- [x] 3.2 Viết logic kiểm tra giới hạn mua vé tối đa trên mỗi tài khoản (per-user limit) dựa trên lịch sử thanh toán thành công
- [x] 3.3 Thực hiện logic trừ kho số lượng vé an toàn bằng database transaction (pessimistic lock) và tự động xóa cache Redis tương ứng sau giao dịch

## 4. Frontend - Trang Danh Sách & Bộ Lọc Concert

- [x] 4.1 Tạo cấu trúc thư mục frontend Next.js và cài đặt các component cơ bản
- [x] 4.2 Xây dựng trang danh sách concert sắp diễn ra với giao diện thẻ (Concert Card) đẹp mắt
- [x] 4.3 Thiết lập thanh tìm kiếm và bộ lọc theo nghệ sĩ, ngày diễn ra, và địa điểm tổ chức

## 5. Frontend - Trang Chi Tiết & Sơ Đồ Ghế SVG Tương Tác

- [x] 5.1 Phát triển trang chi tiết concert hiển thị thông tin thời gian, địa điểm, và thông tin phân hạng vé
- [x] 5.2 Phát triển component hiển thị sơ đồ ghế định dạng SVG trực tiếp (inline) cho phép click chọn phân hạng (VIP, SVIP, GA...)
- [x] 5.3 Xử lý form chọn số lượng vé, ràng buộc per-user limit hiển thị ở UI, và thực hiện gọi API đặt vé lên Backend
