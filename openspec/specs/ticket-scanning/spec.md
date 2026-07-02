# Ticket Scanning

## Purpose
TBD
## Requirements
### Requirement: QuÃ©t vÃ  xÃ¡c thá»±c mÃ£ QR cá»§a vÃ©
Há»‡ thá»‘ng SHALL cung cáº¥p má»™t API endpoint Ä‘á»ƒ xÃ¡c thá»±c mÃ£ QR token khi quÃ©t vÃ  cáº­p nháº­t tráº¡ng thÃ¡i check-in cá»§a vÃ©.

#### Scenario: QuÃ©t vÃ© há»£p lá»‡
- **WHEN** má»™t mÃ£ QR token há»£p lá»‡ vÃ  chÆ°a qua sá»­ dá»¥ng Ä‘Æ°á»£c gá»­i lÃªn Ä‘á»ƒ quÃ©t
- **THEN** há»‡ thá»‘ng SHALL cáº­p nháº­t tráº¡ng thÃ¡i cá»§a vÃ© thÃ nh "Ä‘Ã£ check-in"
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» pháº£n há»“i thÃ nh cÃ´ng cÃ¹ng vá»›i thÃ´ng tin chi tiáº¿t cá»§a vÃ©

#### Scenario: QuÃ©t vÃ© khÃ´ng há»£p lá»‡
- **WHEN** má»™t mÃ£ QR token khÃ´ng há»£p lá»‡ hoáº·c bá»‹ lÃ m giáº£ Ä‘Æ°á»£c gá»­i lÃªn Ä‘á»ƒ quÃ©t
- **THEN** há»‡ thá»‘ng SHALL tá»« chá»‘i yÃªu cáº§u
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» lá»—i "VÃ© khÃ´ng há»£p lá»‡"

#### Scenario: QuÃ©t vÃ© trÃ¹ng láº·p
- **WHEN** má»™t mÃ£ QR token há»£p lá»‡ nhÆ°ng Ä‘Ã£ Ä‘Æ°á»£c check-in trÆ°á»›c Ä‘Ã³ Ä‘Æ°á»£c gá»­i lÃªn
- **THEN** há»‡ thá»‘ng SHALL tá»« chá»‘i yÃªu cáº§u
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» lá»—i "VÃ© Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng"

### Requirement: QuÃ©t E-Ticket cá»§a khÃ¡ch má»i VIP
Há»‡ thá»‘ng SHALL cho phÃ©p nhÃ¢n sá»± soÃ¡t vÃ© xÃ¡c thá»±c QR e-ticket cá»§a khÃ¡ch má»i VIP táº¡i cá»•ng VIP báº±ng cÃ¹ng cÆ¡ cháº¿ an toÃ n nhÆ° e-ticket mua thÆ°á»ng.

#### Scenario: QuÃ©t e-ticket VIP há»£p lá»‡
- **WHEN** nhÃ¢n sá»± soÃ¡t vÃ© gá»­i QR token há»£p lá»‡ cá»§a má»™t khÃ¡ch má»i VIP chÆ°a check-in
- **THEN** há»‡ thá»‘ng SHALL cáº­p nháº­t tráº¡ng thÃ¡i khÃ¡ch má»i VIP thÃ nh Ä‘Ã£ check-in
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» thÃ´ng tin khÃ¡ch má»i, cÃ´ng ty, concert vÃ  loáº¡i vÃ© VIP guest

#### Scenario: QuÃ©t e-ticket VIP Ä‘Ã£ sá»­ dá»¥ng
- **WHEN** nhÃ¢n sá»± soÃ¡t vÃ© gá»­i QR token cá»§a má»™t khÃ¡ch má»i VIP Ä‘Ã£ check-in trÆ°á»›c Ä‘Ã³
- **THEN** há»‡ thá»‘ng SHALL tá»« chá»‘i yÃªu cáº§u
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» lá»—i cho biáº¿t e-ticket VIP Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng

#### Scenario: QuÃ©t e-ticket VIP khÃ´ng há»£p lá»‡
- **WHEN** nhÃ¢n sá»± soÃ¡t vÃ© gá»­i QR token khÃ´ng tá»“n táº¡i hoáº·c khÃ´ng khá»›p chá»¯ kÃ½ há»‡ thá»‘ng
- **THEN** há»‡ thá»‘ng SHALL tá»« chá»‘i yÃªu cáº§u
- **AND** há»‡ thá»‘ng SHALL tráº£ vá» lá»—i cho biáº¿t e-ticket VIP khÃ´ng há»£p lá»‡
