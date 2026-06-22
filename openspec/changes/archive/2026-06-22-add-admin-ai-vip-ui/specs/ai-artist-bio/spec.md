## ADDED Requirements

### Requirement: Quản lý AI Artist Bio theo concert từ admin frontend
Admin frontend SHALL cho phép organizer chọn concert và xem bản AI Artist Bio mới nhất cùng trạng thái vòng đời của bản đó.

#### Scenario: Chọn concert đã có AI Bio
- **WHEN** organizer chọn một concert trong tab AI Artist Bio
- **THEN** UI SHALL gọi API lấy AI Bio mới nhất của concert
- **AND** UI SHALL hiển thị tên concert, `eventCode`, tên file PDF, trạng thái và nội dung phù hợp với trạng thái hiện tại

#### Scenario: Chọn concert chưa có AI Bio
- **WHEN** API cho biết concert chưa có bản AI Bio
- **THEN** UI SHALL hiển thị empty state
- **AND** UI SHALL cung cấp vùng upload PDF cho concert đang chọn

### Requirement: Upload PDF hồ sơ nghệ sĩ từ UI
Admin frontend SHALL cho phép organizer chọn một file PDF và upload bằng multipart field `file` cho concert hiện tại.

#### Scenario: Upload PDF hợp lệ
- **WHEN** organizer chọn file `.pdf` hợp lệ và xác nhận upload
- **THEN** UI SHALL gửi multipart request có bearer token và field `file`
- **AND** UI SHALL chuyển sang trạng thái đang xử lý sau khi backend chấp nhận

#### Scenario: Chọn file không hợp lệ
- **WHEN** organizer chọn file không phải PDF hoặc lớn hơn giới hạn 10 MB
- **THEN** UI SHALL chặn upload
- **AND** UI SHALL hiển thị lý do file không hợp lệ mà không gọi API

### Requirement: Theo dõi trạng thái xử lý AI Bio
Admin frontend SHALL tự cập nhật trạng thái khi AI Bio đang ở `UPLOADED` hoặc `PROCESSING`, và SHALL dừng polling khi đạt trạng thái terminal.

#### Scenario: Bio đang được xử lý
- **WHEN** bản AI Bio có trạng thái `UPLOADED` hoặc `PROCESSING`
- **THEN** UI SHALL hiển thị trạng thái đang xử lý
- **AND** UI SHALL tải lại bản mới nhất theo chu kỳ khoảng 3 giây mà không tạo request chồng lặp

#### Scenario: Bio xử lý hoàn tất
- **WHEN** trạng thái chuyển thành `AI_GENERATED`, `APPROVED`, `PUBLISHED` hoặc `FAILED`
- **THEN** UI SHALL dừng polling
- **AND** UI SHALL hiển thị nội dung hoặc lỗi tương ứng

#### Scenario: Organizer đổi concert hoặc rời tab
- **WHEN** organizer đổi concert, đổi tab hoặc rời trang trong lúc polling
- **THEN** UI SHALL hủy timer của concert trước
- **AND** response cũ SHALL không ghi đè dữ liệu của concert mới

### Requirement: Chỉnh sửa và duyệt bio AI từ UI
Admin frontend SHALL cho phép organizer xem `generatedBio`, chỉnh sửa nội dung và gửi `reviewedBio` khi trạng thái cho phép duyệt.

#### Scenario: Duyệt bio do AI tạo
- **WHEN** AI Bio có trạng thái `AI_GENERATED` và organizer submit nội dung chỉnh sửa không rỗng
- **THEN** UI SHALL gọi API review với `reviewedBio`
- **AND** UI SHALL cập nhật trạng thái hiển thị thành `APPROVED` khi request thành công

#### Scenario: Nội dung duyệt rỗng
- **WHEN** organizer xóa toàn bộ nội dung rồi bấm duyệt
- **THEN** UI SHALL chặn request
- **AND** UI SHALL thông báo nội dung bio không được để trống

### Requirement: Publish bio đã duyệt từ UI
Admin frontend SHALL chỉ cho phép publish khi AI Bio ở trạng thái `APPROVED` và SHALL thể hiện rõ nội dung công khai sau khi publish.

#### Scenario: Publish bio đã duyệt
- **WHEN** organizer xác nhận publish một bio `APPROVED`
- **THEN** UI SHALL gọi API publish
- **AND** UI SHALL hiển thị trạng thái `PUBLISHED` cùng `publishedBio` và thời điểm publish

#### Scenario: Bio chưa đủ điều kiện publish
- **WHEN** bio chưa ở trạng thái `APPROVED`
- **THEN** hành động publish SHALL bị ẩn hoặc disabled
- **AND** UI SHALL không gửi request publish

### Requirement: Hiển thị lỗi xử lý AI Bio
Admin frontend SHALL hiển thị `errorMessage` khi AI Bio có trạng thái `FAILED` và không hiển thị nội dung lỗi như bio công khai.

#### Scenario: Worker xử lý thất bại
- **WHEN** API trả AI Bio có trạng thái `FAILED`
- **THEN** UI SHALL hiển thị badge lỗi và thông điệp lỗi
- **AND** UI SHALL cho phép organizer upload PDF mới
