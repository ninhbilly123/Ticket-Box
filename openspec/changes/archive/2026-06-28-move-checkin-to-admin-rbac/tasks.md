## 1. Bảo vệ backend check-in bằng RBAC

- [x] 1.1 Gắn `authenticate` và `requireRoles('CHECKIN_STAFF')` cho toàn bộ check-in router.
- [x] 1.2 Thêm endpoint trả concert/gate được phân công cho staff hiện tại.
- [x] 1.3 Dùng `req.user.id` làm `gateStaffId` và loại bỏ staff mặc định/body/header giả lập.
- [x] 1.4 Kiểm tra `canScanConcert` cho scan, VIP list, VIP check-in và stats.
- [x] 1.5 Bổ sung `concertId` cho offline sync và từ chối vé thuộc concert khác.

## 2. Chuyển scanner sang admin frontend

- [x] 2.1 Bổ sung types và API check-in có bearer token vào `admin-frontend/lib/api.ts`.
- [x] 2.2 Thêm dependency `html5-qrcode` vào admin frontend.
- [x] 2.3 Tạo `CheckinWorkspace` trong admin frontend từ scanner hiện tại.
- [x] 2.4 Chỉ tải concert được phân công và hiển thị gate/device phù hợp.
- [x] 2.5 Namespace offline logs theo staff/concert và gửi `concertId` khi sync.
- [x] 2.6 Giữ camera, nhập mã tay, kết quả scan, VIP guest list và thống kê responsive.

## 3. Áp dụng role-based UI trong admin shell

- [x] 3.1 Render dashboard hiện tại khi role là `ORGANIZER`.
- [x] 3.2 Render `CheckinWorkspace` khi role là `CHECKIN_STAFF` mà không gọi API organizer.
- [x] 3.3 Giữ access denied cho `AUDIENCE` và role không được hỗ trợ.
- [x] 3.4 Cập nhật nội dung login để dùng chung cho organizer và check-in staff.

## 4. Dọn customer frontend

- [x] 4.1 Xóa liên kết Check-in khỏi customer header.
- [x] 4.2 Xóa route `/checkin` và các check-in types/API không còn dùng khỏi customer frontend.
- [x] 4.3 Gỡ dependency `html5-qrcode` khỏi customer frontend.

## 5. Kiểm thử và xác nhận

- [x] 5.1 Build backend, admin frontend và customer frontend.
- [x] 5.2 Kiểm tra request ẩn danh/organizer bị từ chối và staff chỉ thấy concert được phân công.
- [x] 5.3 Kiểm tra trực quan organizer dashboard và staff scanner trên desktop/mobile.
- [x] 5.4 Chạy OpenSpec strict validation và xác nhận toàn bộ task hoàn thành.
