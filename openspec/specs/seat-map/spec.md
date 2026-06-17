# Seat Map

## Purpose
TBD

## Requirements

### Requirement: Hiển thị sơ đồ chỗ ngồi dạng SVG tương tác
Hệ thống SHALL hiển thị sơ đồ chỗ ngồi của concert dưới dạng SVG tương tác. Sơ đồ này phải phân biệt rõ ràng bố cục và ranh giới các khu vực vé khác nhau bao gồm: GA, SVIP, VIP, CAT1, CAT2 bằng màu sắc và ký hiệu trực quan, đồng thời thể hiện các vé đang bị "khóa" (Reserved) bởi người khác.

#### Scenario: Xem sơ đồ chỗ ngồi và trạng thái các khu vực
- **WHEN** Khán giả truy cập vào trang chi tiết của một concert và chọn xem sơ đồ chỗ ngồi
- **THEN** Hệ thống SHALL tải và hiển thị sơ đồ SVG tương tác đại diện cho cấu hình ghế của concert đó, hiển thị trực quan trạng thái còn vé hay hết vé của từng khu vực.

#### Scenario: Nhận biết ghế đang bị khóa tạm thời
- **WHEN** Khán giả đang xem sơ đồ chỗ ngồi và có các ghế đang bị khóa tạm thời (Reserved) bởi người dùng khác trong vòng 10 phút
- **THEN** Hệ thống SHALL hiển thị các ghế đó với trạng thái trực quan "Đang giữ chỗ" (ví dụ: màu vàng/xám) để phân biệt với vé "Đã bán" và "Còn trống"
- **AND** người dùng không thể chọn các ghế đang bị khóa này.

### Requirement: Chọn khu vực vé trên sơ đồ tương tác
Khán giả SHALL có thể nhấp (click) trực tiếp vào các khu vực vé trên sơ đồ SVG để chọn phân hạng vé mong muốn.

#### Scenario: Chọn khu vực vé còn chỗ
- **WHEN** Khán giả click vào khu vực được đánh dấu là "VIP" trên sơ đồ SVG và khu vực này vẫn còn vé
- **THEN** Hệ thống SHALL phản hồi bằng cách highlight khu vực VIP trên sơ đồ, hiển thị giá vé tương ứng và kích hoạt biểu mẫu chọn số lượng vé để đặt mua.

#### Scenario: Chọn khu vực vé đã hết chỗ
- **WHEN** Khán giả click vào khu vực "SVIP" trên sơ đồ SVG nhưng khu vực này đã hết vé
- **THEN** Giao diện hệ thống SHALL chuyển trạng thái khu vực này thành không khả dụng (disabled), hiển thị nhãn "Hết vé" và không cho phép khán giả chọn khu vực này.
