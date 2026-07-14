# Scanner Mobile App Specification

## Purpose
Đặc tả chi tiết ứng dụng soát vé di động native Android (Scanner Mobile App) hoạt động độc lập, hỗ trợ quét trực tuyến (online) và lưu trữ tạm/đồng bộ ngoại tuyến (offline) cho nhân sự tại cổng.

## Requirements

### Requirement: Native Android Scanner App
He thong SHALL cung cap mot ung dung Android native rieng trong workspace `scanner-android/` de nhan vien soat ve thao tac tai cong bang dien thoai Android.

#### Scenario: Nhan vien mo Android Scanner App
- **WHEN** nhan vien soat ve can van hanh tai cong
- **THEN** nhan vien SHALL dung Android Scanner App thay vi admin web
- **AND** app SHALL chay duoc tren dien thoai Android that hoac emulator trong qua trinh demo.

#### Scenario: Project duoc mo bang Android Studio
- **WHEN** developer mo workspace `scanner-android/` bang Android Studio
- **THEN** project SHALL sync Gradle nhu mot Android application project
- **AND** app SHALL co module `app` voi package Android rieng.

#### Scenario: Role khong hop le mo app
- **WHEN** user dang nhap Scanner App nhung khong co role `CHECKIN_STAFF`
- **THEN** app SHALL tu choi vao man hinh quet
- **AND** app SHALL hien thi thong bao khong co quyen soat ve.

---

### Requirement: Local HTTP Backend Demo Support
Android Scanner App SHALL ho tro ket noi backend demo chay trong mang LAN bang API base URL do nhan vien/developer nhap.

#### Scenario: Nhap API URL LAN
- **WHEN** nhan vien nhap `http://<LAN-IP>:3000/api/v1`
- **THEN** app SHALL luu API base URL tren thiet bi
- **AND** cac request auth/check-in SHALL dung URL da luu.

#### Scenario: Ket noi HTTP local
- **WHEN** app goi backend demo qua HTTP local
- **THEN** Android manifest SHALL cho phep cleartext traffic
- **AND** app SHALL co `network_security_config` cho phep HTTP trong moi truong demo.

---

### Requirement: Staff Assignment Selection
Scanner App SHALL chi hien thi cac concert va gate ma nhan vien hien tai duoc phan cong.

#### Scenario: Nhan vien co phan cong
- **WHEN** nhan vien dang nhap thanh cong
- **THEN** app SHALL goi API lay danh sach concert/gate duoc phan cong
- **AND** app SHALL cho nhan vien chon mot concert/gate truoc khi quet.

#### Scenario: Nhan vien chua duoc phan cong
- **WHEN** nhan vien dang nhap nhung khong co `StaffAssignment`
- **THEN** app SHALL khong mo camera quet
- **AND** app SHALL hien thi trang thai chua duoc phan cong.

---

### Requirement: Native QR Scan and Manual Entry
Scanner App SHALL ho tro quet QR bang CameraX/ML Kit va nhap ma thu cong.

#### Scenario: Quet QR online
- **WHEN** nhan vien quet QR trong trang thai co mang
- **THEN** app SHALL gui token len API check-in kem Bearer token, `concertId`, `gateId`, `deviceId`, `scannedAtLocal`
- **AND** app SHALL hien thi ket qua tra ve tu backend.

#### Scenario: Camera khong dung duoc
- **WHEN** camera khong duoc cap quyen hoac khong quet duoc QR
- **THEN** app SHALL cho phep nhan vien nhap ma ve thu cong
- **AND** app SHALL xu ly ket qua giong luong quet QR.

---

### Requirement: Offline Check-in Queue
Scanner App SHALL luu luot quet vao hang doi cuc bo khi khong co mang va dong bo lai khi co mang.

#### Scenario: Quet khi mat mang
- **WHEN** app khong ket noi duoc backend tai thoi diem quet
- **THEN** app SHALL luu luot quet vao offline queue voi `syncStatus` la `PENDING`
- **AND** app SHALL hien thi rang luot quet moi chi duoc luu tam, chua xac nhan hop le.

#### Scenario: Dong bo lai khi co mang
- **WHEN** app co mang tro lai va offline queue co record `PENDING`
- **THEN** app SHALL dong bo cac luot quet theo thu tu `scannedAtLocal`
- **AND** app SHALL cap nhat tung record thanh `SYNCED`, `CONFLICT` hoac `FAILED`.

#### Scenario: Co xung dot khi sync
- **WHEN** backend tra `ALREADY_USED`, `WRONG_CONCERT`, `WRONG_DATE`, `INVALID_TICKET` hoac `CANCELLED` cho mot luot quet offline
- **THEN** app SHALL luu record do la `CONFLICT`
- **AND** app SHALL cho nhan vien xem ly do xung dot.

---

### Requirement: Android APK Build
Scanner App SHALL co cau hinh build Android APK phuc vu demo va cai dat tren thiet bi that.

#### Scenario: Build APK demo
- **WHEN** developer build project bang Android Studio hoac Gradle
- **THEN** he thong SHALL tao duoc APK Android
- **AND** APK SHALL ket noi duoc backend demo thong qua API base URL da cau hinh.
