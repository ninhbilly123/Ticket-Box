## 1. Setup Redis & Job Queue (BullMQ)

- [x] 1.1 Thiáº¿t láº­p Queue `reservation-timeout` báº±ng BullMQ trong backend Ä‘á»ƒ xá»­ lÃ½ cÃ¡c job giáº£i phÃ³ng gháº¿.
- [x] 1.2 Viáº¿t worker `reservation.worker.ts` Ä‘á»ƒ xá»­ lÃ½ cÃ¡c job tá»« queue. Logic: TÃ¬m Order theo `orderId`, náº¿u status váº«n lÃ  `PENDING` thÃ¬ chuyá»ƒn Order thÃ nh `CANCELLED`, Ticket thÃ nh `AVAILABLE`, vÃ  xÃ³a khÃ³a trÃªn Redis.

## 2. Core Service - Redis Lock

- [x] 2.1 ThÃªm cÃ¡c utility function cho Redis trong thÆ° viá»‡n dÃ¹ng chung (vd: `shared/lib/redis.ts`): hÃ m `lockTicket(ticketId, orderId)` sá»­ dá»¥ng lá»‡nh `SET NX EX 600`.
- [x] 2.2 ThÃªm hÃ m `unlockTicket(ticketId)` Ä‘á»ƒ xÃ³a khÃ³a Redis thá»§ cÃ´ng khi cáº§n.
- [x] 2.3 ThÃªm hÃ m `getLockedTickets(concertId)` Ä‘á»ƒ láº¥y danh sÃ¡ch cÃ¡c vÃ© Ä‘ang bá»‹ khÃ³a.

## 3. Cáº­p nháº­t luá»“ng Äáº·t vÃ© (Booking Process)

- [x] 3.1 Chá»‰nh sá»­a API táº¡o Ä‘Æ¡n hÃ ng (Create Order): TrÆ°á»›c khi táº¡o Order á»Ÿ tráº¡ng thÃ¡i PENDING, gá»i hÃ m `lockTicket` cho tá»«ng vÃ©. Náº¿u cÃ³ vÃ© Ä‘Ã£ bá»‹ khÃ³a bá»Ÿi ngÆ°á»i khÃ¡c, throw error ngay láº­p tá»©c vÃ  roll back.
- [x] 3.2 Ngay sau khi lÆ°u Order thÃ nh cÃ´ng, Ä‘áº©y (add) má»™t job vÃ o queue `reservation-timeout` vá»›i thuá»™c tÃ­nh `delay: 600000` (10 phÃºt).
- [x] 3.3 Tráº£ vá» field `expiredAt` trong response cá»§a API táº¡o Ä‘Æ¡n hÃ ng Ä‘á»ƒ client dÃ¹ng cho Ä‘á»“ng há»“ Ä‘áº¿m ngÆ°á»£c.
- [x] 3.4 Cáº­p nháº­t API Webhook/Callback cá»§a cá»•ng thanh toÃ¡n: Náº¿u thanh toÃ¡n thÃ nh cÃ´ng, cÃ³ thá»ƒ chá»§ Ä‘á»™ng gá»i `unlockTicket` Ä‘á»ƒ xÃ³a khÃ³a (dá»n dáº¹p Redis) vÃ  hoÃ n táº¥t Ä‘Æ¡n hÃ ng.

## 4. API Seat Map (Tráº¡ng thÃ¡i vÃ© theo thá»i gian thá»±c)

- [x] 4.1 Chá»‰nh sá»­a API tráº£ vá» thÃ´ng tin danh sÃ¡ch vÃ© hoáº·c SÆ¡ Ä‘á»“ gháº¿ (Seat Map): Truy váº¥n thÃªm Redis Ä‘á»ƒ kiá»ƒm tra vÃ© nÃ o Ä‘ang bá»‹ khÃ³a.
- [x] 4.2 Tráº£ vá» tráº¡ng thÃ¡i tá»•ng há»£p cho tá»«ng gháº¿: `AVAILABLE` (cÃ²n trá»‘ng trÃªn cáº£ DB vÃ  Redis), `RESERVED` (Ä‘ang bá»‹ khÃ³a trÃªn Redis), hoáº·c `BOOKED` / `SOLD` (Ä‘Ã£ bÃ¡n trong DB).

## 5. Frontend Integration

- [x] 5.1 Cáº­p nháº­t trang Seat Map: Hiá»ƒn thá»‹ cÃ¡c gháº¿ cÃ³ tráº¡ng thÃ¡i `RESERVED` vá»›i mÃ u sáº¯c nháº­n diá»‡n riÃªng (vd: mÃ u vÃ ng/xÃ¡m) vÃ  vÃ´ hiá»‡u hÃ³a khÃ´ng cho click chá»n.
- [x] 5.2 XÃ¢y dá»±ng component Äá»“ng há»“ Ä‘áº¿m ngÆ°á»£c (Countdown Timer) 10 phÃºt trÃªn trang Thanh toÃ¡n (Checkout), sá»­ dá»¥ng `expiredAt` nháº­n tá»« API.
- [x] 5.3 Xá»­ lÃ½ khi Ä‘á»“ng há»“ Ä‘áº¿m ngÆ°á»£c vá» 0: Tá»± Ä‘á»™ng vÃ´ hiá»‡u hÃ³a nÃºt thanh toÃ¡n, hiá»ƒn thá»‹ thÃ´ng bÃ¡o "Háº¿t thá»i gian thanh toÃ¡n" vÃ  cung cáº¥p nÃºt quay vá» trang chá»§ hoáº·c Ä‘áº·t láº¡i vÃ©.
