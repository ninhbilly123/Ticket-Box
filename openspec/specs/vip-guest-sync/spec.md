# vip-guest-sync Specification

## Purpose
TBD - created by archiving change add-ai-bio-and-vip-guest-sync. Update Purpose after archive.
## Requirements
### Requirement: Quáº£n lÃ½ email nhÃ  tÃ i trá»£ Ä‘Æ°á»£c phÃ©p gá»­i CSV
Há»‡ thá»‘ng SHALL cho phÃ©p ban tá»• chá»©c cáº¥u hÃ¬nh danh sÃ¡ch email nhÃ  tÃ i trá»£ Ä‘Æ°á»£c phÃ©p gá»­i file CSV khÃ¡ch má»i VIP vÃ o mailbox cá»§a TicketBox.

#### Scenario: ThÃªm email nhÃ  tÃ i trá»£ há»£p lá»‡
- **WHEN** Ban tá»• chá»©c thÃªm má»™t Ä‘á»‹a chá»‰ email nhÃ  tÃ i trá»£ vÃ o danh sÃ¡ch cho phÃ©p
- **THEN** há»‡ thá»‘ng SHALL lÆ°u Ä‘á»‹a chá»‰ email Ä‘Ã³ á»Ÿ tráº¡ng thÃ¡i Ä‘ang hoáº¡t Ä‘á»™ng
- **AND** worker import CSV SHALL chá»‰ xá»­ lÃ½ file Ä‘Ã­nh kÃ¨m tá»« cÃ¡c sender Ä‘ang hoáº¡t Ä‘á»™ng trong danh sÃ¡ch cho phÃ©p

#### Scenario: Bá» qua email tá»« sender khÃ´ng há»£p lá»‡
- **WHEN** worker IMAP phÃ¡t hiá»‡n email cÃ³ file CSV nhÆ°ng sender khÃ´ng náº±m trong danh sÃ¡ch cho phÃ©p
- **THEN** há»‡ thá»‘ng SHALL khÃ´ng import file CSV Ä‘Ã³
- **AND** há»‡ thá»‘ng SHALL ghi nháº­n sá»± kiá»‡n bá»‹ bá» qua Ä‘á»ƒ phá»¥c vá»¥ audit

### Requirement: Äá»c file CSV Ä‘á»‹nh ká»³ tá»« mailbox IMAP
Há»‡ thá»‘ng SHALL cháº¡y tÃ¡c vá»¥ ná»n theo lá»‹ch Ä‘á»ƒ Ä‘Äƒng nháº­p mailbox IMAP tháº­t, tÃ¬m email má»›i cÃ³ file CSV Ä‘Ã­nh kÃ¨m vÃ  táº¡o job import cho cÃ¡c file há»£p lá»‡.

#### Scenario: PhÃ¡t hiá»‡n CSV há»£p lá»‡ trong mailbox
- **WHEN** cron worker cháº¡y Ä‘áº¿n lá»‹ch Ä‘á»c mailbox vÃ  phÃ¡t hiá»‡n email má»›i tá»« sender há»£p lá»‡ cÃ³ file CSV Ä‘Ã­nh kÃ¨m
- **THEN** há»‡ thá»‘ng SHALL lÆ°u file CSV gá»‘c vÃ o MinIO
- **AND** há»‡ thá»‘ng SHALL táº¡o import job tráº¡ng thÃ¡i `PENDING` hoáº·c `PROCESSING`
- **AND** há»‡ thá»‘ng SHALL Ä‘Ã¡nh dáº¥u message/attachment Ä‘Ã£ Ä‘Æ°á»£c phÃ¡t hiá»‡n Ä‘á»ƒ trÃ¡nh import trÃ¹ng cÃ¹ng má»™t file

#### Scenario: KhÃ´ng cÃ³ file CSV vÃ o giá» cháº¡y cron
- **WHEN** cron worker cháº¡y Ä‘áº¿n lá»‹ch nhÆ°ng khÃ´ng tÃ¬m tháº¥y file CSV há»£p lá»‡ nÃ o tá»« cÃ¡c sponsor email Ä‘ang hoáº¡t Ä‘á»™ng
- **THEN** há»‡ thá»‘ng SHALL táº¡o import report tráº¡ng thÃ¡i `NO_FILE`
- **AND** há»‡ thá»‘ng SHALL táº¡o cáº£nh bÃ¡o Ä‘á»ƒ ban tá»• chá»©c biáº¿t nhÃ  tÃ i trá»£ chÆ°a gá»­i file Ä‘Ãºng lá»‹ch

### Requirement: Validate cáº¥u trÃºc CSV khÃ¡ch má»i VIP
Há»‡ thá»‘ng SHALL validate file CSV khÃ¡ch má»i VIP theo cáº¥u trÃºc `fullName,email,phone,company,eventCode,note` trÆ°á»›c vÃ  trong quÃ¡ trÃ¬nh import tá»«ng dÃ²ng.

#### Scenario: CSV cÃ³ Ä‘áº§y Ä‘á»§ header báº¯t buá»™c
- **WHEN** worker báº¯t Ä‘áº§u import má»™t file CSV cÃ³ header `fullName,email,phone,company,eventCode,note`
- **THEN** há»‡ thá»‘ng SHALL parse file CSV vÃ  xá»­ lÃ½ tá»«ng dÃ²ng dá»¯ liá»‡u
- **AND** há»‡ thá»‘ng SHALL map `eventCode` cá»§a tá»«ng dÃ²ng sang concert tÆ°Æ¡ng á»©ng

#### Scenario: CSV thiáº¿u header báº¯t buá»™c
- **WHEN** worker nháº­n file CSV thiáº¿u má»™t trong cÃ¡c header `fullName`, `email`, `phone`, `company`, `eventCode` hoáº·c `note`
- **THEN** há»‡ thá»‘ng SHALL khÃ´ng import file Ä‘Ã³
- **AND** há»‡ thá»‘ng SHALL chuyá»ƒn import report sang `FAILED`
- **AND** há»‡ thá»‘ng SHALL lÆ°u lÃ½ do file sai cáº¥u trÃºc

#### Scenario: Má»™t dÃ²ng thiáº¿u thÃ´ng tin Ä‘á»‹nh danh khÃ¡ch
- **WHEN** má»™t dÃ²ng CSV thiáº¿u `fullName` hoáº·c thiáº¿u cáº£ `email` vÃ  `phone`
- **THEN** há»‡ thá»‘ng SHALL Ä‘Ã¡nh dáº¥u dÃ²ng Ä‘Ã³ lÃ  lá»—i
- **AND** há»‡ thá»‘ng SHALL tiáº¿p tá»¥c xá»­ lÃ½ cÃ¡c dÃ²ng cÃ²n láº¡i trong file

#### Scenario: Event code khÃ´ng tá»“n táº¡i
- **WHEN** má»™t dÃ²ng CSV cÃ³ `eventCode` khÃ´ng map Ä‘Æ°á»£c sang concert nÃ o
- **THEN** há»‡ thá»‘ng SHALL Ä‘Ã¡nh dáº¥u dÃ²ng Ä‘Ã³ lÃ  lá»—i `EVENT_CODE_NOT_FOUND`
- **AND** há»‡ thá»‘ng SHALL khÃ´ng táº¡o khÃ¡ch má»i VIP cho dÃ²ng Ä‘Ã³

### Requirement: Chá»‘ng trÃ¹ng khÃ¡ch má»i VIP khi import
Há»‡ thá»‘ng SHALL chá»‘ng trÃ¹ng khÃ¡ch má»i VIP theo concert báº±ng khÃ³a `concertId + email` náº¿u cÃ³ email, vÃ  fallback sang `concertId + phone` náº¿u dÃ²ng khÃ´ng cÃ³ email.

#### Scenario: DÃ²ng khÃ¡ch má»i bá»‹ trÃ¹ng email trong cÃ¹ng concert
- **WHEN** file CSV chá»©a má»™t khÃ¡ch má»i cÃ³ email Ä‘Ã£ tá»“n táº¡i trong cÃ¹ng concert
- **THEN** há»‡ thá»‘ng SHALL bá» qua dÃ²ng Ä‘Ã³
- **AND** há»‡ thá»‘ng SHALL tÄƒng sá»‘ lÆ°á»£ng dÃ²ng trÃ¹ng trong import report
- **AND** há»‡ thá»‘ng SHALL khÃ´ng táº¡o e-ticket má»›i cho khÃ¡ch má»i trÃ¹ng

#### Scenario: DÃ²ng khÃ¡ch má»i bá»‹ trÃ¹ng phone khi thiáº¿u email
- **WHEN** file CSV chá»©a má»™t khÃ¡ch má»i khÃ´ng cÃ³ email nhÆ°ng cÃ³ sá»‘ Ä‘iá»‡n thoáº¡i Ä‘Ã£ tá»“n táº¡i trong cÃ¹ng concert
- **THEN** há»‡ thá»‘ng SHALL bá» qua dÃ²ng Ä‘Ã³
- **AND** há»‡ thá»‘ng SHALL tÄƒng sá»‘ lÆ°á»£ng dÃ²ng trÃ¹ng trong import report

#### Scenario: File gá»­i láº¡i láº§n hai
- **WHEN** nhÃ  tÃ i trá»£ gá»­i láº¡i file CSV cÃ³ cÃ¹ng danh sÃ¡ch khÃ¡ch má»i Ä‘Ã£ Ä‘Æ°á»£c import trÆ°á»›c Ä‘Ã³
- **THEN** há»‡ thá»‘ng SHALL nháº­n diá»‡n cÃ¡c dÃ²ng trÃ¹ng
- **AND** há»‡ thá»‘ng SHALL khÃ´ng táº¡o láº¡i e-ticket cho cÃ¡c khÃ¡ch má»i Ä‘Ã£ tá»“n táº¡i
- **AND** import report SHALL thá»ƒ hiá»‡n sá»‘ dÃ²ng bá»‹ bá» qua vÃ¬ trÃ¹ng

### Requirement: Táº¡o vÃ  gá»­i e-ticket cho khÃ¡ch má»i VIP
Há»‡ thá»‘ng SHALL táº¡o e-ticket QR cho má»—i khÃ¡ch má»i VIP Ä‘Æ°á»£c import thÃ nh cÃ´ng vÃ  gá»­i e-ticket Ä‘Ã³ qua email cho khÃ¡ch.

#### Scenario: Import khÃ¡ch má»i VIP cÃ³ email há»£p lá»‡
- **WHEN** má»™t dÃ²ng CSV há»£p lá»‡ cÃ³ email vÃ  khÃ´ng bá»‹ trÃ¹ng
- **THEN** há»‡ thá»‘ng SHALL táº¡o báº£n ghi khÃ¡ch má»i VIP gáº¯n vá»›i concert tÆ°Æ¡ng á»©ng
- **AND** há»‡ thá»‘ng SHALL sinh QR token duy nháº¥t cho khÃ¡ch má»i Ä‘Ã³
- **AND** há»‡ thá»‘ng SHALL Ä‘Æ°a job gá»­i e-ticket vÃ o hÃ ng Ä‘á»£i email

#### Scenario: Gá»­i e-ticket thÃ nh cÃ´ng
- **WHEN** email worker gá»­i e-ticket thÃ nh cÃ´ng cho khÃ¡ch má»i VIP
- **THEN** há»‡ thá»‘ng SHALL cáº­p nháº­t tráº¡ng thÃ¡i gá»­i email cá»§a khÃ¡ch má»i lÃ  `SENT`
- **AND** import report SHALL ghi nháº­n sá»‘ email Ä‘Ã£ gá»­i thÃ nh cÃ´ng

#### Scenario: KhÃ¡ch má»i khÃ´ng cÃ³ email
- **WHEN** má»™t dÃ²ng CSV há»£p lá»‡ chá»‰ cÃ³ phone nhÆ°ng khÃ´ng cÃ³ email
- **THEN** há»‡ thá»‘ng SHALL cÃ³ thá»ƒ lÆ°u khÃ¡ch má»i VIP Ä‘á»ƒ phá»¥c vá»¥ kiá»ƒm tra thá»§ cÃ´ng
- **AND** há»‡ thá»‘ng SHALL ghi nháº­n dÃ²ng Ä‘Ã³ lÃ  khÃ´ng gá»­i Ä‘Æ°á»£c e-ticket qua email trong import report

### Requirement: BÃ¡o cÃ¡o káº¿t quáº£ import CSV
Há»‡ thá»‘ng SHALL lÆ°u bÃ¡o cÃ¡o káº¿t quáº£ cho má»—i láº§n import CSV Ä‘á»ƒ ban tá»• chá»©c biáº¿t sá»‘ lÆ°á»£ng báº£n ghi thÃ nh cÃ´ng, trÃ¹ng, lá»—i vÃ  email Ä‘Ã£ gá»­i.

#### Scenario: Import thÃ nh cÃ´ng toÃ n bá»™
- **WHEN** worker xá»­ lÃ½ má»™t file CSV vÃ  táº¥t cáº£ dÃ²ng dá»¯ liá»‡u Ä‘á»u há»£p lá»‡, khÃ´ng trÃ¹ng vÃ  gá»­i email thÃ nh cÃ´ng
- **THEN** import report SHALL cÃ³ tráº¡ng thÃ¡i `SUCCESS`
- **AND** report SHALL lÆ°u `totalRows`, `successRows`, `duplicateRows`, `errorRows` vÃ  `emailSentRows`

#### Scenario: Import thÃ nh cÃ´ng má»™t pháº§n
- **WHEN** worker xá»­ lÃ½ má»™t file CSV cÃ³ cáº£ dÃ²ng há»£p lá»‡, dÃ²ng trÃ¹ng hoáº·c dÃ²ng lá»—i
- **THEN** import report SHALL cÃ³ tráº¡ng thÃ¡i `PARTIAL_SUCCESS`
- **AND** report SHALL lÆ°u chi tiáº¿t lá»—i theo tá»«ng dÃ²ng Ä‘á»ƒ ban tá»• chá»©c kiá»ƒm tra

#### Scenario: Import tháº¥t báº¡i toÃ n bá»™
- **WHEN** worker khÃ´ng thá»ƒ parse file CSV hoáº·c file khÃ´ng cÃ³ dÃ²ng há»£p lá»‡ nÃ o
- **THEN** import report SHALL cÃ³ tráº¡ng thÃ¡i `FAILED`
- **AND** report SHALL lÆ°u lá»—i tá»•ng quÃ¡t vÃ  object key cá»§a file CSV gá»‘c trong MinIO

### Requirement: PhÃ¢n biá»‡t khÃ´ng cÃ³ file vÃ  lá»—i mailbox IMAP
Há»‡ thá»‘ng SHALL chá»‰ káº¿t luáº­n `NO_FILE` sau khi Ä‘Ã£ káº¿t ná»‘i vÃ  Ä‘á»c mailbox thÃ nh cÃ´ng. Lá»—i káº¿t ná»‘i, xÃ¡c thá»±c, timeout hoáº·c Ä‘á»c mailbox SHALL Ä‘Æ°á»£c ghi nháº­n lÃ  lá»—i tÃ­ch há»£p, khÃ´ng Ä‘Æ°á»£c giáº£ láº­p thÃ nh trÆ°á»ng há»£p nhÃ  tÃ i trá»£ khÃ´ng gá»­i file.

#### Scenario: Poll mailbox thÃ nh cÃ´ng nhÆ°ng khÃ´ng cÃ³ CSV há»£p lá»‡
- **WHEN** cron worker káº¿t ná»‘i vÃ  Ä‘á»c mailbox thÃ nh cÃ´ng nhÆ°ng khÃ´ng tÃ¬m tháº¥y email chÆ°a Ä‘á»c cÃ³ attachment `.csv` há»£p lá»‡
- **THEN** há»‡ thá»‘ng SHALL táº¡o import report tráº¡ng thÃ¡i `NO_FILE`

#### Scenario: KhÃ´ng Ä‘á»c Ä‘Æ°á»£c mailbox IMAP
- **WHEN** cron worker khÃ´ng thá»ƒ káº¿t ná»‘i, xÃ¡c thá»±c hoáº·c Ä‘á»c mailbox do timeout/lá»—i káº¿t ná»‘i
- **THEN** há»‡ thá»‘ng SHALL táº¡o import report tráº¡ng thÃ¡i `FAILED`
- **AND** report SHALL lÆ°u thÃ´ng tin lá»—i IMAP
- **AND** há»‡ thá»‘ng SHALL khÃ´ng táº¡o report `NO_FILE` cho láº§n poll Ä‘Ã³

#### Scenario: Táº£i attachment CSV thÃ nh cÃ´ng
- **WHEN** worker tÃ¬m tháº¥y email chÆ°a Ä‘á»c cÃ³ attachment CSV
- **THEN** worker SHALL fetch metadata hoÃ n táº¥t trÆ°á»›c khi download attachment
- **AND** worker SHALL chá»‰ Ä‘Ã¡nh dáº¥u email lÃ  Ä‘Ã£ Ä‘á»c sau khi attachment Ä‘Æ°á»£c download thÃ nh cÃ´ng

### Requirement: Tráº¡ng thÃ¡i import Ä‘á»™c láº­p vá»›i káº¿t quáº£ gá»­i email báº¥t Ä‘á»“ng bá»™
Há»‡ thá»‘ng SHALL xÃ¡c Ä‘á»‹nh tráº¡ng thÃ¡i import dá»±a trÃªn káº¿t quáº£ validate, dedupe vÃ  táº¡o khÃ¡ch VIP. Káº¿t quáº£ SMTP Ä‘Æ°á»£c cáº­p nháº­t báº¥t Ä‘á»“ng bá»™ vÃ o tráº¡ng thÃ¡i email cá»§a tá»«ng khÃ¡ch vÃ  `emailSentRows`.

#### Scenario: Táº¥t cáº£ dÃ²ng Ä‘Æ°á»£c import má»›i
- **WHEN** táº¥t cáº£ dÃ²ng CSV há»£p lá»‡, khÃ´ng trÃ¹ng vÃ  Ä‘Æ°á»£c táº¡o thÃ nh khÃ¡ch VIP
- **THEN** import report SHALL cÃ³ tráº¡ng thÃ¡i `SUCCESS`
- **AND** email jobs MAY váº«n Ä‘ang á»Ÿ tráº¡ng thÃ¡i chá» xá»­ lÃ½

#### Scenario: File chá»‰ chá»©a dÃ²ng trÃ¹ng
- **WHEN** táº¥t cáº£ dÃ²ng trong CSV Ä‘Ã£ tá»“n táº¡i theo `concertId + email` hoáº·c `concertId + phone`
- **THEN** import report SHALL cÃ³ tráº¡ng thÃ¡i `PARTIAL_SUCCESS`
- **AND** `successRows` SHALL báº±ng `0`
- **AND** `duplicateRows` SHALL báº±ng tá»•ng sá»‘ dÃ²ng dá»¯ liá»‡u
- **AND** há»‡ thá»‘ng SHALL khÃ´ng táº¡o e-ticket hoáº·c email job má»›i

#### Scenario: Email e-ticket tháº¥t báº¡i sau khi import thÃ nh cÃ´ng
- **WHEN** SMTP khÃ´ng gá»­i Ä‘Æ°á»£c e-ticket cho má»™t khÃ¡ch Ä‘Ã£ import
- **THEN** `VipGuest.emailStatus` SHALL chuyá»ƒn thÃ nh `FAILED`
- **AND** lá»—i SMTP SHALL Ä‘Æ°á»£c lÆ°u cho khÃ¡ch Ä‘Ã³
- **AND** `emailSentRows` SHALL khÃ´ng tÄƒng
- **AND** tráº¡ng thÃ¡i import SHALL khÃ´ng bá»‹ rollback

### Requirement: Quản lý email nhãn hàng từ admin frontend
Admin frontend SHALL cho phép organizer xem và quản lý danh sách sponsor email mà VIP Guest Sync được phép xử lý.

#### Scenario: Xem danh sách email nhãn hàng
- **WHEN** organizer mở tab Email nhãn hàng
- **THEN** UI SHALL tải danh sách sponsor email
- **AND** UI SHALL hiển thị email, tên hiển thị, trạng thái và các `allowedEventCodes`

#### Scenario: Thêm email nhãn hàng
- **WHEN** organizer nhập email hợp lệ, tên hiển thị và các event code được phép rồi submit
- **THEN** UI SHALL gọi API tạo sponsor email
- **AND** danh sách SHALL hiển thị bản ghi vừa tạo khi request thành công

#### Scenario: Email không hợp lệ
- **WHEN** organizer nhập địa chỉ email sai định dạng
- **THEN** UI SHALL chặn submit
- **AND** UI SHALL hiển thị lỗi validation tại trường email

### Requirement: Cấu hình phạm vi eventCode cho email nhãn hàng
Admin frontend SHALL cho phép organizer chọn `allowedEventCodes` từ các concert có trong dashboard và gửi đúng mảng mã sự kiện cho backend.

#### Scenario: Giới hạn sponsor theo concert
- **WHEN** organizer chọn một hoặc nhiều concert cho sponsor
- **THEN** UI SHALL lưu các `eventCode` tương ứng vào `allowedEventCodes`
- **AND** UI SHALL hiển thị các mã đã chọn trong danh sách sponsor

#### Scenario: Không chọn eventCode
- **WHEN** organizer lưu sponsor với `allowedEventCodes` rỗng
- **THEN** UI SHALL gửi mảng rỗng theo contract backend
- **AND** UI SHALL thể hiện phạm vi là tất cả event code theo quy tắc backend

### Requirement: Kích hoạt và vô hiệu hóa email nhãn hàng
Admin frontend SHALL cho phép organizer thay đổi `isActive` của sponsor email mà không xóa bản ghi.

#### Scenario: Vô hiệu hóa sponsor
- **WHEN** organizer tắt trạng thái một sponsor đang active
- **THEN** UI SHALL gọi API update với `isActive: false`
- **AND** badge trạng thái SHALL đổi thành inactive khi request thành công

#### Scenario: Update sponsor thất bại
- **WHEN** backend từ chối hoặc không thể update sponsor
- **THEN** UI SHALL trả toggle về trạng thái trước
- **AND** UI SHALL hiển thị thông điệp lỗi

### Requirement: Xem danh sách báo cáo VIP Sync
Admin frontend SHALL hiển thị các import report theo thứ tự mới nhất trước cùng trạng thái và số liệu tổng hợp.

#### Scenario: Hiển thị report đã xử lý
- **WHEN** organizer mở tab VIP Sync và API trả danh sách report
- **THEN** UI SHALL hiển thị thời gian, sender, tên file, trạng thái, `totalRows`, `successRows`, `duplicateRows`, `errorRows` và `emailSentRows`

#### Scenario: Không có file CSV
- **WHEN** report có trạng thái `NO_FILE`
- **THEN** UI SHALL hiển thị cảnh báo phân biệt với lỗi hệ thống
- **AND** UI SHALL hiển thị `errorMessage` nếu backend cung cấp

#### Scenario: Mailbox hoặc import thất bại
- **WHEN** report có trạng thái `FAILED`
- **THEN** UI SHALL hiển thị trạng thái lỗi và nguyên nhân
- **AND** UI SHALL không mô tả trường hợp đó như `NO_FILE`

### Requirement: Xem chi tiết báo cáo VIP Sync
Admin frontend SHALL tải và hiển thị chi tiết một report khi organizer chọn report đó.

#### Scenario: Xem lỗi từng dòng
- **WHEN** report có `rowErrors`
- **THEN** UI SHALL hiển thị số dòng, mã lỗi, thông điệp và dữ liệu thô của từng lỗi

#### Scenario: Xem khách đã import
- **WHEN** report có danh sách `vipGuests`
- **THEN** UI SHALL hiển thị tên, email/phone, company, trạng thái vé và trạng thái gửi email
- **AND** lỗi SMTP SHALL được hiển thị khi `emailStatus` là `FAILED`

#### Scenario: Report chưa hoàn tất
- **WHEN** report có trạng thái `PENDING` hoặc `PROCESSING`
- **THEN** UI SHALL thể hiện report đang chạy
- **AND** các bộ đếm chưa hoàn tất SHALL không được trình bày như kết quả cuối cùng

### Requirement: Sponsor và report dùng đúng API được bảo vệ
Admin frontend SHALL gửi bearer token cho mọi request sponsor email và VIP import report, đồng thời SHALL dừng tải dữ liệu khi session không còn hợp lệ.

#### Scenario: Access token hết hạn
- **WHEN** API sponsor hoặc report trả lỗi xác thực
- **THEN** UI SHALL hiển thị lỗi session theo cơ chế hiện tại
- **AND** UI SHALL không tiếp tục polling hoặc retry vô hạn
