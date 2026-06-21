## Context

Hệ thống bán vé sự kiện thường gặp phải tình trạng lưu lượng truy cập tăng đột biến (spike traffic) khi một sự kiện hot được mở bán. Tại thời điểm người dùng chọn ghế và nhấn "Thanh toán", nếu không có cơ chế giữ chỗ, có khả năng nhiều người cùng chọn một ghế, dẫn đến việc người thanh toán sau bị lỗi hoặc trừ tiền oan. Việc áp dụng cơ chế khóa ghế tạm thời (Seat Reservation) giúp đảm bảo tính độc quyền cho giao dịch trong một khoảng thời gian nhất định (ví dụ: 10 phút) để người dùng có thể hoàn tất việc thanh toán.

## Goals / Non-Goals

**Goals:**
- Ngăn chặn triệt để tình trạng tranh chấp vé (Race Condition) bằng cách khóa ghế độc quyền trong lúc thanh toán.
- Tự động giải phóng ghế khi hết thời gian 10 phút hoặc giao dịch thanh toán bị hủy/thất bại.
- Hiển thị trạng thái ghế theo thời gian thực để khán giả biết ghế nào đang bị khóa.

**Non-Goals:**
- Không hỗ trợ danh sách chờ (Waiting List) hay xếp hàng tự động mua lại ghế vừa nhả.
- Không cho phép chuyển nhượng chỗ đang giữ sang một tài khoản khác.

## Decisions

### 1. Sử dụng Redis cho Distributed Lock
- **Quyết định**: Sử dụng Redis để lưu trạng thái khóa vé. Định dạng key: `ticket:{ticketId}:lock`, Value: `{ sessionId, userId, orderId }`, TTL: `600` (10 phút).
- **Lý do**: Redis hoạt động trên in-memory, cho tốc độ xử lý I/O rất nhanh để kiểm tra khóa trong tình huống có hàng ngàn request đồng thời. Lệnh `SET NX EX 600` (Set if Not eXists with Expiration) giúp đảm bảo tính atomic khi giành quyền khóa ghế.
- **Phương án thay thế**: Dùng Database lock (Pessimistic Locking `SELECT ... FOR UPDATE`). Bị loại bỏ vì sẽ gây nghẽn cổ chai (bottleneck) ở database khi lưu lượng tăng đột biến, ảnh hưởng tới các truy vấn khác.

### 2. Xử lý giải phóng ghế khi hết hạn (Timeout) bằng BullMQ
- **Quyết định**: Khi đặt vé thành công và chuyển sang thanh toán, hệ thống sẽ đẩy một Delayed Job vào BullMQ với độ trễ (delay) đúng 10 phút. Khi job chạy, worker sẽ kiểm tra trạng thái của đơn hàng. Nếu đơn hàng chưa thanh toán (PENDING), worker sẽ tự động hủy đơn, xóa khóa trên Redis và đổi trạng thái vé về AVAILABLE.
- **Lý do**: Đảm bảo tính tin cậy cao. Kể cả khi server bị crash và khởi động lại, các job giải phóng vé trong BullMQ vẫn được bảo toàn và thực thi đúng lịch.
- **Phương án thay thế**: Sử dụng Redis Keyspace Notifications (bắt sự kiện `expired` của key). Nhược điểm là Redis Pub/Sub theo cơ chế "Fire-and-Forget", nếu worker bị sập đúng lúc key hết hạn, hệ thống sẽ vĩnh viễn không nhận được sự kiện và vé sẽ bị kẹt mãi mãi (Zombie locks). Do đó, BullMQ an toàn hơn.

### 3. Cập nhật trạng thái hiển thị bằng cơ chế Polling (hoặc SSE/WebSocket) ở Frontend
- **Quyết định**: Để đơn giản trong giai đoạn đầu, trang Seat Map có thể sử dụng Polling nhẹ (mỗi 3-5 giây) để lấy danh sách các ghế đang bị khóa từ Redis.
- **Lý do**: Nhanh chóng đưa tính năng vào hoạt động mà không tốn nhiều nguồn lực cài đặt hạ tầng WebSocket phức tạp. Sau này có thể nâng cấp lên WebSocket/SSE nếu cần.

## Risks / Trade-offs

- **[Rủi ro] Đồng bộ giữa Redis và Database bị lệch (Inconsistency)**: Database ghi nhận vé đang RESERVED nhưng khóa trên Redis đã bay mất do lỗi kết nối.
  → **Giải pháp (Mitigation)**: Đặt nguồn chân lý (Source of Truth) cho trạng thái khóa 10 phút tại Redis. Mọi truy vấn kiểm tra vé khả dụng đều phải check cả DB (`AVAILABLE`) và Redis (không có key khóa).

- **[Rủi ro] Job Queue bị quá tải khiến vé bị nhả chậm**: Nếu có 100,000 vé hết hạn cùng lúc, worker có thể bị chậm.
  → **Giải pháp (Mitigation)**: Tuy worker nhả chậm, nhưng bản thân khóa trên Redis có TTL 600 giây. Do đó, đúng phút thứ 10, Redis đã tự động xóa khóa, lúc này người khác đã có thể thấy vé khả dụng và tiến hành mua (dù trong DB vé vẫn mang nhãn RESERVED nhưng logic sẽ ưu tiên trạng thái trống trên Redis). Worker chỉ đóng vai trò chốt chặn cuối cùng (Eventual Consistency) để đồng bộ lại trạng thái DB và báo cho người dùng cũ.

## Migration Plan

- Triển khai Redis Cluster nếu chưa có (hiện tại đang dùng Redis container).
- Khởi tạo Queue `reservation-timeout` trên BullMQ và kết nối với worker.

## Open Questions

- Đồng hồ đếm ngược ở phía client nên dựa hoàn toàn vào thời gian máy tính người dùng (có thể bị sai số/tác động) hay liên tục nhận thời gian sống (TTL) từ API? (Đề xuất: Lấy timestamp hết hạn từ server lúc tạo Order và đếm ngược trên trình duyệt dựa theo timestamp đó).
