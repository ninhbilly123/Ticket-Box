## Why

Khán giả cần một công cụ trực quan và hiệu quả để tìm kiếm các concert, xem sơ đồ chỗ ngồi SVG tương tác để chọn đúng vị trí mong muốn, và thực hiện đặt vé một cách nhanh chóng. Đồng thời, hệ thống cần áp dụng giới hạn số lượng vé mua tối đa cho mỗi người dùng (per-user limit) để ngăn chặn hành vi đầu cơ (scalping), đồng thời hiển thị số lượng vé còn lại theo thời gian thực (real-time) thông qua cơ chế Redis Cache-aside nhằm giảm tải tối đa cho PostgreSQL database khi mở bán.

## What Changes

- **Trang danh sách concert**: Hiển thị danh sách các concert sắp diễn ra, tích hợp bộ lọc tìm kiếm theo nghệ sĩ, ngày diễn ra, và địa điểm.
- **Sơ đồ chỗ ngồi tương tác (SVG)**: Hiển thị sơ đồ chỗ ngồi trực quan theo từng phân hạng vé (GA, SVIP, VIP, CAT1, CAT2) để khán giả có thể chọn khu vực/vị trí mong muốn.
- **Đặt vé & chọn số lượng**: Luồng đặt vé cho phép khán giả chọn loại vé, số lượng và xác nhận thông tin đơn hàng trước khi tiến hành thanh toán.
- **Giới hạn mua vé (Per-user Limit)**: Kiểm tra và giới hạn số vé tối đa một tài khoản được phép mua cho mỗi loại vé (chỉ tính các đơn hàng đã thanh toán thành công trong lịch sử mua hàng của tài khoản).
- **Redis Cache-aside & Invalidation**: Lưu trữ số lượng vé còn lại trên Redis cache với TTL 30 giây và tự động invalidate cache ngay sau khi phát sinh giao dịch thành công.

## Capabilities

### New Capabilities
- `concert-listing`: Khán giả xem danh sách concert sắp diễn ra, tìm kiếm và lọc theo nghệ sĩ, ngày, địa điểm và hiển thị thông tin số vé còn lại real-time theo từng loại vé.
- `seat-map`: Giao diện sơ đồ chỗ ngồi dạng SVG tương tác, hiển thị bố cục khu vực (GA, SVIP, VIP, CAT1, CAT2), trạng thái chỗ ngồi và cho phép người dùng chọn phân hạng/vị trí.
- `ticket-booking`: Quy trình đặt vé, chọn số lượng, kiểm tra và áp dụng giới hạn số lượng vé tối đa được phép mua đối với mỗi tài khoản (per-user limit).

### Modified Capabilities

## Impact

- **Backend (Express)**:
  - Tạo mới module `concert` (quản lý danh sách, chi tiết, sơ đồ chỗ ngồi) và module `ticket` (quản lý đặt vé, kiểm tra giới hạn mua).
  - Tích hợp Redis Client phục vụ cache số lượng vé (`ticket_inventory:<ticket_type_id>`).
  - Xây dựng middleware / service kiểm tra per-user limit dựa trên lịch sử giao dịch đã thanh toán thành công từ database.
- **Database (PostgreSQL & Prisma)**:
  - Thiết kế database schema bao gồm các bảng: `concerts`, `ticket_types`, `orders` (trạng thái thanh toán), và `seats`/`layouts`.
- **Frontend (Next.js & Tailwind)**:
  - Giao diện danh sách concert, bộ lọc tìm kiếm tại `frontend/app/(public)/`.
  - Component sơ đồ ghế SVG tương tác và form đặt vé, chọn số lượng.
