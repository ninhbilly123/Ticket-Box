## 1. Android scanner scaffold

- [x] 1.1 Tao workspace `scanner-android/` la Android Studio project.
- [x] 1.2 Cau hinh Gradle Kotlin Android application module `app`.
- [x] 1.3 Cau hinh `applicationId`, app name va Android manifest.
- [x] 1.4 Bat AndroidX trong `gradle.properties`.
- [x] 1.5 Cau hinh `usesCleartextTraffic` va `network_security_config` de demo voi backend HTTP local.

## 2. Authentication and assignment

- [x] 2.1 Xay man hinh dang nhap dung API auth hien co.
- [x] 2.2 Luu API base URL, access token, user id va device id trong local storage cua Android.
- [x] 2.3 Chi cho role `CHECKIN_STAFF` vao app; role khac hien thi loi khong co quyen.
- [x] 2.4 Tai danh sach concert/gate duoc phan cong cho nhan vien hien tai.

## 3. Online scanning

- [x] 3.1 Xay man hinh chon concert/gate.
- [x] 3.2 Tich hop CameraX preview va image analysis.
- [x] 3.3 Tich hop ML Kit Barcode Scanning de doc QR.
- [x] 3.4 Bo sung nhap ma thu cong.
- [x] 3.5 Goi API check-in online kem Bearer token, `concertId`, `gateId`, `deviceId`, `scannedAtLocal`.
- [x] 3.6 Hien thi trang thai ket qua: hop le, da dung, sai concert, sai ngay, ve huy, ve khong hop le.

## 4. Offline queue and sync

- [x] 4.1 Tao local offline queue namespace theo staff/concert/device.
- [x] 4.2 Khi mat mang, luu luot quet vao queue va hien thi "da luu tam".
- [x] 4.3 Khi co mang, dong bo queue theo thu tu `scannedAtLocal`.
- [x] 4.4 Luu ket qua sync: `SYNCED`, `CONFLICT`, `FAILED`.
- [x] 4.5 Hien thi so luot pending/conflict va cho retry sync thu cong.

## 5. Admin boundary cleanup

- [x] 5.1 Dieu chinh spec de admin frontend chi la noi quan ly/phan cong/xem bao cao.
- [x] 5.2 Ghi ro Android Scanner App la client chinh cho nhan vien tai cong.
- [x] 5.3 Them README huong dan mo bang Android Studio va test voi backend LAN.

## 6. Verification

- [ ] 6.1 Sync Gradle project trong Android Studio.
- [ ] 6.2 Build/run app tren thiet bi Android that hoac emulator.
- [ ] 6.3 Test login bang `staff@example.com`.
- [ ] 6.4 Test online scan tren thiet bi that.
- [ ] 6.5 Test offline queue bang cach tat mang, quet vai ma, bat mang va sync.
- [ ] 6.6 Xac nhan app goi duoc backend local qua `http://<LAN-IP>:3000/api/v1`.
- [ ] 6.7 Chay OpenSpec strict validation neu CLI co san.
