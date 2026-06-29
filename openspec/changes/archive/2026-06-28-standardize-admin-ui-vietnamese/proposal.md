## Why

Admin frontend hiện trộn tiếng Anh và tiếng Việt trong điều hướng, biểu mẫu, nút thao tác, trạng thái và thông báo, làm trải nghiệm vận hành thiếu nhất quán. Giao diện cần dùng tiếng Việt thống nhất cho ban tổ chức và nhân viên soát vé, trong khi vẫn giữ nguyên các mã kỹ thuật cần đối chiếu với hệ thống.

## What Changes

- Chuyển toàn bộ nội dung tĩnh do admin frontend sở hữu sang tiếng Việt: đăng nhập, điều hướng, tiêu đề, nhãn trường, bảng, nút, tooltip, trạng thái tải/rỗng, thông báo thành công và lỗi mặc định.
- Bổ sung bộ định dạng tập trung để hiển thị role và status API bằng nhãn tiếng Việt mà không thay đổi giá trị gửi/nhận từ backend.
- Đồng bộ thuật ngữ giữa dashboard organizer, cấu hình concert, loại vé, nhân viên, whitelist, tích hợp AI/VIP và workspace soát vé.
- Giữ nguyên tên thương hiệu và các thuật ngữ/mã kỹ thuật như TicketBox, API, AI, VIP, PDF, CSV, SVG, QR, UUID, eventCode và zoneCode.
- Không thay đổi API, database, quyền RBAC hoặc luồng nghiệp vụ.

## Capabilities

### New Capabilities

- `admin-ui-localization`: Quy định ngôn ngữ hiển thị tiếng Việt và cách biểu diễn role/status trong toàn bộ admin frontend.

### Modified Capabilities

Không có.

## Impact

- `admin-frontend/app/page.tsx` và metadata ứng dụng.
- `admin-frontend/components/checkin-workspace.tsx`.
- `admin-frontend/components/concert-setup.tsx`.
- `admin-frontend/components/integration-tabs.tsx`.
- Thêm helper định dạng nhãn UI dùng chung; không thêm dependency.
