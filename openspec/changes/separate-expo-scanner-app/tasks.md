## 1. Scanner app scaffold

- [x] 1.1 Tạo workspace `scanner-app/` bằng Expo React Native và TypeScript.
- [x] 1.2 Cấu hình env cho API base URL, app name, package id Android và build profile APK.
- [x] 1.3 Thêm scripts chạy dev, lint/typecheck và build APK bằng EAS.

## 2. Authentication and assignment

- [x] 2.1 Xây màn hình đăng nhập dùng API auth hiện có.
- [x] 2.2 Lưu access token/refresh token an toàn trong storage phù hợp cho mobile.
- [x] 2.3 Chỉ cho role `CHECKIN_STAFF` vào app; role khác hiển thị lỗi không có quyền.
- [x] 2.4 Tải danh sách concert/gate được phân công cho nhân viên hiện tại.

## 3. Online scanning

- [x] 3.1 Xây màn hình chọn concert/gate.
- [x] 3.2 Tích hợp camera quét QR trên điện thoại.
- [x] 3.3 Bổ sung nhập mã thủ công.
- [x] 3.4 Gọi API check-in online kèm Bearer token, `concertId`, `gateId`, `deviceId`, `scannedAtLocal`.
- [x] 3.5 Hiển thị trạng thái kết quả bằng giao diện rõ ràng: hợp lệ, đã dùng, sai concert, sai ngày, vé hủy, vé không hợp lệ.

## 4. Offline queue and sync

- [x] 4.1 Tạo local offline queue namespace theo staff/concert/device.
- [x] 4.2 Khi mất mạng, lưu lượt quét vào queue và hiển thị "đã lưu tạm".
- [x] 4.3 Khi có mạng, đồng bộ queue theo thứ tự `scannedAtLocal`.
- [x] 4.4 Lưu kết quả sync: `SYNCED`, `CONFLICT`, `FAILED`.
- [x] 4.5 Thêm màn hình xem số lượt pending/conflict và retry sync thủ công.

## 5. Admin boundary cleanup

- [x] 5.1 Điều chỉnh admin frontend để phần soát vé chỉ còn quản lý/phân công/xem báo cáo, không là công cụ quét chính tại cổng.
- [x] 5.2 Nếu còn scanner workspace trong admin, chuyển thành fallback/demo hoặc gỡ khỏi navigation của `CHECKIN_STAFF`.
- [x] 5.3 Thêm hướng dẫn tải/cài APK cho nhân viên soát vé nếu cần.

## 6. Verification

- [x] 6.1 Chạy backend build để đảm bảo API check-in không bị ảnh hưởng.
- [x] 6.2 Chạy admin frontend build nếu có chỉnh UI.
- [x] 6.3 Chạy scanner app typecheck/lint.
- [ ] 6.4 Test online scan trên thiết bị thật bằng Expo Go.
- [ ] 6.5 Test offline queue bằng cách tắt mạng, quét vài mã, bật mạng và sync.
- [ ] 6.6 Build APK và cài thử trên Android.
- [x] 6.7 Chạy OpenSpec strict validation.
