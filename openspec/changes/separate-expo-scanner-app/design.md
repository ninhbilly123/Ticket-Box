## Approach

### App Boundary

`scanner-app/` là client vận hành riêng cho nhân viên soát vé. App không chứa chức năng quản trị concert, không tạo ticket type, không xử lý AI Bio và không quản lý VIP sync. Những phần đó vẫn thuộc `admin-frontend`.

Luồng chính:

1. Nhân viên mở Scanner App trên điện thoại.
2. Đăng nhập bằng tài khoản `CHECKIN_STAFF`.
3. App tải danh sách concert/gate được phân công.
4. Nhân viên chọn concert/gate.
5. App quét QR hoặc nhập mã tay.
6. Nếu online, app gọi API check-in ngay.
7. Nếu offline, app lưu lượt quét vào hàng đợi local.
8. Khi có mạng, app đồng bộ các lượt quét offline theo thứ tự thời gian.

### Role

Chọn role `CHECKIN_STAFF` cho nhân viên soát vé vì role này đã thể hiện đúng trách nhiệm: chỉ thao tác check-in, không có quyền quản trị sự kiện.

Backend tiếp tục là nguồn kiểm tra quyền cuối cùng:

- JWT phải hợp lệ.
- User phải có role `CHECKIN_STAFF`.
- User phải được phân công concert/gate đang thao tác.

### Offline Storage

App lưu offline queue bằng storage local của mobile app. Mỗi record tối thiểu gồm:

- `localId`
- `ticketId` hoặc `qrToken`
- `concertId`
- `gateId`
- `deviceId`
- `scannedAtLocal`
- `syncStatus`: `PENDING`, `SYNCED`, `CONFLICT`, `FAILED`
- `lastError`

Offline queue phải namespace theo staff/concert/device để tránh đồng bộ nhầm giữa nhiều tài khoản trên cùng thiết bị.

### Conflict Handling

Khi sync offline, backend vẫn áp dụng quy tắc First-Scan Wins. App không tự quyết định vé hợp lệ nếu đang offline; app chỉ hiển thị "đã lưu tạm" và kết quả cuối cùng được xác nhận sau khi sync.

Nếu backend trả conflict như `ALREADY_USED`, `WRONG_CONCERT`, `WRONG_DATE`, `INVALID_TICKET`, app giữ record ở trạng thái `CONFLICT` để nhân viên xem lại.

### APK Build

Vì yêu cầu có APK, implementation nên dùng Expo + EAS Build:

- Dev nhanh: `npx expo start` và test bằng Expo Go.
- Build APK: cấu hình `eas.json` với Android profile tạo APK.

Máy dev cần:

- Node.js LTS.
- Expo CLI chạy qua `npx`.
- Tài khoản Expo/EAS để build cloud, hoặc Android Studio/JDK nếu build native local.
- Điện thoại Android để cài APK demo.

### Admin Web

Admin web vẫn có thể có trang:

- danh sách nhân viên/gate được phân công,
- thống kê check-in,
- lịch sử scan,
- link/tài liệu tải APK.

Admin web không nên là luồng chính để mở camera và quét tại cổng.
