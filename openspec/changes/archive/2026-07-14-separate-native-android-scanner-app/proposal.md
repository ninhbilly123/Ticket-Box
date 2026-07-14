## Why

Trang soat ve khong nen phu thuoc vao admin web khi nhan vien dung dien thoai tai cong. Trong qua trinh test ban mobile cross-platform truoc do, Android van chan HTTP local va viec cau hinh cleartext qua build cloud tao them rui ro. Nhom chot chuyen scanner sang Android native de demo on dinh bang Android Studio, camera native va APK cai truc tiep.

He thong can mot Scanner App rieng bang Kotlin/Android native, dung cho role `CHECKIN_STAFF`. Admin web van quan ly su kien, phan cong nhan vien, xem bao cao va cac tich hop; nhan vien soat ve dung app Android tren dien thoai.

## What Changes

- Them workspace `scanner-android/` la project Android Studio native.
- App viet bang Kotlin, dung CameraX de mo camera va ML Kit Barcode Scanning de doc QR.
- App dang nhap bang API auth hien co va chi chap nhan user role `CHECKIN_STAFF`.
- App tai danh sach concert/gate duoc phan cong qua `StaffAssignment`.
- App ho tro quet QR, nhap ma thu cong, check-in online va hien thi ket qua ro rang.
- App luu offline queue cuc bo theo staff/concert/device khi mat mang va dong bo lai qua API `/checkins/sync`.
- App cau hinh `usesCleartextTraffic` va `network_security_config` de goi backend local `http://<LAN-IP>:3000/api/v1` khi demo.
- Admin web khong con la cong cu chinh de quet camera tai cong; admin chi giu cac man hinh quan ly, phan cong va bao cao.

## Impact

- Them `scanner-android/` vao repo.
- Yeu cau may dev cai Android Studio, Android SDK va JDK di kem Android Studio.
- Backend check-in tiep tuc dung JWT/RBAC va endpoint hien co; khong doi ban chat API.
- Tai khoan nhan vien soat ve dung role `CHECKIN_STAFF`; organizer khong dung app de quet.
- APK demo duoc build/run tu Android Studio hoac Gradle Android project.

## Out of Scope

- Khong tiep tuc phat trien client mobile cross-platform cu lam client chinh.
- Chua lam iOS native.
- Chua publish len Google Play/App Store.
- Chua yeu cau thiet bi quet QR chuyen dung.
