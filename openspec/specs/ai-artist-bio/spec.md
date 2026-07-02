# ai-artist-bio Specification

## Purpose
TBD - created by archiving change add-ai-bio-and-vip-guest-sync. Update Purpose after archive.
## Requirements
### Requirement: Upload PDF há»“ sÆ¡ nghá»‡ sÄ©
Há»‡ thá»‘ng SHALL cho phÃ©p ban tá»• chá»©c upload file PDF há»“ sÆ¡ nghá»‡ sÄ© hoáº·c press kit cho má»™t concert cá»¥ thá»ƒ. File PDF SHALL Ä‘Æ°á»£c lÆ°u vÃ o object storage vÃ  há»‡ thá»‘ng SHALL táº¡o báº£n ghi xá»­ lÃ½ AI bio cÃ³ tráº¡ng thÃ¡i ban Ä‘áº§u Ä‘á»ƒ ban tá»• chá»©c theo dÃµi.

#### Scenario: Upload PDF há»£p lá»‡
- **WHEN** Ban tá»• chá»©c upload file PDF há»£p lá»‡ cho má»™t concert tá»“n táº¡i
- **THEN** há»‡ thá»‘ng SHALL lÆ°u file PDF vÃ o MinIO
- **AND** há»‡ thá»‘ng SHALL táº¡o báº£n ghi AI bio gáº¯n vá»›i concert Ä‘Ã³
- **AND** tráº¡ng thÃ¡i xá»­ lÃ½ SHALL lÃ  `UPLOADED` hoáº·c `PROCESSING`
- **AND** há»‡ thá»‘ng SHALL Ä‘Æ°a job xá»­ lÃ½ PDF vÃ o hÃ ng Ä‘á»£i ná»n

#### Scenario: Upload file khÃ´ng pháº£i PDF
- **WHEN** Ban tá»• chá»©c upload file khÃ´ng cÃ³ Ä‘á»‹nh dáº¡ng PDF
- **THEN** há»‡ thá»‘ng SHALL tá»« chá»‘i yÃªu cáº§u
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» lá»—i cho biáº¿t chá»‰ cháº¥p nháº­n file PDF

### Requirement: TrÃ­ch xuáº¥t vÃ  lÃ m sáº¡ch ná»™i dung PDF
Há»‡ thá»‘ng SHALL tá»± Ä‘á»™ng xá»­ lÃ½ file PDF Ä‘Ã£ upload Ä‘á»ƒ trÃ­ch xuáº¥t vÄƒn báº£n thÃ´ vÃ  lÃ m sáº¡ch ná»™i dung trÆ°á»›c khi gá»­i sang mÃ´ hÃ¬nh AI.

#### Scenario: TrÃ­ch xuáº¥t ná»™i dung thÃ nh cÃ´ng
- **WHEN** worker nháº­n job xá»­ lÃ½ AI bio tá»« hÃ ng Ä‘á»£i
- **THEN** worker SHALL Ä‘á»c file PDF tá»« MinIO
- **AND** worker SHALL trÃ­ch xuáº¥t vÄƒn báº£n thÃ´ tá»« PDF
- **AND** worker SHALL lÃ m sáº¡ch cÃ¡c kÃ½ tá»± thá»«a, dÃ²ng trá»‘ng vÃ  ná»™i dung nhiá»…u trÆ°á»›c khi gá»i AI

#### Scenario: PDF khÃ´ng trÃ­ch xuáº¥t Ä‘Æ°á»£c text
- **WHEN** worker khÃ´ng thá»ƒ trÃ­ch xuáº¥t ná»™i dung text tá»« PDF
- **THEN** há»‡ thá»‘ng SHALL chuyá»ƒn tráº¡ng thÃ¡i AI bio sang `FAILED`
- **AND** há»‡ thá»‘ng SHALL lÆ°u thÃ´ng tin lá»—i Ä‘á»ƒ ban tá»• chá»©c biáº¿t nguyÃªn nhÃ¢n xá»­ lÃ½ tháº¥t báº¡i

### Requirement: Táº¡o bio tiáº¿ng Viá»‡t báº±ng Gemini API
Há»‡ thá»‘ng SHALL gá»­i ná»™i dung Ä‘Ã£ lÃ m sáº¡ch sang Google Gemini API tháº­t Ä‘á»ƒ sinh báº£n giá»›i thiá»‡u nghá»‡ sÄ© báº±ng tiáº¿ng Viá»‡t, ngáº¯n gá»n, dá»… Ä‘á»c vÃ  phÃ¹ há»£p Ä‘á»ƒ hiá»ƒn thá»‹ trÃªn trang chi tiáº¿t concert.

#### Scenario: Gemini táº¡o bio thÃ nh cÃ´ng
- **WHEN** worker cÃ³ vÄƒn báº£n Ä‘Ã£ lÃ m sáº¡ch tá»« PDF
- **THEN** worker SHALL gá»i Google Gemini API tháº­t vá»›i prompt yÃªu cáº§u sinh bio báº±ng tiáº¿ng Viá»‡t
- **AND** há»‡ thá»‘ng SHALL lÆ°u bio AI táº¡o ra vÃ o trÆ°á»ng báº£n nhÃ¡p
- **AND** tráº¡ng thÃ¡i xá»­ lÃ½ SHALL chuyá»ƒn sang `AI_GENERATED`

#### Scenario: Gemini API lá»—i
- **WHEN** Google Gemini API tráº£ lá»—i hoáº·c quÃ¡ thá»i gian chá»
- **THEN** há»‡ thá»‘ng SHALL khÃ´ng publish báº¥t ká»³ bio nÃ o cho khÃ¡n giáº£
- **AND** há»‡ thá»‘ng SHALL chuyá»ƒn tráº¡ng thÃ¡i xá»­ lÃ½ sang `FAILED`
- **AND** há»‡ thá»‘ng SHALL lÆ°u thÃ´ng tin lá»—i Ä‘á»ƒ ban tá»• chá»©c cÃ³ thá»ƒ cháº¡y láº¡i hoáº·c upload láº¡i PDF

### Requirement: Duyá»‡t vÃ  chá»‰nh sá»­a bio trÆ°á»›c khi publish
Há»‡ thá»‘ng SHALL báº¯t buá»™c ban tá»• chá»©c xem láº¡i, chá»‰nh sá»­a náº¿u cáº§n vÃ  duyá»‡t bio AI táº¡o ra trÆ°á»›c khi bio Ä‘Æ°á»£c hiá»ƒn thá»‹ cÃ´ng khai cho khÃ¡n giáº£.

#### Scenario: Ban tá»• chá»©c chá»‰nh sá»­a vÃ  duyá»‡t bio
- **WHEN** AI bio Ä‘ang á»Ÿ tráº¡ng thÃ¡i `AI_GENERATED` vÃ  ban tá»• chá»©c gá»­i ná»™i dung bio Ä‘Ã£ chá»‰nh sá»­a Ä‘á»ƒ duyá»‡t
- **THEN** há»‡ thá»‘ng SHALL lÆ°u ná»™i dung Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t
- **AND** tráº¡ng thÃ¡i SHALL chuyá»ƒn sang `APPROVED`
- **AND** bio SHALL chÆ°a hiá»ƒn thá»‹ cÃ´ng khai cho Ä‘áº¿n khi Ä‘Æ°á»£c publish

#### Scenario: Publish bio Ä‘Ã£ duyá»‡t
- **WHEN** Ban tá»• chá»©c publish má»™t bio Ä‘ang á»Ÿ tráº¡ng thÃ¡i `APPROVED`
- **THEN** há»‡ thá»‘ng SHALL chuyá»ƒn tráº¡ng thÃ¡i bio sang `PUBLISHED`
- **AND** trang chi tiáº¿t concert SHALL cÃ³ thá»ƒ hiá»ƒn thá»‹ bio Ä‘Ã£ publish cho khÃ¡n giáº£

#### Scenario: KhÃ´ng cho publish bio chÆ°a duyá»‡t
- **WHEN** Ban tá»• chá»©c hoáº·c há»‡ thá»‘ng cá»‘ publish má»™t bio chÆ°a á»Ÿ tráº¡ng thÃ¡i `APPROVED`
- **THEN** há»‡ thá»‘ng SHALL tá»« chá»‘i yÃªu cáº§u
- **AND** há»‡ thá»‘ng SHALL khÃ´ng hiá»ƒn thá»‹ bio Ä‘Ã³ cho khÃ¡n giáº£

### Requirement: Theo dÃµi tráº¡ng thÃ¡i xá»­ lÃ½ AI bio
Há»‡ thá»‘ng SHALL cung cáº¥p tráº¡ng thÃ¡i xá»­ lÃ½ AI bio Ä‘á»ƒ ban tá»• chá»©c biáº¿t file Ä‘ang Ä‘Æ°á»£c xá»­ lÃ½, Ä‘Ã£ hoÃ n táº¥t hay gáº·p lá»—i.

#### Scenario: Ban tá»• chá»©c xem tráº¡ng thÃ¡i xá»­ lÃ½
- **WHEN** Ban tá»• chá»©c xem thÃ´ng tin AI bio cá»§a má»™t concert
- **THEN** há»‡ thá»‘ng SHALL tráº£ vá» tráº¡ng thÃ¡i hiá»‡n táº¡i cá»§a AI bio
- **AND** tráº¡ng thÃ¡i SHALL pháº£n Ã¡nh má»™t trong cÃ¡c giai Ä‘oáº¡n `UPLOADED`, `PROCESSING`, `AI_GENERATED`, `APPROVED`, `PUBLISHED` hoáº·c `FAILED`

#### Scenario: Xem thÃ´ng tin lá»—i khi xá»­ lÃ½ tháº¥t báº¡i
- **WHEN** AI bio cÃ³ tráº¡ng thÃ¡i `FAILED`
- **THEN** há»‡ thá»‘ng SHALL tráº£ vá» thÃ´ng Ä‘iá»‡p lá»—i Ä‘Ã£ lÆ°u
- **AND** há»‡ thá»‘ng SHALL giá»¯ láº¡i file PDF nguá»“n Ä‘á»ƒ ban tá»• chá»©c cÃ³ thá»ƒ kiá»ƒm tra hoáº·c cháº¡y láº¡i quy trÃ¬nh

#### Scenario: Gemini gáº·p lá»—i táº¡m thá»i
- **WHEN** Gemini tráº£ lá»—i táº¡m thá»i nhÆ° rate limit hoáº·c service unavailable
- **THEN** worker SHALL retry cÃ³ giá»›i háº¡n
- **AND** náº¿u cÃ¡c láº§n retry Ä‘á»u tháº¥t báº¡i thÃ¬ AI bio SHALL chuyá»ƒn sang `FAILED` vÃ  lÆ°u lá»—i cuá»‘i cÃ¹ng

### Requirement: Quản lý AI Artist Bio theo concert từ admin frontend
Admin frontend SHALL cho phép organizer chọn concert và xem bản AI Artist Bio mới nhất cùng trạng thái vòng đời của bản đó.

#### Scenario: Chọn concert đã có AI Bio
- **WHEN** organizer chọn một concert trong tab AI Artist Bio
- **THEN** UI SHALL gọi API lấy AI Bio mới nhất của concert
- **AND** UI SHALL hiển thị tên concert, `eventCode`, tên file PDF, trạng thái và nội dung phù hợp

#### Scenario: Chọn concert chưa có AI Bio
- **WHEN** API cho biết concert chưa có bản AI Bio
- **THEN** UI SHALL hiển thị empty state
- **AND** UI SHALL cung cấp vùng upload PDF cho concert đang chọn

### Requirement: Upload PDF hồ sơ nghệ sĩ từ admin frontend
Admin frontend SHALL cho phép organizer chọn một file PDF và upload bằng multipart field `file` cho concert hiện tại.

#### Scenario: Upload PDF hợp lệ
- **WHEN** organizer chọn file `.pdf` hợp lệ và xác nhận upload
- **THEN** UI SHALL gửi multipart request có bearer token và field `file`
- **AND** UI SHALL chuyển sang trạng thái đang xử lý sau khi backend chấp nhận

#### Scenario: Chọn file không hợp lệ
- **WHEN** organizer chọn file không phải PDF hoặc lớn hơn 10 MB
- **THEN** UI SHALL chặn upload
- **AND** UI SHALL hiển thị lý do mà không gọi API

### Requirement: Theo dõi trạng thái xử lý AI Bio trên admin frontend
Admin frontend SHALL tự cập nhật khi AI Bio ở `UPLOADED` hoặc `PROCESSING`, và SHALL dừng polling khi đạt trạng thái terminal.

#### Scenario: Bio đang được xử lý
- **WHEN** bản AI Bio có trạng thái `UPLOADED` hoặc `PROCESSING`
- **THEN** UI SHALL hiển thị trạng thái đang xử lý
- **AND** UI SHALL tải lại bản mới nhất theo chu kỳ khoảng 3 giây mà không tạo request chồng lặp

#### Scenario: Bio xử lý hoàn tất
- **WHEN** trạng thái chuyển thành `AI_GENERATED`, `APPROVED`, `PUBLISHED` hoặc `FAILED`
- **THEN** UI SHALL dừng polling
- **AND** UI SHALL hiển thị nội dung hoặc lỗi tương ứng

#### Scenario: Organizer đổi concert hoặc rời tab
- **WHEN** organizer đổi concert, đổi tab hoặc rời trang trong lúc polling
- **THEN** UI SHALL hủy timer của concert trước
- **AND** response cũ SHALL không ghi đè dữ liệu của concert mới

### Requirement: Chỉnh sửa và duyệt bio AI từ admin frontend
Admin frontend SHALL cho phép organizer xem `generatedBio`, chỉnh sửa nội dung và gửi `reviewedBio` khi trạng thái cho phép duyệt.

#### Scenario: Duyệt bio do AI tạo
- **WHEN** AI Bio có trạng thái `AI_GENERATED` và organizer submit nội dung chỉnh sửa không rỗng
- **THEN** UI SHALL gọi API review với `reviewedBio`
- **AND** UI SHALL cập nhật trạng thái thành `APPROVED` khi request thành công

#### Scenario: Nội dung duyệt rỗng
- **WHEN** organizer xóa toàn bộ nội dung rồi bấm duyệt
- **THEN** UI SHALL chặn request
- **AND** UI SHALL thông báo nội dung bio không được để trống

### Requirement: Publish bio đã duyệt từ admin frontend
Admin frontend SHALL chỉ cho phép publish khi AI Bio ở trạng thái `APPROVED` và SHALL thể hiện rõ nội dung công khai sau khi publish.

#### Scenario: Publish bio đã duyệt
- **WHEN** organizer xác nhận publish một bio `APPROVED`
- **THEN** UI SHALL gọi API publish
- **AND** UI SHALL hiển thị trạng thái `PUBLISHED`, `publishedBio` và thời điểm publish

#### Scenario: Bio chưa đủ điều kiện publish
- **WHEN** bio chưa ở trạng thái `APPROVED`
- **THEN** hành động publish SHALL bị ẩn hoặc disabled
- **AND** UI SHALL không gửi request publish

### Requirement: Hiển thị lỗi xử lý AI Bio trên admin frontend
Admin frontend SHALL hiển thị `errorMessage` khi AI Bio có trạng thái `FAILED` và không trình bày lỗi như bio công khai.

#### Scenario: Worker xử lý thất bại
- **WHEN** API trả AI Bio có trạng thái `FAILED`
- **THEN** UI SHALL hiển thị badge lỗi và thông điệp lỗi
- **AND** UI SHALL cho phép organizer upload PDF mới
