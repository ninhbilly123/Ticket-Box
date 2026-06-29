## Context

Customer frontend hiện có route `/checkin`, liên kết điều hướng công khai, dependency `html5-qrcode` và các hàm check-in không gửi access token. Backend `/api/v1/checkins` cũng chưa gắn middleware auth; controller nhận `gateStaffId` từ body/header hoặc tự chọn một staff mặc định.

Admin frontend đã có một session chung lưu access/refresh token và role `ORGANIZER | CHECKIN_STAFF | AUDIENCE`, nhưng hiện từ chối mọi role không phải `ORGANIZER`. Database đã có `StaffAssignment(staffId, concertId, gateId)` và `AuthorizationService.canScanConcert`, nên không cần migration.

## Goals / Non-Goals

**Goals:**

- Customer frontend chỉ phục vụ khán giả và không còn scanner.
- Admin frontend dùng một login shell, tự chọn dashboard organizer hoặc scanner staff theo role.
- Mọi check-in API xác thực JWT, lấy staff ID từ token và kiểm tra assignment theo concert.
- Scanner giữ các chức năng camera, nhập mã tay, offline sync, VIP và thống kê.
- Staff chỉ nhìn thấy các concert/gate đã được organizer phân công.

**Non-Goals:**

- Không cho organizer sử dụng scanner nếu không có role `CHECKIN_STAFF`.
- Không thay đổi thuật toán xác thực QR hoặc trạng thái vé ngoài việc bổ sung authorization.
- Không thay đổi schema database hoặc tạo role mới.
- Không chuyển các chức năng quản trị organizer sang route khác.

## Decisions

### 1. RBAC được quyết định sau khi khôi phục session

`admin-frontend/app/page.tsx` tiếp tục sở hữu login/session. Sau khi xác thực, role `ORGANIZER` render dashboard hiện tại, `CHECKIN_STAFF` render `CheckinWorkspace`, còn `AUDIENCE` render access denied. Cách này dùng chung logout/token lifecycle và tránh tạo một hệ đăng nhập thứ hai.

### 2. Scanner là component riêng trong admin frontend

Page check-in hiện tại được chuyển thành `admin-frontend/components/checkin-workspace.tsx` và nhận `session` cùng callback logout qua props. Component không nằm trong tab organizer vì hai role có nhiệm vụ và mật độ UI khác nhau.

### 3. Check-in API bắt buộc CHECKIN_STAFF

Router check-in dùng `authenticate` và `requireRoles('CHECKIN_STAFF')` cho toàn bộ endpoint. Controller không còn tin `gateStaffId` từ client; mọi log dùng `req.user.id`. Đây là boundary bảo mật chính, còn việc ẩn UI chỉ là lớp trải nghiệm.

### 4. Concert list lấy từ StaffAssignment

Thêm `GET /checkins/concerts`, trả các concert được phân công cho staff đăng nhập cùng danh sách `gateIds`. Scanner không dùng public concert list hoặc admin organizer API. Mọi endpoint theo concert gọi `canScanConcert` trước khi đọc/ghi dữ liệu.

### 5. Offline logs gắn với concert

Local storage được namespace theo staff và lưu `concertId` cho mỗi lượt quét. Request sync gửi `concertId`; backend kiểm tra assignment và xác nhận từng vé thuộc concert đó. Log cũ không có concert ID không được tự động gửi dưới danh tính staff mới.

### 6. Dependency camera chuyển ownership

`html5-qrcode` được thêm vào admin frontend và gỡ khỏi customer frontend sau khi route cũ bị xóa. Không thêm thư viện scanner khác để giữ hành vi camera hiện tại.

## Risks / Trade-offs

- **API cũ không còn gọi ẩn danh được** → Đây là breaking change có chủ đích; admin scanner luôn gửi Bearer token.
- **Offline log cũ trong customer origin không tự chuyển sang admin origin/port** → Không migrate dữ liệu localStorage giữa origins; các log cũ cần được sync trước khi nâng cấp.
- **Staff có nhiều gate cho cùng concert** → API trả `gateIds`; UI chọn gate và dùng gate làm device ID mặc định, authorization chấp nhận assignment của concert.
- **Access token hết hạn khi đang quét** → API trả 401, scanner hiển thị lỗi và người dùng đăng nhập lại; không fallback sang staff mặc định.

## Migration Plan

1. Bảo vệ backend check-in routes và thêm assigned-concert endpoint.
2. Bổ sung check-in API có token trong admin frontend.
3. Chuyển scanner component và áp role branch trong admin shell.
4. Gỡ route/link/API/dependency check-in khỏi customer frontend.
5. Build backend, admin frontend và customer frontend; kiểm tra role organizer, staff và audience.
6. Rollback bằng cách phục hồi route customer và middleware cũ, nhưng không khuyến nghị vì sẽ mở lại API ẩn danh.

## Open Questions

Không có. Role và StaffAssignment hiện tại đủ để triển khai.
