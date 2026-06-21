## Context

Dá»± Ã¡n **TicketBox** yÃªu cáº§u xÃ¢y dá»±ng luá»“ng nghiá»‡p vá»¥ xem thÃ´ng tin vÃ  mua vÃ© dÃ nh cho khÃ¡n giáº£. ÄÃ¢y lÃ  tÃ­nh nÄƒng trá»±c tiáº¿p chá»‹u táº£i lá»›n khi má»Ÿ bÃ¡n concert (flash sale), Ä‘Ã²i há»i há»‡ thá»‘ng pháº£i Ä‘áº£m báº£o hiá»‡u nÄƒng cao, pháº£n há»“i nhanh vÃ  ngÄƒn cháº·n Ä‘Æ°á»£c cÃ¡c váº¥n Ä‘á» race condition hay vÆ°á»£t giá»›i háº¡n mua vÃ© cá»§a má»—i tÃ i khoáº£n.

TÃ i liá»‡u nÃ y thiáº¿t káº¿ kiáº¿n trÃºc ká»¹ thuáº­t sá»­ dá»¥ng:
- **Backend**: Node.js + Express.js + Prisma ORM
- **Database**: PostgreSQL 16
- **Caching**: Redis 7
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS

## Goals / Non-Goals

**Goals:**
- Tá»‘i Æ°u hÃ³a hiá»‡u nÄƒng hiá»ƒn thá»‹ sá»‘ lÆ°á»£ng vÃ© cÃ²n láº¡i thÃ´ng qua cÆ¡ cháº¿ Redis Cache-aside (TTL 30s).
- Äáº£m báº£o tÃ­nh chÃ­nh xÃ¡c vÃ  an toÃ n dá»¯ liá»‡u, khÃ´ng xáº£y ra tÃ¬nh tráº¡ng bÃ¡n quÃ¡ sá»‘ lÆ°á»£ng vÃ© kháº£ dá»¥ng (overselling) khi cÃ³ hÃ ng ngÃ n ngÆ°á»i truy cáº­p cÃ¹ng lÃºc.
- Ãp dá»¥ng kiá»ƒm tra cháº·t cháº½ giá»›i háº¡n sá»‘ vÃ© tá»‘i Ä‘a má»™t ngÆ°á»i dÃ¹ng cÃ³ thá»ƒ mua (per-user limit) dá»±a trÃªn lá»‹ch sá»­ giao dá»‹ch thÃ nh cÃ´ng.
- Táº£i vÃ  tÆ°Æ¡ng tÃ¡c sÆ¡ Ä‘á»“ chá»— ngá»“i SVG linh hoáº¡t mÃ  khÃ´ng lÃ m náº·ng cÆ¡ sá»Ÿ dá»¯ liá»‡u.

**Non-Goals:**
- TÃ­ch há»£p cá»•ng thanh toÃ¡n thá»±c táº¿ (VNPAY/MoMo) - chá»‰ mÃ´ phá»ng tráº¡ng thÃ¡i thanh toÃ¡n cá»§a Order (`PAID`).
- SoÃ¡t vÃ© vÃ  Ä‘á»“ng bá»™ offline (thuá»™c pháº¡m vi module soÃ¡t vÃ©).

## Decisions

### 1. Thiáº¿t káº¿ Database Schema (Prisma)
ChÃºng ta thiáº¿t káº¿ cÃ¡c Model Ä‘á»ƒ quáº£n lÃ½ Concert, TicketType, Order vÃ  Ticket:

```prisma
model Concert {
  id          String       @id @default(uuid())
  title       String
  description String?
  artist      String
  dateTime    DateTime
  location    String
  seatMapUrl  String       // ÄÆ°á»ng dáº«n tá»›i file SVG sÆ¡ Ä‘á»“ chá»— ngá»“i trÃªn CDN/Storage
  ticketTypes TicketType[]
  orders      Order[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("concerts")
}

model TicketType {
  id                 String   @id @default(uuid())
  concertId          String
  concert            Concert  @relation(fields: [concertId], references: [id], onDelete: Cascade)
  name               String   // GA, SVIP, VIP, CAT1, CAT2...
  price              Decimal  @db.Decimal(12, 2)
  totalQuantity      Int      // Tá»•ng sá»‘ vÃ© phÃ¡t hÃ nh cá»§a háº¡ng nÃ y
  maxLimitPerUser    Int      // Sá»‘ vÃ© tá»‘i Ä‘a 1 user Ä‘Æ°á»£c phÃ©p mua thÃ nh cÃ´ng
  tickets            Ticket[]
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("ticket_types")
}

model Order {
  id          String      @id @default(uuid())
  userId      String      // LiÃªn káº¿t tá»›i tÃ i khoáº£n ngÆ°á»i dÃ¹ng
  concertId   String
  concert     Concert     @relation(fields: [concertId], references: [id])
  totalAmount Decimal     @db.Decimal(12, 2)
  status      OrderStatus @default(PENDING) // PENDING, PAID, CANCELLED
  tickets     Ticket[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("orders")
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
}

model Ticket {
  id           String       @id @default(uuid())
  orderId      String
  order        Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  ticketTypeId String
  ticketType   TicketType   @relation(fields: [ticketTypeId], references: [id])
  seatNumber   String?      // MÃ£ gháº¿ cá»¥ thá»ƒ (náº¿u cÃ³, e.g. A12)
  status       TicketStatus @default(RESERVED) // RESERVED, BOOKED, REFUNDED
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@map("tickets")
}

enum TicketStatus {
  RESERVED // Khi táº¡o order pending (khoÃ¡ táº¡m thá»i)
  BOOKED   // Khi order Ä‘Ã£ thanh toÃ¡n thÃ nh cÃ´ng (PAID)
  REFUNDED // Khi hoÃ n vÃ©
}
```

### 2. Thiáº¿t káº¿ CÆ¡ cháº¿ Redis Cache-aside cho VÃ© cÃ²n láº¡i
Äá»ƒ giáº£m táº£i cho PostgreSQL khi hÃ ng ngÃ n ngÆ°á»i dÃ¹ng táº£i trang danh sÃ¡ch/chi tiáº¿t concert cÃ¹ng lÃºc:
- **Key Pattern**: `ticket_inventory:<ticket_type_id>` lÆ°u giÃ¡ trá»‹ integer lÃ  sá»‘ vÃ© cÃ²n láº¡i.
- **Luá»“ng Äá»c (Read)**:
  1. Frontend gá»i API láº¥y sá»‘ vÃ© cÃ²n láº¡i.
  2. Backend kiá»ƒm tra trÃªn Redis:
     - *Náº¿u cÃ³ (Cache Hit)*: Tráº£ vá» káº¿t quáº£ ngay láº­p tá»©c.
     - *Náº¿u khÃ´ng cÃ³ (Cache Miss)*: Query DB tÃ­nh sá»‘ vÃ© Ä‘Ã£ bÃ¡n (Tickets cÃ³ status `RESERVED` hoáº·c `BOOKED`). Sá»‘ vÃ© cÃ²n láº¡i = `totalQuantity` - `Sold`. LÆ°u giÃ¡ trá»‹ nÃ y vÃ o Redis vá»›i **TTL 30 giÃ¢y**.
- **Luá»“ng Invalidate (Ghi/Huá»·)**:
  - Khi má»™t giao dá»‹ch Ä‘áº·t vÃ© má»›i Ä‘Æ°á»£c táº¡o hoáº·c thanh toÃ¡n thÃ nh cÃ´ng, Backend SHALL xÃ³a key `ticket_inventory:<ticket_type_id>` trÃªn Redis. Láº§n truy cáº­p tiáº¿p theo sáº½ tá»± Ä‘á»™ng load láº¡i dá»¯ liá»‡u má»›i nháº¥t tá»« DB.

### 3. Thuáº­t toÃ¡n kiá»ƒm tra Giá»›i háº¡n mua cá»§a KhÃ¡n giáº£ (Per-user Limit)
Má»—i láº§n ngÆ°á»i dÃ¹ng gá»­i yÃªu cáº§u Ä‘áº·t $K$ vÃ© loáº¡i `ticketTypeId`:
1. Backend thá»±c hiá»‡n Ä‘áº¿m sá»‘ lÆ°á»£ng vÃ© loáº¡i `ticketTypeId` mÃ  `userId` Ä‘Ã£ mua thÃ nh cÃ´ng trong DB:
   ```sql
   SELECT COUNT(*) FROM tickets t
   JOIN orders o ON t.orderId = o.id
   WHERE o.userId = :userId
     AND t.ticketTypeId = :ticketTypeId
     AND o.status = 'PAID'
   ```
2. Náº¿u `Sá»‘_vÃ©_Ä‘Ã£_mua + K > ticket_types.maxLimitPerUser`, Backend tráº£ vá» lá»—i vÃ  cháº·n giao dá»‹ch.

### 4. Thiáº¿t káº¿ SÆ¡ Ä‘á»“ Chá»— ngá»“i SVG TÆ°Æ¡ng tÃ¡c á»Ÿ Frontend
- File sÆ¡ Ä‘á»“ chá»— ngá»“i Ä‘á»‹nh dáº¡ng `.svg` Ä‘Æ°á»£c thiáº¿t káº¿ cÃ³ cáº¥u trÃºc nhÃ³m `<g id="vip" class="seat-zone">` tÆ°Æ¡ng á»©ng vá»›i mÃ£/tÃªn phÃ¢n háº¡ng vÃ©.
- Next.js Frontend fetch file SVG tá»« `seatMapUrl`, render trá»±c tiáº¿p vÃ o DOM (inline SVG).
- DÃ¹ng Javascript láº¯ng nghe sá»± kiá»‡n click trÃªn cÃ¡c khu vá»±c SVG cÃ³ class `.seat-zone` Ä‘á»ƒ xÃ¡c Ä‘á»‹nh khu vá»±c Ä‘Æ°á»£c chá»n vÃ  hiá»ƒn thá»‹ form chá»n sá»‘ lÆ°á»£ng tÆ°Æ¡ng á»©ng.

## Risks / Trade-offs

- **[Risk 1: Cache stampede / Thá»§ng cache]** â†’ Khi cache háº¿t háº¡n vÃ  cÃ³ hÃ ng ngÃ n request cÃ¹ng lÃºc truy cáº­p, há»‡ thá»‘ng cÃ³ thá»ƒ bá»‹ quÃ¡ táº£i DB do query dá»“n dáº­p.
  - *Mitigation*: Sá»­ dá»¥ng cÆ¡ cháº¿ khÃ³a mutex Ä‘Æ¡n giáº£n trÃªn bá»™ nhá»› node hoáº·c thiáº¿t láº­p thá»i gian TTL ngáº«u nhiÃªn nháº¹ (jitter) Ä‘á»ƒ trÃ¡nh viá»‡c nhiá»u key cÃ¹ng háº¿t háº¡n má»™t lÃºc.
- **[Risk 2: Tranh cháº¥p Ä‘áº·t vÃ© (Race Condition)]** â†’ Nhiá»u ngÆ°á»i dÃ¹ng Ä‘áº·t vÃ© cÃ¹ng lÃºc dáº«n Ä‘áº¿n sá»‘ lÆ°á»£ng vÃ© thá»±c táº¿ trong DB bá»‹ Ã¢m (overselling).
  - *Mitigation*: Sá»­ dá»¥ng Prisma transaction cÃ¹ng khÃ³a bi quan (pessimistic lock hoáº·c `SELECT ... FOR UPDATE` thÃ´ng qua `$queryRaw` cá»§a Prisma) khi thá»±c hiá»‡n trá»« kho sá»‘ lÆ°á»£ng vÃ© trong DB.
