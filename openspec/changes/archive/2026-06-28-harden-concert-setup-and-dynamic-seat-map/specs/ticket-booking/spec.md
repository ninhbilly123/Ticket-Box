## ADDED Requirements

### Requirement: Loại vé có mã khu vực ổn định
Mỗi loại vé SHALL có `zoneCode` được chuẩn hóa và duy nhất trong phạm vi concert; tên loại vé SHALL chỉ dùng để hiển thị.

#### Scenario: Tạo loại vé hợp lệ
- **WHEN** ban tổ chức tạo loại vé với tên và zone code chưa tồn tại trong concert
- **THEN** hệ thống SHALL lưu zone code ở dạng chuẩn hóa
- **AND** SHALL tạo tồn kho tương ứng trong cùng transaction

#### Scenario: Tên hoặc zone code bị trùng
- **WHEN** ban tổ chức tạo hoặc cập nhật loại vé với tên hoặc zone code đã thuộc loại vé khác trong cùng concert
- **THEN** hệ thống SHALL từ chối yêu cầu với lỗi conflict rõ ràng

### Requirement: Khung thời gian bán loại vé phù hợp concert
Hệ thống SHALL xác thực cửa sổ bán của loại vé trước khi lưu và trước khi publish concert.

#### Scenario: Cửa sổ bán hợp lệ
- **WHEN** thời gian mở bán trước thời gian đóng bán và thời gian đóng bán không sau ngày biểu diễn
- **THEN** hệ thống SHALL chấp nhận cấu hình

#### Scenario: Cửa sổ bán không hợp lệ
- **WHEN** thời gian mở bán không trước thời gian đóng bán, ngày giờ không hợp lệ hoặc thời gian đóng bán sau ngày biểu diễn
- **THEN** hệ thống SHALL từ chối cấu hình

### Requirement: Fallback danh sách loại vé luôn khả dụng
Trang booking SHALL cung cấp danh sách loại vé độc lập với SVG để concert không dùng sơ đồ hoặc SVG không render được vẫn có thể bán vé.

#### Scenario: Chọn loại vé từ danh sách
- **WHEN** khán giả click một loại vé active còn tồn kho trong danh sách
- **THEN** hệ thống SHALL chọn loại vé đó
- **AND** SHALL đồng bộ highlight trên SVG nếu concert có khu vực tương ứng
