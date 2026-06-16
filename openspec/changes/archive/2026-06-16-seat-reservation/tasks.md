## 1. Setup Redis & Job Queue (BullMQ)

- [x] 1.1 Thiết lập Queue `reservation-timeout` bằng BullMQ trong backend để xử lý các job giải phóng ghế.
- [x] 1.2 Viết worker `reservation.worker.ts` để xử lý các job từ queue. Logic: Tìm Order theo `orderId`, nếu status vẫn là `PENDING` thì chuyển Order thành `CANCELLED`, Ticket thành `AVAILABLE`, và xóa khóa trên Redis.

## 2. Core Service - Redis Lock 

- [x] 2.1 Thêm các utility function cho Redis trong thư viện dùng chung (vd: `shared/lib/redis.ts`): hàm `lockTicket(ticketId, orderId)` sử dụng lệnh `SET NX EX 600`.
- [x] 2.2 Thêm hàm `unlockTicket(ticketId)` để xóa khóa Redis thủ công khi cần.
- [x] 2.3 Thêm hàm `getLockedTickets(concertId)` để lấy danh sách các vé đang bị khóa.

## 3. Cập nhật luồng Đặt vé (Booking Process)

- [x] 3.1 Chỉnh sửa API tạo đơn hàng (Create Order): Trước khi tạo Order ở trạng thái PENDING, gọi hàm `lockTicket` cho từng vé. Nếu có vé đã bị khóa bởi người khác, throw error ngay lập tức và roll back.
- [x] 3.2 Ngay sau khi lưu Order thành công, đẩy (add) một job vào queue `reservation-timeout` với thuộc tính `delay: 600000` (10 phút).
- [x] 3.3 Trả về field `expiredAt` trong response của API tạo đơn hàng để client dùng cho đồng hồ đếm ngược.
- [x] 3.4 Cập nhật API Webhook/Callback của cổng thanh toán: Nếu thanh toán thành công, có thể chủ động gọi `unlockTicket` để xóa khóa (dọn dẹp Redis) và hoàn tất đơn hàng.

## 4. API Seat Map (Trạng thái vé theo thời gian thực)

- [x] 4.1 Chỉnh sửa API trả về thông tin danh sách vé hoặc Sơ đồ ghế (Seat Map): Truy vấn thêm Redis để kiểm tra vé nào đang bị khóa.
- [x] 4.2 Trả về trạng thái tổng hợp cho từng ghế: `AVAILABLE` (còn trống trên cả DB và Redis), `RESERVED` (đang bị khóa trên Redis), hoặc `BOOKED` / `SOLD` (đã bán trong DB).

## 5. Frontend Integration

- [x] 5.1 Cập nhật trang Seat Map: Hiển thị các ghế có trạng thái `RESERVED` với màu sắc nhận diện riêng (vd: màu vàng/xám) và vô hiệu hóa không cho click chọn.
- [x] 5.2 Xây dựng component Đồng hồ đếm ngược (Countdown Timer) 10 phút trên trang Thanh toán (Checkout), sử dụng `expiredAt` nhận từ API.
- [x] 5.3 Xử lý khi đồng hồ đếm ngược về 0: Tự động vô hiệu hóa nút thanh toán, hiển thị thông báo "Hết thời gian thanh toán" và cung cấp nút quay về trang chủ hoặc đặt lại vé.
