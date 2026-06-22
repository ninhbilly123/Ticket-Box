## Why

Backend đã có `eventCode`, AI Artist Bio và VIP Guest Sync nhưng `admin-frontend` chưa cung cấp các trường và màn hình tương ứng. Điều này khiến form tạo concert lỗi khi gọi API mới, còn ban tổ chức phải dùng Postman để quản lý email nhãn hàng, duyệt bio và theo dõi import VIP.

## What Changes

- Bổ sung trường bắt buộc `eventCode` vào form tạo concert và hiển thị mã sự kiện trong danh sách/chi tiết concert.
- Bổ sung mục **Email nhãn hàng** để xem, thêm, kích hoạt/vô hiệu hóa và giới hạn `allowedEventCodes` cho từng sender.
- Bổ sung mục **AI Artist Bio** theo concert để upload PDF, theo dõi trạng thái, xem bản AI tạo, chỉnh sửa/duyệt và publish.
- Bổ sung mục **VIP Sync** để xem danh sách import report, thống kê kết quả và lỗi từng dòng.
- Tích hợp các mục mới vào điều hướng, trạng thái loading/error/empty và hệ thống component/style hiện có của `admin-frontend`.
- Chỉ tài khoản `ORGANIZER` đã đăng nhập được phép sử dụng các chức năng quản trị mới.

## Capabilities

### New Capabilities

- `admin-integration-ui`: Giao diện quản trị thống nhất cho `eventCode`, điều hướng AI/VIP, trạng thái dữ liệu và các quy tắc tương tác chung của dashboard.

### Modified Capabilities

- `ai-artist-bio`: Bổ sung hành vi UI cho upload PDF, polling trạng thái, chỉnh sửa/duyệt và publish bio theo concert.
- `vip-guest-sync`: Bổ sung hành vi UI cho quản lý email nhãn hàng và theo dõi báo cáo import VIP.

## Impact

- `admin-frontend/app/page.tsx`: thêm tab, form, bảng dữ liệu, trạng thái và luồng thao tác mới.
- `admin-frontend/lib/api.ts`: thêm type và API client cho Artist Bio, sponsor email và import report; cập nhật contract `Concert.eventCode`.
- Backend API hiện có dưới `/api/v1/admin`, `/api/v1/ai/artist-bio` và `/api/v1/vip-guest-sync`; không thay đổi schema database trong change này.
- Không bổ sung UI cấu hình secret Gemini, IMAP, SMTP hoặc MinIO; các secret tiếp tục được quản lý bằng biến môi trường backend.
