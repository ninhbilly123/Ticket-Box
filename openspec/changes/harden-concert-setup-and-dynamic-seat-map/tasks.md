## 1. Data model và migration

- [x] 1.1 Thêm `Concert.seatMapEnabled`, `TicketType.zoneCode` và unique constraint theo concert vào Prisma schema.
- [x] 1.2 Tạo migration backfill zone code an toàn cho dữ liệu loại vé hiện có.
- [x] 1.3 Cập nhật seed và generate Prisma Client.

## 2. Backend concert setup

- [x] 2.1 Bổ sung Zod schema chặt cho create/update concert, ticket type, artist và ngày giờ.
- [x] 2.2 Cài đặt quản lý nghệ sĩ theo concert và giới hạn thao tác ở trạng thái `DRAFT`.
- [x] 2.3 Cài đặt SVG sanitizer, upload/xóa sơ đồ và validation `data-zone-code`.
- [x] 2.4 Cài đặt readiness service/endpoint và bắt buộc readiness trong publish.
- [x] 2.5 Bổ sung quy tắc khóa cấu hình thương mại sau publish và xử lý lỗi unique rõ ràng.
- [x] 2.6 Cập nhật public concert contract với `zoneCode`, `seatMapEnabled` và `seatMapSvg`.

## 3. Admin frontend

- [x] 3.1 Cập nhật type/API client cho readiness, artist, SVG và zone code.
- [x] 3.2 Hoàn thiện form tạo/sửa concert với validation lịch và toggle sơ đồ.
- [x] 3.3 Thêm quản lý nghệ sĩ, upload/xóa/preview SVG và readiness checklist cho concert được chọn.
- [x] 3.4 Cập nhật quản lý loại vé với zone code, cửa sổ bán và trạng thái khóa sau publish.
- [x] 3.5 Chỉ hiển thị/cho phép publish theo trạng thái và readiness từ backend.

## 4. Customer frontend

- [x] 4.1 Cập nhật public API types cho zone code và sơ đồ theo concert.
- [x] 4.2 Thay SeatMap gán cứng bằng SVG động, event delegation và trạng thái khu vực.
- [x] 4.3 Bổ sung danh sách loại vé làm lựa chọn chính/fallback và đồng bộ selection với SVG.

## 5. Verification

- [x] 5.1 Chạy Prisma validation/generate và backend TypeScript build.
- [x] 5.2 Chạy production build cho admin frontend và customer frontend.
- [x] 5.3 Kiểm tra các trường hợp readiness đạt/không đạt, SVG nguy hiểm, zone trùng và khóa sau publish.
- [x] 5.4 Chạy OpenSpec strict validation và cập nhật toàn bộ task hoàn tất.
