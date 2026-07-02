# E-Ticket

## Purpose
TBD
## Requirements
### Requirement: Sinh mÃ£ QR E-Ticket
Há»‡ thá»‘ng SHALL tá»± Ä‘á»™ng sinh má»™t mÃ£ QR duy nháº¥t vÃ  an toÃ n báº±ng thuáº­t toÃ¡n mÃ£ hÃ³a cho má»—i vÃ© sau khi thanh toÃ¡n thÃ nh cÃ´ng.

#### Scenario: Sinh QR thÃ nh cÃ´ng
- **WHEN** má»™t giao dá»‹ch thanh toÃ¡n Ä‘Æ°á»£c xÃ¡c nháº­n lÃ  thÃ nh cÃ´ng
- **THEN** há»‡ thá»‘ng SHALL táº¡o má»™t mÃ£ QR token duy nháº¥t cho vÃ© tÆ°Æ¡ng á»©ng
- **AND** há»‡ thá»‘ng SHALL lÆ°u token nÃ y vÃ o cÆ¡ sá»Ÿ dá»¯ liá»‡u

### Requirement: Gá»­i E-Ticket qua Email
Há»‡ thá»‘ng SHALL gá»­i email chá»©a thÃ´ng tin E-ticket vÃ  hÃ¬nh áº£nh mÃ£ QR Ä‘áº¿n Ä‘á»‹a chá»‰ email Ä‘Ã£ Ä‘Äƒng kÃ½ cá»§a ngÆ°á»i dÃ¹ng.

#### Scenario: Gá»­i email thÃ nh cÃ´ng
- **WHEN** má»™t vÃ© Ä‘Æ°á»£c táº¡o thÃ nh cÃ´ng cÃ¹ng mÃ£ QR token
- **THEN** há»‡ thá»‘ng SHALL Ä‘Æ°a tÃ¡c vá»¥ gá»­i email vÃ o hÃ ng Ä‘á»£i (queue)
- **AND** ngÆ°á»i dÃ¹ng SHALL nháº­n Ä‘Æ°á»£c email chá»©a chi tiáº¿t Ä‘Æ¡n hÃ ng vÃ  hÃ¬nh áº£nh mÃ£ QR

### Requirement: Hiá»ƒn thá»‹ E-Ticket trong há»“ sÆ¡ ngÆ°á»i dÃ¹ng
Há»‡ thá»‘ng SHALL cho phÃ©p ngÆ°á»i dÃ¹ng xem cÃ¡c e-ticket Ä‘Ã£ mua trong trang quáº£n lÃ½ tÃ i khoáº£n cÃ¡ nhÃ¢n.

#### Scenario: NgÆ°á»i dÃ¹ng xem e-ticket
- **WHEN** ngÆ°á»i dÃ¹ng truy cáº­p vÃ o má»¥c "VÃ© cá»§a tÃ´i"
- **THEN** há»‡ thá»‘ng SHALL hiá»ƒn thá»‹ danh sÃ¡ch cÃ¡c vÃ© Ä‘Ã£ mua
- **AND** khi click vÃ o má»™t vÃ©, há»‡ thá»‘ng SHALL hiá»ƒn thá»‹ mÃ£ QR tÆ°Æ¡ng á»©ng cá»§a vÃ© Ä‘Ã³

### Requirement: Sinh E-Ticket cho khÃ¡ch má»i VIP
Há»‡ thá»‘ng SHALL sinh e-ticket QR cho khÃ¡ch má»i VIP Ä‘Æ°á»£c import thÃ nh cÃ´ng tá»« CSV cá»§a nhÃ  tÃ i trá»£.

#### Scenario: Táº¡o e-ticket VIP sau khi import khÃ¡ch há»£p lá»‡
- **WHEN** má»™t khÃ¡ch má»i VIP Ä‘Æ°á»£c import thÃ nh cÃ´ng tá»« CSV vÃ  khÃ´ng bá»‹ trÃ¹ng
- **THEN** há»‡ thá»‘ng SHALL sinh má»™t QR token duy nháº¥t cho khÃ¡ch má»i Ä‘Ã³
- **AND** há»‡ thá»‘ng SHALL lÆ°u QR token Ä‘á»ƒ phá»¥c vá»¥ gá»­i email vÃ  soÃ¡t vÃ© táº¡i cá»•ng VIP
- **AND** e-ticket SHALL Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u lÃ  loáº¡i khÃ¡ch má»i VIP Ä‘á»ƒ phÃ¢n biá»‡t vá»›i vÃ© mua thÆ°á»ng

### Requirement: Gá»­i E-Ticket VIP qua email
Há»‡ thá»‘ng SHALL gá»­i email chá»©a e-ticket QR Ä‘áº¿n Ä‘á»‹a chá»‰ email cá»§a tá»«ng khÃ¡ch má»i VIP import thÃ nh cÃ´ng.

#### Scenario: KhÃ¡ch má»i VIP cÃ³ email há»£p lá»‡
- **WHEN** khÃ¡ch má»i VIP Ä‘Æ°á»£c táº¡o thÃ nh cÃ´ng vÃ  cÃ³ email há»£p lá»‡
- **THEN** há»‡ thá»‘ng SHALL Ä‘Æ°a tÃ¡c vá»¥ gá»­i e-ticket VIP vÃ o hÃ ng Ä‘á»£i email
- **AND** khÃ¡ch má»i SHALL nháº­n Ä‘Æ°á»£c email chá»©a thÃ´ng tin sá»± kiá»‡n vÃ  mÃ£ QR e-ticket

#### Scenario: Gá»­i email e-ticket VIP tháº¥t báº¡i
- **WHEN** email worker khÃ´ng gá»­i Ä‘Æ°á»£c e-ticket VIP cho khÃ¡ch má»i
- **THEN** há»‡ thá»‘ng SHALL cáº­p nháº­t tráº¡ng thÃ¡i gá»­i email lÃ  `FAILED`
- **AND** import report SHALL ghi nháº­n lá»—i gá»­i email Ä‘á»ƒ ban tá»• chá»©c cÃ³ thá»ƒ xá»­ lÃ½ hoáº·c retry

#### Scenario: SMTP tá»« chá»‘i thÃ´ng tin xÃ¡c thá»±c hoáº·c Ä‘á»‹a chá»‰ gá»­i
- **WHEN** SMTP tá»« chá»‘i credential hoáº·c `MAIL FROM` khÃ´ng há»£p lá»‡
- **THEN** email job SHALL tháº¥t báº¡i
- **AND** tráº¡ng thÃ¡i email cá»§a khÃ¡ch VIP SHALL lÃ  `FAILED`
- **AND** há»‡ thá»‘ng SHALL giá»¯ nguyÃªn QR token vÃ  báº£n ghi khÃ¡ch VIP Ä‘á»ƒ phá»¥c vá»¥ kiá»ƒm tra hoáº·c gá»­i láº¡i sau
