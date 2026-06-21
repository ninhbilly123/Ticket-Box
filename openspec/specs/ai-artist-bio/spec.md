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
