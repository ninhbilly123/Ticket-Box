## Why

Khi khán giả ở bước thanh toán (đã chọn vé, chưa trả tiền), hệ thống cần phải tạm "khóa" số vé hoặc chỗ ngồi đó trong một khoảng thời gian nhất định (ví dụ 10 phút). Nếu không có cơ chế này, sẽ xảy ra tình huống tranh chấp (race condition): hàng trăm người cùng thấy hệ thống báo "còn 1 vé", cùng bấm mua và cùng vào trang thanh toán, nhưng chỉ người thanh toán xong đầu tiên mới mua được vé, những người còn lại sẽ bị mất thời gian vô ích và có trải nghiệm rất tồi tệ.

## What Changes

- Bổ sung cơ chế khóa (lock) ghế/vé tạm thời trên Redis với thời gian sống (TTL) là 10 phút ngay sau khi người dùng xác nhận đặt chỗ.
- Cập nhật số lượng vé và sơ đồ ghế theo thời gian thực: những ghế đang bị "khóa" sẽ không thể được chọn bởi người dùng khác.
- Hiển thị đồng hồ đếm ngược (countdown timer) trên giao diện trang thanh toán.
- Viết job/worker tự động (hoặc sử dụng Redis Keyspace Notifications) để tự động giải phóng (release) vé bị khóa và chuyển trạng thái đơn hàng sang CANCELLED nếu hết 10 phút mà giao dịch chưa thành công.
- Tự động giải phóng vé khi có thông báo thanh toán thất bại từ cổng thanh toán.

## Capabilities

### New Capabilities
- `seat-reservation`: Cơ chế khóa giữ chỗ tạm thời bằng Redis, quản lý thời gian đếm ngược, và tự động giải phóng chỗ ngồi khi hết hạn.

### Modified Capabilities
- `ticket-booking`: Quy trình đặt vé được cập nhật để yêu cầu khóa ghế thành công trên Redis trước khi ghi nhận đơn hàng (Order) vào database.
- `seat-map`: Giao diện và API sơ đồ chỗ ngồi phải hiển thị trạng thái của các ghế đang bị "khóa tạm thời" (Reserved) để những người dùng khác không thể chọn.

## Impact

- **Backend**: Cần tích hợp chặt chẽ với Redis cho cơ chế distributed lock. Thêm API endpoint cho việc lấy thời gian khóa còn lại hoặc gia hạn (nếu cần).
- **Frontend**: Trang thanh toán cần có UI đếm ngược thời gian. Trang chọn vé (Seat Map) cần phân biệt màu sắc giữa vé Đã Bán (Sold) và vé Đang Bị Khóa (Reserved).
- **Database**: Không thay đổi nhiều về Schema nhưng state của Ticket cần tuân thủ chặt chẽ lifecycle: AVAILABLE -> RESERVED -> BOOKED hoặc trả về AVAILABLE.
