# Ticket Scanning

## Purpose
Đặc tả chi tiết các yêu cầu liên quan đến quét mã QR vé (cả vé thường và vé VIP), xác thực trạng thái check-in trên thiết bị soát vé di động (Android Scanner App), quản lý ranh giới thiết bị (Scanner Client Boundary) và đồng bộ hóa hàng đợi offline.

## Requirements

### Requirement: Quét và xác thực mã QR của vé
Hệ thống SHALL cung cấp API check-in bảo vệ bằng JWT/RBAC để Android Scanner App gửi QR token, xác thực vé và cập nhật trạng thái check-in bằng thao tác atomic để một vé chỉ có một lượt check-in thành công.

#### Scenario: Quét vé từ Android Scanner App hợp lệ
- **WHEN** Android Scanner App gửi một QR token hợp lệ của vé chưa dùng kèm JWT role `CHECKIN_STAFF`
- **AND** nhân viên được phân công đúng concert/gate
- **THEN** backend SHALL cập nhật vé thành đã check-in
- **AND** backend SHALL trả kết quả `VALID` cùng thông tin loại vé và khách hàng.

#### Scenario: Quét vé từ staff không được phân công
- **WHEN** Android Scanner App gửi QR token cho concert/gate mà nhân viên không được phân công
- **THEN** backend SHALL từ chối request với lỗi phân quyền
- **AND** backend SHALL không cập nhật trạng thái vé.

#### Scenario: Hai request quét cùng một vé đồng thời
- **WHEN** hai request hợp lệ cùng quét một QR chưa dùng
- **THEN** chỉ một request SHALL trả `VALID`
- **AND** request còn lại SHALL trả `ALREADY_USED`
- **AND** chỉ một check-in log thành công được ghi nhận.

#### Scenario: Quét vé không hợp lệ
- **WHEN** một mã QR token không hợp lệ hoặc bị làm giả được gửi lên để quét
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi "Vé không hợp lệ"

#### Scenario: Quét vé trùng lặp
- **WHEN** một mã QR token hợp lệ nhưng đã được check-in trước đó được gửi lên
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi "Vé đã được sử dụng"

#### Scenario: Đồng bộ lượt quét offline
- **WHEN** Android Scanner App gửi danh sách lượt quét offline theo thứ tự thời gian
- **THEN** backend SHALL xử lý từng lượt theo quy tắc First-Scan Wins
- **AND** backend SHALL trả danh sách conflict cho các lượt không thể đồng bộ thành công.

---

### Requirement: Quét E-Ticket của khách mời VIP
Hệ thống SHALL cho phép nhân sự soát vé xác thực QR e-ticket của khách mời VIP cả trong luồng online scan và offline sync tại cổng VIP bằng cùng cơ chế an toàn như e-ticket mua thường.

#### Scenario: Quét e-ticket VIP hợp lệ
- **WHEN** nhân sự soát vé gửi QR token hợp lệ của một khách mời VIP chưa check-in
- **THEN** hệ thống SHALL cập nhật trạng thái khách mời VIP thành đã check-in
- **AND** hệ thống SHALL trả về thông tin khách mời, công ty, concert và loại vé VIP guest.

#### Scenario: Quét e-ticket VIP đã sử dụng
- **WHEN** nhân sự soát vé gửi QR token của một khách mời VIP đã check-in trước đó
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi cho biết e-ticket VIP đã được sử dụng.

#### Scenario: Quét e-ticket VIP không hợp lệ
- **WHEN** nhân sự soát vé gửi QR token không tồn tại hoặc không khớp chữ ký hệ thống
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi cho biết e-ticket VIP không hợp lệ.

#### Scenario: Đồng bộ offline QR VIP hợp lệ
- **WHEN** Scanner App đồng bộ một QR token VIP hợp lệ đã quét offline
- **THEN** backend SHALL cập nhật khách mời VIP thành đã check-in
- **AND** sync response SHALL tăng `syncedCount`
- **AND** backend SHALL NOT trả conflict `INVALID_TICKET` cho QR VIP hợp lệ.

#### Scenario: Đồng bộ offline QR VIP đã dùng
- **WHEN** Scanner App đồng bộ một QR token VIP đã check-in trước đó
- **THEN** backend SHALL trả conflict cho lượt quét đó
- **AND** conflict reason SHALL cho biết vé/khách mời đã được sử dụng.

---

### Requirement: Scanner Client Boundary
Hệ thống SHALL coi Android Scanner App là client chính cho thao tác quét tại cổng, còn admin web là client quản lý và giám sát.

#### Scenario: Nhân viên cần quét tại cổng
- **WHEN** nhân viên soát vé bắt đầu ca làm
- **THEN** nhân viên SHALL dùng Android Scanner App trên điện thoại để quét QR
- **AND** admin web SHALL không là luồng vận hành chính cho camera scanning tại cổng.
