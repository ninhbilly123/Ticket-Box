## 1. API contract và model frontend

- [x] 1.1 Bổ sung `eventCode` vào type `Concert` và payload tạo/cập nhật concert trong `admin-frontend/lib/api.ts`.
- [x] 1.2 Bổ sung type `ArtistBio` cùng API lấy bản mới nhất, upload PDF, review và publish.
- [x] 1.3 Bổ sung type `SponsorEmail` cùng API list, create và update sponsor.
- [x] 1.4 Bổ sung type cho import report, row error và VIP guest cùng API list/detail report.
- [x] 1.5 Tạo helper multipart upload không gán thủ công JSON `Content-Type` và vẫn gửi bearer token.

## 2. Event code trong quản lý concert

- [x] 2.1 Thêm trường bắt buộc `eventCode` vào state và form tạo concert.
- [x] 2.2 Validate, trim và uppercase `eventCode` trước khi gọi API; giữ dữ liệu form khi backend trả lỗi.
- [x] 2.3 Hiển thị `eventCode` trong danh sách concert và các concert selector dùng bởi AI/VIP.

## 3. UI quản lý email nhãn hàng

- [x] 3.1 Thêm tab `Email nhãn hàng` vào navigation hiện tại với Lucide icon phù hợp.
- [x] 3.2 Xây dựng bảng sponsor email gồm email, display name, trạng thái và allowed event codes.
- [x] 3.3 Xây dựng form thêm sponsor với email validation và chọn nhiều event code từ danh sách concert.
- [x] 3.4 Thêm thao tác kích hoạt/vô hiệu hóa và cập nhật display name/allowed event codes, có rollback UI khi request lỗi.
- [x] 3.5 Bổ sung loading, empty, success và error state cho sponsor email.

## 4. UI AI Artist Bio theo concert

- [x] 4.1 Thêm tab AI Artist Bio và concert selector dùng `selectedConcertId` hiện có.
- [x] 4.2 Xây dựng vùng upload chỉ nhận PDF tối đa 10 MB và hiển thị tiến trình submit.
- [x] 4.3 Hiển thị metadata, status badge, generated/reviewed/published bio và error message theo trạng thái.
- [x] 4.4 Cài đặt polling khoảng 3 giây cho `UPLOADED`/`PROCESSING`, chống request chồng lặp và cleanup khi đổi tab/concert hoặc unmount.
- [x] 4.5 Xây dựng editor review có validation nội dung không rỗng và cập nhật trạng thái `APPROVED` sau khi thành công.
- [x] 4.6 Chỉ hiển thị/enable publish ở trạng thái `APPROVED`, xác nhận trước khi publish và hiển thị kết quả `PUBLISHED`.

## 5. UI báo cáo VIP Sync

- [x] 5.1 Thêm tab VIP Sync và tải danh sách report mới nhất trước.
- [x] 5.2 Xây dựng bảng report với sender, file, thời gian, status và năm bộ đếm kết quả.
- [x] 5.3 Phân biệt trực quan `NO_FILE`, `FAILED`, `PARTIAL_SUCCESS`, `SUCCESS`, `PENDING` và `PROCESSING`.
- [x] 5.4 Chỉ gọi API detail khi chọn report và hiển thị row errors gồm row number, error code, message và raw data.
- [x] 5.5 Hiển thị khách đã import gồm thông tin liên hệ, company, ticket status, email status và SMTP error nếu có.
- [x] 5.6 Bổ sung loading, empty và error state độc lập cho danh sách và vùng chi tiết report.

## 6. Tính nhất quán và responsive

- [x] 6.1 Tái sử dụng `Panel`, `Field`, `DataTable`, `StatusBadge`, button và alert style hiện có; không tạo hệ thống style thứ hai.
- [x] 6.2 Bảo đảm tab navigation, form một cột và bảng cuộn ngang hoạt động trên mobile mà không chồng lấn nội dung.
- [x] 6.3 Bảo đảm các mutation mới chỉ refresh dữ liệu liên quan thay vì gọi lại toàn bộ dashboard.
- [x] 6.4 Kiểm tra role `ORGANIZER`, token hết hạn và bảo đảm không integration secret nào xuất hiện trên UI/local storage.

## 7. Verification

- [x] 7.1 Chạy TypeScript/Next.js production build cho `admin-frontend`.
- [x] 7.2 Test tạo concert với eventCode hợp lệ, rỗng và trùng.
- [x] 7.3 Test AI Bio từ upload PDF đến `AI_GENERATED`, review và publish; kiểm tra polling cleanup và trạng thái lỗi.
- [x] 7.4 Test tạo/update sponsor email với allowed event codes và validation email.
- [x] 7.5 Test danh sách/chi tiết VIP report cho `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED` và `NO_FILE`.
- [x] 7.6 Kiểm tra thủ công desktop/mobile để xác nhận layout, text và control không bị tràn hoặc chồng lấn.
- [x] 7.7 Chạy `openspec validate --all` và cập nhật trạng thái task sau khi triển khai.
