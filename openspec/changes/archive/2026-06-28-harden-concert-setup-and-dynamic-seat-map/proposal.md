## Why

Luồng tạo concert hiện cho phép publish ngay sau khi tạo bản nháp dù chưa có nghệ sĩ, loại vé, tồn kho hoặc lịch bán hợp lệ; đồng thời sơ đồ SVG trong trang booking đang bị gán cứng và không sử dụng cấu hình của concert. Thay đổi này chuẩn hóa vòng đời cấu hình concert để dữ liệu công khai luôn có thể bán vé đúng với khu vực thực tế.

## What Changes

- Chuẩn hóa luồng `DRAFT -> cấu hình -> readiness check -> PUBLISHED`; backend SHALL từ chối publish khi điều kiện bắt buộc chưa hoàn tất.
- Bổ sung validation chặt cho ngày giờ concert và khung thời gian bán vé.
- Bổ sung quản lý nghệ sĩ gắn với từng concert và yêu cầu ít nhất một nghệ sĩ trước publish.
- Bổ sung `zoneCode` duy nhất trong từng concert để liên kết loại vé với khu vực SVG mà không phụ thuộc tên hiển thị.
- Cho phép ban tổ chức bật/tắt sơ đồ khu vực theo concert, upload file SVG, làm sạch nội dung và kiểm tra các `data-zone-code` trước khi lưu.
- Thay sơ đồ gán cứng của customer frontend bằng SVG riêng của concert; nếu concert không dùng sơ đồ thì hiển thị danh sách loại vé làm phương thức chọn vé chính.
- Hạn chế sửa cấu hình thương mại sau khi publish; vẫn cho phép cập nhật mô tả và điều chỉnh tồn kho theo các ràng buộc hiện có.
- Bổ sung UI cấu hình concert, readiness checklist, quản lý nghệ sĩ, upload/preview SVG và trạng thái publish thống nhất với admin frontend hiện tại.
- **BREAKING**: payload tạo loại vé yêu cầu `zoneCode`; API concert công khai bổ sung `seatMapEnabled` và `seatMapSvg`, còn `seatMapUrl` chỉ được giữ tạm để tương thích.

## Capabilities

### New Capabilities

- `concert-setup`: Quản lý bản nháp, nghệ sĩ, readiness check, điều kiện publish và giới hạn thay đổi sau publish.

### Modified Capabilities

- `concert-listing`: Concert công khai chỉ xuất hiện sau khi vượt qua publish readiness và trả cấu hình sơ đồ theo concert.
- `seat-map`: Sơ đồ SVG được upload theo concert, ánh xạ khu vực bằng `zoneCode` và có fallback chọn loại vé khi không sử dụng sơ đồ.
- `ticket-booking`: Loại vé sử dụng `zoneCode` ổn định và việc chọn khu vực SVG phải chọn đúng loại vé tương ứng.

## Impact

- Prisma schema và migration cho `Concert.seatMapEnabled` và `TicketType.zoneCode` cùng các unique constraint theo concert.
- API quản trị concert, loại vé, nghệ sĩ, upload SVG, readiness và publish.
- Admin frontend tại trang Concerts và Ticket Types.
- Customer API contract, `SeatMap` và trang booking.
- Thêm dependency backend để làm sạch SVG trước khi lưu/hiển thị.
- Dữ liệu loại vé hiện có cần được backfill `zoneCode` từ tên loại vé; concert hiện có giữ `seatMapEnabled = false` cho đến khi được cấu hình lại.
