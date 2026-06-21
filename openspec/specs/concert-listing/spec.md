# Concert Listing

## Purpose
TBD
## Requirements
### Requirement: Hiá»ƒn thá»‹ danh sÃ¡ch concert sáº¯p diá»…n ra
Há»‡ thá»‘ng SHALL hiá»ƒn thá»‹ danh sÃ¡ch cÃ¡c concert cÃ³ ngÃ y diá»…n ra trong tÆ°Æ¡ng lai. Äá»‘i vá»›i má»—i concert, há»‡ thá»‘ng SHALL hiá»ƒn thá»‹ cÃ¡c thÃ´ng tin bao gá»“m: tÃªn concert, nghá»‡ sÄ© biá»ƒu diá»…n, Ä‘á»‹a Ä‘iá»ƒm tá»• chá»©c, ngÃ y giá» diá»…n ra, vÃ  sá»‘ lÆ°á»£ng vÃ© cÃ²n láº¡i theo thá»i gian thá»±c (real-time) Ä‘á»‘i vá»›i tá»«ng loáº¡i vÃ© (vÃ­ dá»¥: GA, VIP, SVIP...).

#### Scenario: Truy cáº­p trang danh sÃ¡ch concert thÃ nh cÃ´ng
- **WHEN** KhÃ¡n giáº£ truy cáº­p vÃ o trang danh sÃ¡ch concert sáº¯p diá»…n ra
- **THEN** Há»‡ thá»‘ng SHALL truy váº¥n vÃ  hiá»ƒn thá»‹ danh sÃ¡ch cÃ¡c concert há»£p lá»‡ kÃ¨m theo sá»‘ lÆ°á»£ng vÃ© cÃ²n láº¡i cá»§a tá»«ng phÃ¢n háº¡ng vÃ© tá»« Redis Cache. Náº¿u Redis Cache trá»‘ng, há»‡ thá»‘ng SHALL truy váº¥n PostgreSQL, cáº­p nháº­t vÃ o cache vá»›i TTL 30 giÃ¢y rá»“i hiá»ƒn thá»‹ cho ngÆ°á»i dÃ¹ng.

### Requirement: TÃ¬m kiáº¿m vÃ  lá»c danh sÃ¡ch concert
Há»‡ thá»‘ng SHALL cho phÃ©p khÃ¡n giáº£ tÃ¬m kiáº¿m concert theo tÃªn/nghá»‡ sÄ© vÃ  lá»c danh sÃ¡ch theo ngÃ y diá»…n ra vÃ  Ä‘á»‹a Ä‘iá»ƒm tá»• chá»©c.

#### Scenario: TÃ¬m kiáº¿m concert theo nghá»‡ sÄ© biá»ƒu diá»…n
- **WHEN** KhÃ¡n giáº£ nháº­p tÃªn nghá»‡ sÄ© "SÆ¡n TÃ¹ng M-TP" vÃ o Ã´ tÃ¬m kiáº¿m vÃ  nháº¥n tÃ¬m kiáº¿m
- **THEN** Há»‡ thá»‘ng SHALL lá»c vÃ  hiá»ƒn thá»‹ danh sÃ¡ch cÃ¡c concert cÃ³ sá»± tham gia cá»§a nghá»‡ sÄ© "SÆ¡n TÃ¹ng M-TP".

#### Scenario: Lá»c concert theo Ä‘á»‹a Ä‘iá»ƒm tá»• chá»©c
- **WHEN** KhÃ¡n giáº£ chá»n Ä‘á»‹a Ä‘iá»ƒm "Há»“ ChÃ­ Minh" tá»« bá»™ lá»c Ä‘á»‹a Ä‘iá»ƒm
- **THEN** Há»‡ thá»‘ng SHALL lá»c vÃ  chá»‰ hiá»ƒn thá»‹ cÃ¡c concert tá»• chá»©c táº¡i Há»“ ChÃ­ Minh.

### Requirement: Äá»‹nh danh concert báº±ng event code duy nháº¥t
Há»‡ thá»‘ng SHALL lÆ°u má»™t mÃ£ sá»± kiá»‡n `eventCode` duy nháº¥t cho má»—i concert Ä‘á»ƒ cÃ¡c tÃ­ch há»£p bÃªn ngoÃ i, Ä‘áº·c biá»‡t lÃ  CSV khÃ¡ch má»i VIP, cÃ³ thá»ƒ tham chiáº¿u Ä‘áº¿n Ä‘Ãºng concert.

#### Scenario: Táº¡o concert vá»›i event code há»£p lá»‡
- **WHEN** Ban tá»• chá»©c táº¡o hoáº·c cáº­p nháº­t concert vá»›i má»™t `eventCode` chÆ°a tá»“n táº¡i
- **THEN** há»‡ thá»‘ng SHALL lÆ°u `eventCode` Ä‘Ã³ cho concert
- **AND** há»‡ thá»‘ng SHALL Ä‘áº£m báº£o khÃ´ng cÃ³ concert khÃ¡c dÃ¹ng cÃ¹ng `eventCode`

#### Scenario: Event code bá»‹ trÃ¹ng
- **WHEN** Ban tá»• chá»©c táº¡o hoáº·c cáº­p nháº­t concert vá»›i `eventCode` Ä‘Ã£ tá»“n táº¡i á»Ÿ concert khÃ¡c
- **THEN** há»‡ thá»‘ng SHALL tá»« chá»‘i yÃªu cáº§u
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» lá»—i cho biáº¿t mÃ£ sá»± kiá»‡n Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng

### Requirement: Hiá»ƒn thá»‹ Artist Bio Ä‘Ã£ publish trÃªn trang chi tiáº¿t concert
Há»‡ thá»‘ng SHALL chá»‰ hiá»ƒn thá»‹ Artist Bio cho khÃ¡n giáº£ khi bio Ä‘Ã³ Ä‘Ã£ Ä‘Æ°á»£c ban tá»• chá»©c duyá»‡t vÃ  publish.

#### Scenario: Concert cÃ³ Artist Bio Ä‘Ã£ publish
- **WHEN** KhÃ¡n giáº£ truy cáº­p trang chi tiáº¿t concert cÃ³ Artist Bio tráº¡ng thÃ¡i `PUBLISHED`
- **THEN** há»‡ thá»‘ng SHALL hiá»ƒn thá»‹ ná»™i dung bio Ä‘Ã£ publish trÃªn trang chi tiáº¿t concert

#### Scenario: Concert chÆ°a cÃ³ Artist Bio Ä‘Æ°á»£c publish
- **WHEN** KhÃ¡n giáº£ truy cáº­p trang chi tiáº¿t concert chÆ°a cÃ³ Artist Bio tráº¡ng thÃ¡i `PUBLISHED`
- **THEN** há»‡ thá»‘ng SHALL khÃ´ng hiá»ƒn thá»‹ bio nhÃ¡p, bio Ä‘ang xá»­ lÃ½ hoáº·c bio bá»‹ lá»—i cho khÃ¡n giáº£
