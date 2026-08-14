# TicketBox Scanner Android

Ứng dụng Android native Kotlin dành cho nhân viên soát vé TicketBox.

## Mở bằng Android Studio

1. Mở Android Studio.
2. Chọn `Open`.
3. Chọn thư mục:

```text
C:\Users\HP\Downloads\SE_Project\Ticket-Box\scanner-android
```

4. Đợi Android Studio sync Gradle.
5. Cắm điện thoại Android hoặc mở emulator.
6. Bấm `Run`.

## Chạy backend khi test

Điện thoại và laptop cần cùng Wi-Fi.

```powershell
cd C:\Users\HP\Downloads\SE_Project\Ticket-Box
docker compose up -d postgres redis rabbitmq minio
cd backend
npm run dev
```

Trên điện thoại, kiểm tra backend trước:

```text
http://<IP-LAN-CUA-LAPTOP>:3000/health
```

Trong app nhập API URL:

```text
http://<IP-LAN-CUA-LAPTOP>:3000/api/v1
```

## Luồng sử dụng

1. Lưu API URL.
2. Đăng nhập bằng tài khoản `CHECKIN_STAFF`.
3. App tải danh sách concert/gate được phân công.
4. Chọn concert và gate.
5. Quét QR bằng camera hoặc nhập mã thủ công.
6. Khi mất mạng, lượt quét được lưu vào hàng đợi ngoại tuyến.
7. Khi có mạng lại, bấm `Đồng bộ lượt ngoại tuyến`.

## Ghi chú kỹ thuật

- Debug build cho phép HTTP cleartext để test backend local qua Wi-Fi.
- Main/release config không bật cleartext mặc định.
- Token và offline queue được tách vào local store riêng để `MainActivity` không ôm logic lưu trữ.
