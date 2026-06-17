export interface Ticket {
  type: string
  price: number
  available: number
}

export interface SeatingZone {
  id: string
  name: string
  color: string
  percentage: string
  price: number
  available: number
}

export interface Concert {
  id: string
  name: string
  artist: string
  date: string
  time: string
  venue: string
  city: string
  image: string
  tickets: Ticket[]
  description?: string
  artistBio?: string
  zones?: SeatingZone[]
}

export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface OrderTicket {
  type: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: string
  orderCode: string
  concertId: string
  concertName: string
  concertDate: string
  concertVenue: string
  concertImage: string
  customerName: string
  customerEmail: string
  tickets: OrderTicket[]
  totalAmount: number
  paymentMethod: string
  status: OrderStatus
  createdAt: string
  paidAt?: string
  qrCode?: string
}

export const concerts: Concert[] = [
  {
    id: '1',
    name: 'Dream Concert 2025',
    artist: 'The Harmonies',
    date: '2025-07-15',
    time: '19:00',
    venue: 'Nhạc Viện TP.HCM',
    city: 'TP. Hồ Chí Minh',
    image: '/concert-1.png',
    description: 'Trải nghiệm một đêm âm nhạc tuyệt vời với The Harmonies - những nghệ sĩ được yêu thích nhất tại Việt Nam. Chương trình biểu diễn đặc biệt này sẽ mang đến những bài hát hay nhất kết hợp với hiệu ứng sân khấu hiện đại.',
    artistBio: 'The Harmonies là một nhóm nhạc đẳng cấp quốc tế với hơn 15 năm kinh nghiệm trên sân khấu. Họ đã có nhiều album vàng và những buổi hòa nhạc thành công trên khắp thế giới. Âm nhạc của họ kết hợp giữa R&B, Soul và Pop, tạo nên một phong cách độc đáo và thu hút lượng fan khổng lồ.',
    tickets: [
      { type: 'GA', price: 500000, available: 120 },
      { type: 'VIP', price: 1500000, available: 34 },
      { type: 'SVIP', price: 3000000, available: 5 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 500000, available: 120 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 800000, available: 85 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 1200000, available: 45 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1500000, available: 34 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 3000000, available: 5 },
    ],
  },
  {
    id: '2',
    name: 'Summer Night Festival',
    artist: 'Luna Moon',
    date: '2025-07-20',
    time: '20:00',
    venue: 'Công viên Tào Đàn',
    city: 'Hà Nội',
    image: '/concert-2.png',
    description: 'Một đêm hè tuyệt vời với Luna Moon - giọng ca xinh đẹp được yêu thích toàn châu Á. Bạn sẽ được thưởng thức những bài hát hit được biến tấu mới, cùng với các vũ điệu sôi động trên sân khấu công viên.',
    artistBio: 'Luna Moon là một ngôi sao âm nhạc nổi tiếng với những ca khúc pop-ballad lãng mạn. Cô đã giành nhiều giải thưởng âm nhạc quốc tế và được yêu thích bởi hàng triệu người hâm mộ trên khắp thế giới. Âm nhạc của Luna luôn mang đến cảm xúc sâu sắc và những kỷ niệm đẹp.',
    tickets: [
      { type: 'GA', price: 450000, available: 250 },
      { type: 'VIP', price: 1200000, available: 85 },
      { type: 'SVIP', price: 2500000, available: 8 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 450000, available: 250 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 700000, available: 100 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 950000, available: 60 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1200000, available: 85 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 2500000, available: 8 },
    ],
  },
  {
    id: '3',
    name: 'Electric Vibes Tour',
    artist: 'Neon Nights',
    date: '2025-07-25',
    time: '18:30',
    venue: 'Sân vận động Mỹ Đình',
    city: 'Hà Nội',
    image: '/concert-3.png',
    description: 'Một buổi hòa nhạc điện tử futuristic với Neon Nights - nhóm nhạc theo dõi xu hướng âm nhạc điện tử toàn cầu. Với những bộ đồ neon rực rỡ và âm thanh công nghệ cao, đây sẽ là một trải nghiệm không thể quên.',
    artistBio: 'Neon Nights là nhóm nhạc điện tử nổi tiếng với phong cách cyberpunk hiện đại. Họ đã biểu diễn tại các lễ hội âm nhạc lớn nhất thế giới và được công nhân là những tiên phong trong dòng nhạc EDM fusion tại Châu Á.',
    tickets: [
      { type: 'GA', price: 600000, available: 45 },
      { type: 'VIP', price: 1800000, available: 12 },
      { type: 'SVIP', price: 3500000, available: 0 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 600000, available: 45 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 900000, available: 30 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 1350000, available: 18 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1800000, available: 12 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 3500000, available: 0 },
    ],
  },
  {
    id: '4',
    name: 'Retro Beats Live',
    artist: 'Echo Chamber',
    date: '2025-07-28',
    time: '19:30',
    venue: 'Diamond Plaza',
    city: 'TP. Hồ Chí Minh',
    image: '/concert-4.png',
    description: 'Hãy quay trở lại những năm 70-80 với Echo Chamber - một ban nhạc chuyên thể hiện các bản hit cổ điển. Một buổi hòa nhạc đầy hoài niệm với những giai điệu vàng son từng làm nên thế hệ âm nhạc.',
    artistBio: 'Echo Chamber là một nhóm nhạc chuyên biệt trong việc tái hiện và phổ biến những bài hát kinh điển từ thập kỷ 70-80. Với những arrange độc đáo, họ đem đến một không gian âm nhạc vừa quen thuộc vừa mới lạ cho người nghe.',
    tickets: [
      { type: 'GA', price: 550000, available: 180 },
      { type: 'VIP', price: 1600000, available: 56 },
      { type: 'SVIP', price: 2800000, available: 15 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 550000, available: 180 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 850000, available: 90 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 1225000, available: 54 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1600000, available: 56 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 2800000, available: 15 },
    ],
  },
  {
    id: '5',
    name: 'Indie Soul Showcase',
    artist: 'City Lights',
    date: '2025-08-05',
    time: '20:00',
    venue: 'Hoàng Hoa Thám Open Air',
    city: 'TP. Hồ Chí Minh',
    image: '/concert-5.png',
    description: 'Một buổi hòa nhạc indie soul intimate với City Lights - nhóm nhạc tài năng với giọng hát sâu sắc. Hãy thưởng thức những bài hát gốc được sáng tác từ tâm hồn tại một sân khấu ngoài trời lãng mạn.',
    artistBio: 'City Lights là một dự án âm nhạc của những nhạc sĩ tài năng tập trung vào soul và indie pop. Với giọng hát ấm áp và những lời bài hát sâu sắc, họ đã tạo dựng cho mình một cộng đồng fan nghe nhạc lớn mạnh.',
    tickets: [
      { type: 'GA', price: 400000, available: 9 },
      { type: 'VIP', price: 1100000, available: 22 },
      { type: 'SVIP', price: 2200000, available: 0 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 400000, available: 9 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 600000, available: 8 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 850000, available: 5 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1100000, available: 22 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 2200000, available: 0 },
    ],
  },
  {
    id: '6',
    name: 'Jazz Under Stars',
    artist: 'Blue Notes',
    date: '2025-08-10',
    time: '19:00',
    venue: 'Hồ Tây Amphitheater',
    city: 'Hà Nội',
    image: '/concert-6.png',
    description: 'Một đêm jazz thanh lịch dưới ánh sao với Blue Notes - một trong những ban nhạc jazz danh tiếng nhất của Châu Á. Thưởng thức những giai điệu mượt mà và những solo đàn jazz tuyệt vời trên một sân khấu ngoài trời thơ mộng.',
    artistBio: 'Blue Notes là một tập thể các nhạc sĩ jazz hàng đầu với hơn 20 năm kinh nghiệm biểu diễn. Họ kết hợp giữa truyền thống jazz cổ điển và những sáng tạo hiện đại, tạo nên một âm nhạc vừa lâu đời vừa sôi động.',
    tickets: [
      { type: 'GA', price: 480000, available: 320 },
      { type: 'VIP', price: 1400000, available: 92 },
      { type: 'SVIP', price: 2600000, available: 25 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 480000, available: 320 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 750000, available: 160 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 1050000, available: 96 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1400000, available: 92 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 2600000, available: 25 },
    ],
  },
  {
    id: '7',
    name: 'Pop Explosion',
    artist: 'Starlight',
    date: '2025-08-15',
    time: '20:30',
    venue: 'Phú Thọ Stadium',
    city: 'TP. Hồ Chí Minh',
    image: '/concert-7.png',
    description: 'Một buổi hòa nhạc pop sôi động với Starlight - ngôi sao pop toàn cầu được yêu thích hàng triệu người. Với những màn trình diễn spectacle và những bài hát hit, đây sẽ là một buổi hòa nhạc không thể quên.',
    artistBio: 'Starlight là một trong những nữ ca sĩ pop nổi tiếng nhất thế giới, với hàng chục album vàng và một lượng fan khổng lồ. Cô nổi tiếng với những bài hát pop sôi động và những buổi hòa nhạc hoành tráng với công nghệ sân khấu tới tân.',
    tickets: [
      { type: 'GA', price: 520000, available: 140 },
      { type: 'VIP', price: 1550000, available: 48 },
      { type: 'SVIP', price: 3000000, available: 3 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 520000, available: 140 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 820000, available: 70 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 1185000, available: 42 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1550000, available: 48 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 3000000, available: 3 },
    ],
  },
  {
    id: '8',
    name: 'World Music Fusion',
    artist: 'Global Harmony',
    date: '2025-08-20',
    time: '19:00',
    venue: 'Water Park Stage',
    city: 'Hà Nội',
    image: '/concert-8.png',
    description: 'Một buổi hòa nhạc âm nhạc thế giới đa sắc tộc với Global Harmony. Khám phá các nhạc cụ truyền thống từ khắp nơi trên thế giới được kết hợp với âm thanh hiện đại, tạo nên một âm nhạc vô cùng độc đáo.',
    artistBio: 'Global Harmony là một tổ chức âm nhạc quốc tế chuyên tập hợp các nhạc sĩ từ các nền văn hóa khác nhau trên thế giới. Họ tin rằng âm nhạc là ngôn ngữ phổ quát kết nối mọi con người, và mỗi buổi biểu diễn của họ là một tiệc âm nhạc đa sắc tộc tuyệt vời.',
    tickets: [
      { type: 'GA', price: 420000, available: 280 },
      { type: 'VIP', price: 1300000, available: 70 },
      { type: 'SVIP', price: 2400000, available: 16 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 420000, available: 280 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 650000, available: 140 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 950000, available: 84 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1300000, available: 70 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 2400000, available: 16 },
    ],
  },
  {
    id: '9',
    name: 'Rock Legends Night',
    artist: 'Thunder Road',
    date: '2025-08-25',
    time: '20:00',
    venue: 'Aeon Mall Tân Phú',
    city: 'TP. Hồ Chí Minh',
    image: '/concert-9.png',
    description: 'Một đêm rock tưng bừng với Thunder Road - huyền thoại rock with kinh nghiệm hơn 30 năm. Thưởng thức những bài rock anthem từng làm nên thế hệ với những riff guitar cổ điển và những lời bài hát truyền cảm hứng.',
    artistBio: 'Thunder Road là một nhóm rock huyền thoại với những album vàng liên tiếp. Họ nổi tiếng với những bài rock anthem và đã tạo ra những hit bất tử được công nhân trên toàn thế giới. Mỗi buổi biểu diễn của họ là một hành trình trở lại với tuổi thơ của rock.',
    tickets: [
      { type: 'GA', price: 580000, available: 95 },
      { type: 'VIP', price: 1700000, available: 38 },
      { type: 'SVIP', price: 3200000, available: 7 },
    ],
    zones: [
      { id: 'ga', name: 'GA - Đứng', color: '#9B7FFF', percentage: '50%', price: 580000, available: 95 },
      { id: 'cat2', name: 'CAT 2', color: '#B99FFF', percentage: '25%', price: 900000, available: 48 },
      { id: 'cat1', name: 'CAT 1', color: '#D4C5FF', percentage: '15%', price: 1290000, available: 29 },
      { id: 'vip', name: 'VIP', color: '#7A5FFF', percentage: '7%', price: 1700000, available: 38 },
      { id: 'svip', name: 'SVIP - VIP đặc biệt', color: '#6C47FF', percentage: '3%', price: 3200000, available: 7 },
    ],
  },
]

export const orders: Order[] = [
  {
    id: 'ord-001',
    orderCode: 'TBX-2025-001234',
    concertId: '1',
    concertName: 'Dream Concert 2025',
    concertDate: '2025-07-15',
    concertVenue: 'Nhạc Viện TP.HCM',
    concertImage: '/concert-1.png',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    tickets: [
      { type: 'GA', quantity: 2, unitPrice: 500000 },
      { type: 'VIP', quantity: 1, unitPrice: 1500000 },
    ],
    totalAmount: 2500000,
    paymentMethod: 'VNPAY',
    status: 'COMPLETED',
    createdAt: '2025-07-01',
    paidAt: '2025-07-01',
    qrCode: 'iVBORw0KGgoAAAANSUhEUgAAAMIAAADCAYAAABytHkDAAAA...',
  },
  {
    id: 'ord-002',
    orderCode: 'TBX-2025-001235',
    concertId: '2',
    concertName: 'Summer Night Festival',
    concertDate: '2025-07-20',
    concertVenue: 'Công viên Tào Đàn',
    concertImage: '/concert-2.png',
    customerName: 'Trần Thị B',
    customerEmail: 'tranthib@example.com',
    tickets: [
      { type: 'GA', quantity: 3, unitPrice: 450000 },
    ],
    totalAmount: 1350000,
    paymentMethod: 'MOMO',
    status: 'COMPLETED',
    createdAt: '2025-07-02',
    paidAt: '2025-07-02',
    qrCode: 'iVBORw0KGgoAAAANSUhEUgAAAMIAAADCAYAAABytHkDAAAA...',
  },
  {
    id: 'ord-003',
    orderCode: 'TBX-2025-001236',
    concertId: '3',
    concertName: 'Electric Vibes Tour',
    concertDate: '2025-07-25',
    concertVenue: 'Sân vận động Mỹ Đình',
    concertImage: '/concert-3.png',
    customerName: 'Lê Văn C',
    customerEmail: 'levanc@example.com',
    tickets: [
      { type: 'VIP', quantity: 2, unitPrice: 1800000 },
    ],
    totalAmount: 3600000,
    paymentMethod: 'VNPAY',
    status: 'PENDING',
    createdAt: '2025-07-10',
  },
  {
    id: 'ord-004',
    orderCode: 'TBX-2025-001237',
    concertId: '4',
    concertName: 'Retro Beats Live',
    concertDate: '2025-07-28',
    concertVenue: 'Diamond Plaza',
    concertImage: '/concert-4.png',
    customerName: 'Phạm Thị D',
    customerEmail: 'phamthid@example.com',
    tickets: [
      { type: 'GA', quantity: 1, unitPrice: 550000 },
    ],
    totalAmount: 550000,
    paymentMethod: 'MOMO',
    status: 'CANCELLED',
    createdAt: '2025-07-05',
  },
]
