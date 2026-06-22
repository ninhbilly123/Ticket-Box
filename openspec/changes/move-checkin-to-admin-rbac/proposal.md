## Why

Trang soát vé là công cụ vận hành nội bộ nhưng hiện nằm trong customer frontend và các API check-in chưa được bảo vệ bằng JWT/RBAC. Điều này làm lẫn trải nghiệm khách hàng với nghiệp vụ cổng vào và cho phép request soát vé không xác định đúng nhân viên đang đăng nhập.

## What Changes

- Gỡ route và liên kết `Check-in` khỏi customer frontend.
- Chuyển toàn bộ scanner QR, nhập mã tay, offline sync, tra cứu VIP và thống kê sang admin frontend.
- Dùng cùng màn hình đăng nhập admin frontend, sau đó render dashboard quản trị cho `ORGANIZER` hoặc scanner workspace cho `CHECKIN_STAFF`.
- Chỉ cho nhân viên soát vé xem và thao tác các concert đã được phân công qua `StaffAssignment`.
- **BREAKING**: Toàn bộ API `/api/v1/checkins/*` bắt buộc Bearer JWT role `CHECKIN_STAFF`; request ẩn danh, `AUDIENCE` hoặc `ORGANIZER` bị từ chối.
- Loại bỏ cơ chế staff mặc định/header giả lập; backend ghi nhận `gateStaffId` từ user trong access token.
- Offline sync bổ sung `concertId` để kiểm tra quyền phân công và ngăn đồng bộ vé của concert khác.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `ticket-scanning`: Bổ sung JWT/RBAC, concert assignment, nguồn nhận diện staff và vị trí scanner trong admin frontend.
- `admin-integration-ui`: Thay đổi shell đăng nhập để hiển thị giao diện theo role thay vì từ chối mọi tài khoản không phải organizer.

## Impact

- `frontend/app/(public)/checkin` và `frontend/components/CustomerHeader.tsx`.
- `frontend/lib/api.ts` và dependency `html5-qrcode` của customer frontend.
- `admin-frontend/app/page.tsx`, `admin-frontend/components`, `admin-frontend/lib/api.ts` và dependencies.
- `backend/src/modules/checkin` cùng middleware auth/RBAC hiện có.
- Không cần migration database; sử dụng `StaffAssignment` hiện tại.
