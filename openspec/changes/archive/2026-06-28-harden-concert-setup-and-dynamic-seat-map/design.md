## Context

TicketBox hiện lưu concert và loại vé trong PostgreSQL, còn admin frontend quản lý các nhóm dữ liệu ở những tab độc lập. Concert mới được tạo ở trạng thái `DRAFT`, nhưng endpoint publish chỉ đổi trạng thái sang `PUBLISHED`. Customer frontend bỏ qua `svgSeatingMap` do API trả tên `seatMapUrl` trong khi component `SeatMap` tự dựng năm khu vực cố định theo tên loại vé.

Hệ thống bán vé theo khu vực, không có số ghế. Vì vậy sơ đồ chỉ mô tả ranh giới khu vực và phải ánh xạ tới loại vé, không quản lý từng ghế. Thay đổi đi qua Prisma, Express API, admin Next.js và customer Next.js nên cần một contract thống nhất.

## Goals / Non-Goals

**Goals:**

- Giữ concert ở `DRAFT` cho đến khi backend xác nhận đủ điều kiện publish.
- Dùng mã khu vực ổn định để liên kết loại vé với SVG riêng của concert.
- Cho admin biết chính xác mục nào đạt/chưa đạt và có thao tác để hoàn tất cấu hình.
- Làm sạch SVG ở biên backend trước khi lưu và chỉ render nội dung đã làm sạch.
- Ngăn thay đổi cấu hình thương mại không an toàn sau publish.
- Duy trì lựa chọn loại vé bằng danh sách khi concert không dùng sơ đồ.

**Non-Goals:**

- Không quản lý ghế, hàng ghế hoặc `seat_number`.
- Không xây dựng trình vẽ SVG trong trình duyệt; admin chuẩn bị file SVG bên ngoài rồi upload.
- Không bắt buộc Artist Bio, nhân viên soát vé, email nhãn hàng hoặc VIP Sync để publish.
- Không thay đổi cơ chế giữ vé, thanh toán, e-ticket hoặc check-in.
- Không chuyển SVG sang MinIO trong change này; sơ đồ nhỏ, đã làm sạch và cần trả cùng concert detail nên tiếp tục lưu trong PostgreSQL.

## Decisions

### 1. Readiness là quyết định của backend

Thêm `GET /api/v1/admin/concerts/:id/readiness`, trả `ready`, danh sách check và các lỗi chặn publish. `POST /publish` gọi lại cùng hàm đánh giá thay vì tin trạng thái UI. Cách này tránh bypass bằng Postman và tránh hai bộ quy tắc khác nhau.

Các check chặn publish gồm thông tin cơ bản, lịch hợp lệ, ít nhất một nghệ sĩ, ít nhất một loại vé active có tồn kho dương, zone code duy nhất và sơ đồ hợp lệ khi `seatMapEnabled = true`. Artist Bio và phân công nhân viên chỉ là warning.

### 2. `zoneCode` là khóa liên kết, tên chỉ để hiển thị

`TicketType.zoneCode` được chuẩn hóa thành chữ hoa với ký tự `A-Z`, `0-9`, `_`, `-` và unique trong một concert. SVG đánh dấu phần tử tương tác bằng `data-zone-code="VIP"`. Đổi tên hiển thị không làm hỏng liên kết sơ đồ.

Tên loại vé cũng unique trong concert để tránh hai lựa chọn không phân biệt được trên UI. Migration backfill zone code từ tên hiện có trước khi đặt `NOT NULL`.

### 3. Concert chủ động bật sơ đồ khu vực

Thêm `Concert.seatMapEnabled`, mặc định `false`. Khi tắt, publish không yêu cầu SVG và booking dùng danh sách loại vé. Khi bật, SVG phải có ít nhất một phần tử cho mọi zone code active và không chứa zone code lạ.

Lựa chọn explicit flag tốt hơn suy luận từ chuỗi SVG rỗng vì cho phép admin xóa/reupload trong lúc cấu hình và giúp readiness báo lỗi đúng ngữ cảnh.

### 4. Upload SVG qua endpoint riêng và lưu nội dung đã làm sạch

Thêm multipart endpoint `POST /api/v1/admin/concerts/:id/seat-map`, giới hạn file `.svg` tối đa 512 KiB. Backend dùng allowlist SVG tags/attributes, loại bỏ script, event handler, `foreignObject`, stylesheet và liên kết ngoài. Sau làm sạch, backend kiểm tra root `<svg>`, `viewBox` và `data-zone-code`.

Không nhận SVG trong payload JSON tạo concert nữa. Endpoint riêng cho phép kiểm soát MIME, kích thước và lỗi validation rõ ràng. `DELETE /seat-map` xóa sơ đồ khi concert còn `DRAFT`.

### 5. Customer render SVG bằng event delegation

API public trả `seatMapEnabled` và `seatMapSvg`. Component đưa chuỗi đã làm sạch vào một container SVG, lắng nghe click tại phần tử gần nhất có `data-zone-code`, rồi tìm TicketType theo `zoneCode`. Trạng thái selected/sold-out được áp bằng class/data attribute sau render.

Không thực thi script từ SVG và không dùng tên loại vé để ánh xạ. Khi không có sơ đồ, UI chỉ hiển thị danh sách loại vé; khi sơ đồ lỗi ngoài dự kiến, danh sách vẫn là fallback khả dụng.

### 6. Khóa cấu hình thương mại sau publish

Sau publish, endpoint concert chỉ cho sửa `description`. Thêm/xóa nghệ sĩ, upload/xóa SVG, tạo/xóa loại vé và sửa tên, zone code, giá hoặc cửa sổ bán chỉ được thực hiện ở `DRAFT`. Inventory vẫn có thể điều chỉnh qua endpoint riêng, nhưng không được giảm dưới số đã giữ hoặc đã bán.

Quy tắc bảo thủ này tránh làm thay đổi ý nghĩa vé đang được giữ/mua. Nhu cầu đổi lịch hoặc sơ đồ sau khi bán vé phải đi qua change nghiệp vụ riêng có thông báo khách hàng.

### 7. Nghệ sĩ được quản lý trực tiếp trong cấu hình concert

Thêm endpoint gắn nghệ sĩ theo tên và gỡ quan hệ theo artist ID. Service tái sử dụng Artist cùng tên không phân biệt hoa thường nếu đã tồn tại, nếu không thì tạo mới. Readiness yêu cầu ít nhất một quan hệ `ConcertArtist`; Artist Bio vẫn là tài liệu riêng theo concert.

## Risks / Trade-offs

- **SVG allowlist có thể loại bỏ hiệu ứng thiết kế phức tạp** → Chỉ hỗ trợ các primitive cần cho sơ đồ khu vực và trả lỗi/preview để admin sửa file trước publish.
- **Dữ liệu cũ có tên loại vé tạo cùng zone code sau chuẩn hóa** → Migration thêm hậu tố xác định theo thứ tự cho bản ghi trùng trước khi tạo unique index.
- **Khóa cấu hình sau publish hạn chế chỉnh lỗi vận hành** → Vẫn cho sửa mô tả và inventory; thay đổi thương mại cần hủy/recreate hoặc change nghiệp vụ có audit riêng.
- **Render inline SVG cần `dangerouslySetInnerHTML`** → Chỉ render chuỗi đã sanitize ở backend, không cho URL/event/style nguy hiểm và không nhận SVG trực tiếp từ nguồn công khai.
- **Readiness có thể thay đổi giữa lần xem và lần publish** → Endpoint publish tự đánh giá lại ngay trước khi cập nhật trạng thái.

## Migration Plan

1. Thêm `seat_map_enabled` mặc định false và `zone_code` nullable.
2. Backfill zone code từ tên loại vé, xử lý trùng trong từng concert, sau đó đặt `NOT NULL` và unique indexes.
3. Generate Prisma Client và triển khai backend hỗ trợ cả contract admin mới.
4. Triển khai admin frontend để cấu hình zone code, nghệ sĩ, SVG và readiness.
5. Triển khai customer frontend đọc `seatMapEnabled`/`seatMapSvg`; giữ `seatMapUrl` tạm thời trong response để client cũ không lỗi kiểu dữ liệu.
6. Rollback ứng dụng bằng cách tắt `seatMapEnabled`; rollback database chỉ thực hiện sau khi bỏ các unique index và cột mới.

## Open Questions

Không còn. Sơ đồ là tùy chọn theo concert; Artist Bio và nhân viên không chặn publish; nghệ sĩ và ít nhất một loại vé có tồn kho là bắt buộc.
