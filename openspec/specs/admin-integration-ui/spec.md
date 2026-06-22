# Admin Integration UI Specification

## Purpose

Quy định giao diện quản trị cho eventCode, AI Artist Bio, email nhãn hàng và báo cáo VIP Sync, bao gồm điều hướng, trạng thái dữ liệu, responsive và bảo vệ integration secrets.

## Requirements

### Requirement: Quản lý eventCode trong giao diện concert
Admin frontend SHALL yêu cầu ban tổ chức nhập `eventCode` khi tạo concert, gửi trường này theo contract backend và hiển thị mã trong các khu vực cần phân biệt concert.

#### Scenario: Tạo concert với eventCode hợp lệ
- **WHEN** ban tổ chức nhập đầy đủ thông tin concert và một `eventCode` hợp lệ
- **THEN** UI SHALL chuẩn hóa khoảng trắng đầu cuối và chữ hoa trước khi gửi yêu cầu
- **AND** concert vừa tạo SHALL hiển thị đúng mã sự kiện trong danh sách

#### Scenario: Bỏ trống eventCode
- **WHEN** ban tổ chức submit form tạo concert nhưng chưa nhập `eventCode`
- **THEN** UI SHALL chặn submit
- **AND** UI SHALL hiển thị lỗi tại trường mã sự kiện

#### Scenario: Backend từ chối eventCode
- **WHEN** backend từ chối mã sự kiện do trùng hoặc không hợp lệ
- **THEN** UI SHALL giữ lại dữ liệu đang nhập
- **AND** UI SHALL hiển thị thông điệp lỗi backend

### Requirement: Điều hướng tích hợp trong dashboard hiện tại
Admin frontend SHALL cung cấp các mục `AI Artist Bio`, `Email nhãn hàng` và `VIP Sync` trong hệ thống tab hiện có mà không làm thay đổi các chức năng quản trị khác.

#### Scenario: Organizer mở chức năng tích hợp
- **WHEN** tài khoản `ORGANIZER` đã đăng nhập chọn một tab tích hợp
- **THEN** UI SHALL hiển thị chức năng tương ứng trong cùng dashboard và session hiện tại
- **AND** tab đang chọn SHALL có trạng thái active rõ ràng

#### Scenario: Tài khoản không phải organizer
- **WHEN** tài khoản không có role `ORGANIZER` truy cập admin frontend
- **THEN** UI SHALL hiển thị trạng thái từ chối truy cập
- **AND** UI SHALL không tải dữ liệu AI Bio, sponsor email hoặc VIP report

### Requirement: Giao diện tích hợp thống nhất với style hiện tại
Các màn hình tích hợp SHALL tái sử dụng ngôn ngữ thiết kế và component hiện có của admin frontend, đồng thời hỗ trợ desktop và mobile mà không chồng lấn nội dung.

#### Scenario: Hiển thị trên desktop
- **WHEN** dashboard hiển thị trên viewport desktop
- **THEN** form, bộ lọc và bảng SHALL dùng style tương thích các tab hiện tại
- **AND** dữ liệu vận hành SHALL được bố trí gọn để dễ quét và so sánh

#### Scenario: Hiển thị trên mobile
- **WHEN** dashboard hiển thị trên viewport mobile
- **THEN** tab SHALL có thể cuộn hoặc xuống dòng mà không che nội dung
- **AND** form SHALL chuyển về một cột
- **AND** bảng rộng SHALL cuộn ngang trong vùng chứa

### Requirement: Trạng thái dữ liệu nhất quán
Mỗi khu vực tích hợp SHALL thể hiện rõ trạng thái loading, empty, success và error mà không làm mất dữ liệu form đang nhập khi request thất bại.

#### Scenario: Chưa có dữ liệu
- **WHEN** API trả về danh sách rỗng hoặc concert chưa có AI Bio
- **THEN** UI SHALL hiển thị empty state cụ thể
- **AND** UI SHALL hiển thị hành động hợp lệ tiếp theo nếu có

#### Scenario: API gặp lỗi
- **WHEN** một request tích hợp thất bại
- **THEN** UI SHALL dừng trạng thái loading liên quan
- **AND** UI SHALL hiển thị thông điệp lỗi theo cơ chế alert hiện tại

### Requirement: Không quản lý integration secret trên admin frontend
Admin frontend SHALL không đọc, hiển thị hoặc cho phép chỉnh sửa Gemini API key, IMAP password, SMTP password, MinIO secret hoặc `QR_SECRET_KEY`.

#### Scenario: Organizer sử dụng tab tích hợp
- **WHEN** organizer mở AI Artist Bio, Email nhãn hàng hoặc VIP Sync
- **THEN** UI SHALL chỉ thao tác dữ liệu nghiệp vụ qua backend API
- **AND** không integration secret nào SHALL xuất hiện trong response model, form hoặc local storage
