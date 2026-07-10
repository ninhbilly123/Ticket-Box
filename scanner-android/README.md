# TicketBox Scanner Native Android

Ung dung Android native viet bang Kotlin cho nhan vien soat ve.

## Mo bang Android Studio

1. Mo Android Studio.
2. Chon `Open`.
3. Chon thu muc:

```text
C:\Users\HP\Downloads\TKPM\Project_TicketBox\Ticket-Box-\scanner-android
```

4. Doi Android Studio sync Gradle xong.
5. Cam dien thoai Android bang USB hoac mo emulator.
6. Bam `Run`.

## Cau hinh backend khi test

Dien thoai va laptop phai cung Wi-Fi.

Tren laptop chay backend:

```powershell
cd C:\Users\HP\Downloads\TKPM\Project_TicketBox\Ticket-Box-
docker compose up -d postgres redis rabbitmq minio
cd backend
npm run dev
```

Tren trinh duyet dien thoai, test truoc:

```text
http://192.168.1.5:3000/health
```

Neu link nay khong mo duoc thi app cung khong login duoc. Kiem tra lai IP laptop, cung Wi-Fi va Windows Firewall.

## Dang nhap app

Trong app nhap API URL:

```text
http://192.168.1.5:3000/api/v1
```

Tai khoan seed:

```text
Email: staff@example.com
Password: Password123!
```

Hoac:

```text
Email: staff2@example.com
Password: Password123!
```

## Luong test

1. Luu API URL.
2. Dang nhap bang tai khoan `CHECKIN_STAFF`.
3. App tai concert/gate duoc phan cong.
4. Chon concert va gate.
5. Quet QR bang camera hoac dan ma ve thu cong.
6. Tat mang de test offline queue.
7. Bat mang lai va bam `Dong bo luot offline`.

## Vi sao app nay khong bi loi CLEARTEXT

Project da khai bao trong `AndroidManifest.xml`:

```xml
android:usesCleartextTraffic="true"
android:networkSecurityConfig="@xml/network_security_config"
```

Va `network_security_config.xml` cho phep HTTP cleartext de demo voi backend local.
