## Approach

### App Boundary

`scanner-android/` la client van hanh rieng cho nhan vien soat ve. App khong chua chuc nang quan tri concert, khong tao ticket type, khong xu ly AI Bio va khong quan ly VIP sync. Nhung phan do van thuoc `admin-frontend`.

Luong chinh:

1. Nhan vien mo TicketBox Scanner tren dien thoai Android.
2. Nhap API base URL cua backend demo, vi du `http://192.168.1.5:3000/api/v1`.
3. Dang nhap bang tai khoan `CHECKIN_STAFF`.
4. App tai danh sach concert/gate duoc phan cong.
5. Nhan vien chon concert/gate.
6. App quet QR bang camera hoac nhap ma tay.
7. Neu online, app goi API check-in ngay.
8. Neu offline, app luu luot quet vao hang doi local.
9. Khi co mang, app dong bo cac luot quet offline theo thu tu thoi gian.

### Technology

Implementation dung Android native:

- Kotlin cho logic app.
- Android Studio/Gradle lam moi truong build.
- CameraX cho preview va image analysis.
- ML Kit Barcode Scanning de doc QR.
- OkHttp de goi backend.
- SharedPreferences de luu API URL, access token toi thieu, device id va offline queue.

App Android khai bao:

- `android.permission.INTERNET`
- `android.permission.CAMERA`
- `android.permission.ACCESS_NETWORK_STATE`
- `android:usesCleartextTraffic="true"`
- `android:networkSecurityConfig="@xml/network_security_config"`

Cleartext chi phuc vu demo local trong mang LAN. Moi truong production nen dung HTTPS.

### Role and Authorization

Backend tiep tuc la nguon kiem tra quyen cuoi cung:

- JWT phai hop le.
- User phai co role `CHECKIN_STAFF`.
- User phai duoc phan cong concert/gate dang thao tac.

App cung chan som role khong hop le sau login de tranh hien thi man hinh quet cho organizer/audience.

### Offline Storage

Offline queue duoc luu cuc bo tren thiet bi. Moi record toi thieu gom:

- `localId`
- `ticketId` hoac `qrToken`
- `concertId`
- `gateId`
- `deviceId`
- `staffId`
- `scannedAtLocal`
- `syncStatus`: `PENDING`, `SYNCED`, `CONFLICT`, `FAILED`
- `lastError`

Queue phai namespace theo staff/concert/device de tranh dong bo nham khi mot thiet bi duoc nhieu nhan vien dung chung.

### Conflict Handling

Khi sync offline, backend ap dung quy tac First-Scan Wins. App khong tu quyet dinh ve hop le khi offline; app chi hien thi "da luu tam". Ket qua cuoi cung duoc xac nhan sau khi sync.

Neu backend tra `ALREADY_USED`, `WRONG_CONCERT`, `WRONG_DATE`, `INVALID_TICKET` hoac `CANCELLED`, app giu record o trang thai `CONFLICT` de nhan vien xem lai.

### Build and Test

May dev can:

- Android Studio.
- Android SDK/Build Tools do Android Studio cai.
- Dien thoai Android bat USB debugging hoac emulator.
- Backend chay tren laptop va dien thoai cung Wi-Fi.

Quy trinh demo:

1. Mo `scanner-android/` bang Android Studio.
2. Sync Gradle.
3. Run app len dien thoai.
4. Nhap API URL bang IP LAN cua laptop.
5. Dang nhap staff seed va test online/offline scan.

### Admin Web

Admin web van co the co:

- danh sach nhan vien/gate duoc phan cong,
- thong ke check-in,
- lich su scan,
- huong dan cai APK.

Admin web khong nen la luong chinh de mo camera va quet tai cong.
