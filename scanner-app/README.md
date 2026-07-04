# TicketBox Scanner App

Ung dung Expo React Native danh cho nhan vien soat ve (`CHECKIN_STAFF`).

## Luu y quan trong khi test tren dien thoai

Khong dung:

```text
http://localhost:3000/api/v1
```

Tren dien thoai that, `localhost` la chinh dien thoai, khong phai laptop dang chay backend.

Hay dung IP LAN cua laptop:

```text
http://<IP-LAN-cua-laptop>:3000/api/v1
```

Vi du:

```text
http://192.168.1.10:3000/api/v1
```

APK da cau hinh `android.usesCleartextTraffic=true` de cho phep goi HTTP local khi demo. Sau khi sua cau hinh nay phai build lai APK, APK cu khong tu cap nhat.

## Chay backend

```bash
cd ../backend
npm run dev
```

Backend dang listen `0.0.0.0:3000`, nen dien thoai cung Wi-Fi co the goi qua IP LAN cua laptop.

Neu dien thoai khong ket noi duoc:

- Kiem tra laptop va dien thoai cung mang Wi-Fi.
- Kiem tra Windows Firewall co chan port `3000` khong.
- Thu mo tren trinh duyet dien thoai: `http://<IP-LAN>:3000/health`.

## Chay dev bang Expo Go

```bash
cd ../scanner-app
npm install
npm start
```

Mo Expo Go tren dien thoai va quet QR trong terminal.

Trong man hinh dang nhap cua Scanner App:

1. Nhap API base URL bang IP LAN cua laptop.
2. Bam `Luu API URL`.
3. Dang nhap bang tai khoan role `CHECKIN_STAFF`.

## Test bang APK

Neu da cai APK cu, nen go app hoac xoa data app truoc khi cai ban moi de tranh con luu API URL cu la `localhost`.

Build APK:

```bash
npx eas login
npx eas init
npm run build:apk
```

Tai APK moi tu link EAS, cai vao Android, sau do nhap API base URL bang IP LAN cua laptop:

```text
http://<IP-LAN-cua-laptop>:3000/api/v1
```

## Test nhanh

- Dang nhap bang tai khoan role `CHECKIN_STAFF`.
- App tai cac concert/gate duoc phan cong.
- Chon concert/gate.
- Bam `Mo camera quet QR` hoac nhap ma thu cong.
- Tat Wi-Fi/mobile data de test offline queue.
- Bat mang lai va bam `Dong bo luot offline`.
