# TicketBox — Project Proposal

## Vấn đề
Thị trường giải trí và tổ chức đại nhạc hội (concert) tại Việt Nam đang bùng nổ mạnh mẽ với các sự kiện thu hút hàng chục nghìn khán giả tham gia cùng lúc (như *Anh Trai Say Hi, Anh Trai Vượt Ngàn Chông Gai, Chị Đẹp Đạp Gió Rẽ Sóng*). Tuy nhiên, hạ tầng phân phối vé hiện tại đang bộc lộ những hạn chế chí tử:

1. **Kênh bán vé thô sơ, thiếu an toàn:** Nhiều ban tổ chức vẫn duy trì việc bán vé qua Google Form, Zalo OA hoặc nhận chuyển khoản thủ công. Quy trình này hoàn toàn không có khả năng kiểm soát số lượng ghế theo thời gian thực, dẫn đến tình trạng bán lố số vé quy định (overselling) và thiếu công bằng.
2. **Nghẽn cổ chai hệ thống (System Bottleneck):** Các website bán vé truyền thống thường lập tức sập hoặc tê liệt (Crash) chỉ trong vài phút đầu mở bán do lượng truy cập đồng thời (concurrency) tăng vọt đột biến từ hàng chục nghìn người dùng thật và hệ thống bot script.
3. **Bất đồng nhất trạng thái giao dịch:** Tình trạng hệ thống thanh toán và hệ thống quản lý vé không đồng bộ khiến khán giả đã bị tài khoản ngân hàng trừ tiền nhưng không nhận được mã vé (e-ticket), gây khủng hoảng truyền thông cho ban tổ chức.
4. **Vấn nạn vé đầu cơ (Scalper Bots):** Gian lận vé diễn ra phổ biến khi các tài khoản ảo (bot) sử dụng công cụ để gom sạch các hạng vé VIP/SVIP trong vài giây, sau đó bán lại thị trường đen với giá cắt cổ, tước đi cơ hội của người hâm mộ chân chính.

## Mục tiêu
Hệ thống **TicketBox** được xây dựng nhằm số hóa toàn diện quy trình bán vé từ lúc mở bán đến khi kiểm soát ra vào tại sự kiện, đáp ứng các mục tiêu định lượng và định tính sau:

* **Khả năng chịu tải cực cao (High Concurrency):** Hệ thống có khả năng tiếp nhận và xử lý ổn định cho ít nhất **80.000 người dùng truy cập trong 5 phút đầu tiên** mở bán, trong đó chịu được đỉnh tải (Peak load) chiếm **70% lượng truy cập dồn vào 1 phút đầu tiên** mà không xảy ra hiện tượng sập hệ thống hoặc treo database.
* **Đảm bảo tính nhất quán dữ liệu tuyệt đối (Anti-Overselling):** Cam kết không xảy ra tình trạng bán lố vé cuối cùng, hai người không thể đặt trùng một vị trí ghế.
* **Thời gian phản hồi tối ưu:** Tốc độ phản hồi (Latency) cho các tác vụ xem danh sách concert và kiểm tra số vé còn lại đạt dưới **100ms** thông qua việc tối ưu tầng đệm cache.
* **Công bằng và bảo mật:** Chặn đứng tối thiểu **95%** các hành vi spam request từ Bot/Script thông qua cơ chế Rate Limiting, thực thi nghiêm ngặt giới hạn số lượng vé trên mỗi tài khoản cá nhân.
* **Khả năng hoạt động liên tục (High Availability):** Luồng soát vé tại cổng sự kiện phải đạt tỷ lệ hoạt động **100%** kể cả khi mất kết nối mạng Internet hoàn toàn tại địa điểm tổ chức (sân vận động, nhà thi đấu).

## Người dùng và nhu cầu

Hệ thống phục vụ 3 nhóm đối tượng cốt lõi với các nhu cầu đặc thù sau:

### 1. Khán giả (Khách mua vé)
* **Họ cần làm gì:** Xem lịch trình concert, danh sách nghệ sĩ, địa điểm; tương tác trực quan trên sơ đồ phân khu chỗ ngồi SVG; đặt vé, chọn số lượng, thanh toán trực tuyến và nhận mã QR E-ticket; xem lại lịch sử đơn hàng.
* **Điều quan trọng nhất với họ:** Quy trình mua vé nhanh chóng, mượt mà, minh bạch, không bị nghẽn mạng; thanh toán an toàn, không bị trừ tiền oan và e-ticket được sinh ra lập tức sau khi trừ tiền.

### 2. Ban tổ chức (Event Organizer)
* **Họ cần làm gì:** Tạo và quản trị thông tin concert; cấu hình linh hoạt các hạng vé (GA, VIP, SVIP...), giá vé, số lượng và giới hạn mua tối đa của mỗi tài khoản; upload hồ sơ nghệ sĩ; đồng bộ danh sách khách mời VIP từ đối tác (CSV qua email); theo dõi báo cáo doanh thu, tiến độ bán vé theo thời gian thực.
* **Điều quan trọng nhất với họ:** Hệ thống vận hành ổn định trong giờ cao điểm mở bán; kiểm soát quyền truy cập chặt chẽ; dữ liệu thống kê doanh thu chính xác; ngăn chặn được vấn nạn đầu cơ vé và giảm thiểu thời gian nhập liệu thủ công cho khách mời tài trợ.

### 3. Nhân sự soát vé (Gate Staff)
* **Họ cần làm gì:** Sử dụng ứng dụng di động (Android App) quét mã QR trên e-ticket của khán giả để thực hiện xác nhận check-in hợp lệ tại các cửa vào sự kiện.
* **Điều quan trọng nhất với họ:** Tốc độ quét và xử lý phản hồi cực nhanh (dưới 1 giây/vé) để tránh ùn tắc tại cổng; app phải chạy được ngoại tuyến (Offline) khi sóng di động bị yếu/ngắt kết nối do mật độ người tập trung quá đông.

## Phạm vi

### Trong phạm vi đồ án (In Scope)
* **Kiến trúc hệ thống:** Thiết kế và cài đặt hoàn chỉnh kiến trúc Modular Monolith (hoặc Microservices) Backend sử dụng Node.js/Express.js, kết hợp lưu trữ Polyglot Persistence (PostgreSQL cho dữ liệu ACID và Redis cho dữ liệu High-speed Caching/Queue).
* **Ứng dụng Khán giả & Admin:** Phát triển Web Application hoàn chỉnh cho luồng xem concert (tích hợp sơ đồ SVG tương tác), đặt giữ vé tạm trong 10 phút, quản trị hệ thống và cấu hình RBAC (Role-Based Access Control).
* **Ứng dụng Soát vé:** Phát triển Mobile App bằng Kotlin hỗ trợ cơ chế lưu trữ dữ liệu cục bộ (Local Storage / SharedPreferences) phục vụ luồng check-in offline và đồng bộ gom lô (Batch Sync) khi có mạng.
* **Tích hợp tính năng nâng cao:** 
    * Tích hợp cổng thanh toán Sandbox (VNPAY/MoMo) có áp dụng Circuit Breaker cách ly lỗi và Idempotency Key chống trùng lặp.
    * Tích hợp Google Gemini API xử lý bất đồng bộ để tự động sinh văn bản giới thiệu nghệ sĩ (AI Artist Bio) từ file PDF.
    * Tích hợp hệ thống Worker chạy ngầm tự động quét và nạp danh sách khách mời từ tệp CSV định kỳ.

### Ngoài phạm vi đồ án (Out of Scope)
* **Tích hợp thanh toán thật:** Hệ thống chỉ sử dụng môi trường thử nghiệm (Sandbox/Testing Gateway) của MoMo và VNPAY, không thực hiện giao dịch bằng tiền thật.
* **Hạ tầng Production quy mô lớn:** Đồ án không bao gồm việc cấu hình hạ tầng phân tán thực tế trên AWS/GCP với Auto-scaling group hay Load Balancer phần cứng, mà tập trung vào việc tối ưu tối đa hiệu năng chịu tải từ tầng ứng dụng (Application Level) thông qua code, cache, queue và thuật toán.
* **Phát hành vé cứng:** Hệ thống chỉ tập trung giải quyết bài toán Vé điện tử (E-ticket) qua mã QR Code, không hỗ trợ in hay vận chuyển vé vật lý.

## Rủi ro và ràng buộc

Hệ thống đối mặt với 5 rủi ro và ràng buộc kỹ thuật lớn bắt buộc phải giải quyết triệt để trong kiến trúc:

| Mã Rủi ro | Tên Rủi ro / Ràng buộc | Mô tả & Hệ quả kỹ thuật |
| :--- | :--- | :--- |
| **RR-01** | **Tranh chấp tài nguyên (Race Condition)** | Hàng chục nghìn request cùng tranh giành các block vé cuối cùng tại cùng một mili-giây. Nếu không xử lý lock hoặc atomic update, hệ thống sẽ bị bán lố vé (`Quantity < 0`). |
| **RR-02** | **Quá tải tầng lưu trữ (DB Bottleneck)** | Dòng traffic đột biến 80.000 người dùng nhấn liên tục vào trang chủ/chi tiết concert sẽ trực tiếp hủy diệt Connection Pool của PostgreSQL nếu không có chiến lược Cache-aside hợp lý bằng Redis. |
| **RR-03** | **Điểm nghẽn từ bên thứ ba (Third-party Dependency)** | API của VNPAY/MoMo hoặc Gemini API có thể phản hồi rất chậm hoặc sập hoàn toàn trong giờ cao điểm. Hệ thống TicketBox không được phép sập theo (phải bọc qua Circuit Breaker để cô lập lỗi). |
| **RR-04** | **Xung đột dữ liệu ngoại tuyến (Data Discrepancy)** | Khi các máy quét hoạt động ở chế độ Offline, dữ liệu vé lưu ở Local DB của thiết bị di động có thể bị sai lệch so với DB trung tâm (ví dụ: một vé bị đem đi quét ở hai máy offline khác nhau). Cần cơ chế xử lý xung đột khi đồng bộ. |
| **RR-05** | **Bế tắc tích hợp một chiều (Anti-API Integration)** | Hệ thống quản lý khách mời của các nhãn hàng tài trợ hoàn toàn không có API kết nối. Hệ thống buộc phải thiết kế một cổng nhận dữ liệu file CSV định kỳ chạy ngầm bằng Worker, có khả năng tự loại bỏ dòng lỗi, trùng lặp và không làm gián đoạn hệ thống đang chạy. |
