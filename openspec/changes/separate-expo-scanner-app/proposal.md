## Why

Trang soát vé hiện đang nằm chung trong admin web. Cách này phù hợp để demo nghiệp vụ trên laptop, nhưng không phù hợp với nhân viên đứng tại cổng vì thao tác chính là mở camera điện thoại, quét QR nhanh, xử lý mạng chập chờn và đồng bộ lại khi có mạng.

Hệ thống cần tách một Scanner App riêng bằng Expo React Native để đúng với C4 level 2: `Scanner App [React Native / PWA]`. Admin web vẫn quản lý sự kiện, phân công nhân viên và xem báo cáo; nhân viên soát vé dùng app riêng trên điện thoại.

## What Changes

- Thêm workspace mới `scanner-app/` dùng Expo React Native.
- Scanner App đăng nhập bằng tài khoản role `CHECKIN_STAFF`.
- Sau khi đăng nhập, app chỉ hiển thị concert/gate mà nhân viên được phân công qua `StaffAssignment`.
- App quét QR bằng camera điện thoại, hỗ trợ nhập mã thủ công khi camera lỗi.
- App gọi API check-in online hiện có của backend và hiển thị kết quả rõ ràng: hợp lệ, đã dùng, sai concert, sai ngày, vé hủy, vé không hợp lệ.
- App hỗ trợ offline check-in: lưu lượt quét cục bộ theo staff/concert/device khi mất mạng và đồng bộ lại khi có mạng.
- Admin web không còn là công cụ chính để quét tại cổng; admin chỉ giữ các màn hình quản lý/phân công/xem báo cáo check-in.
- Build APK bằng Expo/EAS để có file cài đặt Android cho demo.

## Impact

- Thêm `scanner-app/` vào repo.
- Có thể cần bổ sung endpoint/config nhỏ nếu backend hiện chưa đủ thông tin cho mobile app, nhưng không thay đổi bản chất API check-in.
- Admin frontend cần tách rõ khu vực quản lý soát vé khỏi thao tác quét trực tiếp.
- Tài khoản nhân viên soát vé dùng role `CHECKIN_STAFF`; organizer không dùng app để quét.
- Máy dev cần cài Node.js, Expo tooling và cấu hình EAS/Android build để tạo APK.

## Out of Scope

- Chưa làm native Android/iOS thuần.
- Chưa publish lên Google Play/App Store.
- Chưa yêu cầu thiết bị quét QR chuyên dụng.
