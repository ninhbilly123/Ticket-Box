# TicketBox Scanner App

Ứng dụng Expo React Native dành cho nhân viên soát vé (`CHECKIN_STAFF`).

## Chạy dev bằng Expo Go

1. Chạy backend TicketBox ở laptop:

```bash
cd ../backend
npm run dev
```

2. Lấy IP LAN của laptop:

```powershell
ipconfig
```

Chọn IPv4 của Wi-Fi, ví dụ `192.168.1.10`.

3. Chạy scanner app:

```bash
cd ../scanner-app
npm install
npm start
```

4. Cài app **Expo Go** trên điện thoại Android, quét QR của Expo terminal.

5. Trong màn hình đăng nhập của Scanner App, nhập API base URL:

```text
http://<IP-LAN-cua-laptop>:3000/api/v1
```

Ví dụ:

```text
http://192.168.1.10:3000/api/v1
```

Không dùng `localhost` trên điện thoại thật vì `localhost` sẽ trỏ về chính điện thoại.

## Test nhanh

- Đăng nhập bằng tài khoản role `CHECKIN_STAFF`.
- App sẽ tải các concert/gate được phân công.
- Chọn concert/gate.
- Bấm `Mở camera quét QR` hoặc nhập mã thủ công.
- Tắt Wi-Fi/mobile data để test offline queue.
- Bật mạng lại và bấm `Đồng bộ lượt offline`.

## Build APK

Đăng nhập EAS:

```bash
npx eas login
```

Liên kết/tạo project EAS:

```bash
npx eas init
```

Build APK profile preview:

```bash
npm run build:apk
```

Sau khi build xong, EAS sẽ trả link tải APK để cài trên Android.
