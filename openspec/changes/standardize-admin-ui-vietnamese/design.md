## Context

Admin frontend phục vụ hai vai trò `ORGANIZER` và `CHECKIN_STAFF`. Nhiều màn hình đã dùng tiếng Việt nhưng các phần được phát triển ở thời điểm khác nhau còn giữ label tiếng Anh. Giá trị role/status từ API là enum kỹ thuật và đang được render trực tiếp, nên chỉ thay chuỗi tĩnh sẽ chưa giải quyết triệt để.

## Goals / Non-Goals

**Goals:**

- Nội dung do frontend kiểm soát được hiển thị thống nhất bằng tiếng Việt.
- Role và status có một bảng ánh xạ dùng chung, không rải logic dịch ở từng component.
- Thuật ngữ giữa các màn hình nhất quán và dễ hiểu với người vận hành.
- Không làm thay đổi payload API hoặc điều kiện nghiệp vụ.

**Non-Goals:**

- Không xây dựng hệ thống i18n đa ngôn ngữ hoặc language switcher.
- Không dịch tên thương hiệu, mã định danh và chữ viết tắt kỹ thuật phổ biến.
- Không dịch nội dung nghiệp vụ do người dùng nhập.
- Không sửa thông điệp lỗi nguyên bản do backend/external service trả về trong change này.

## Decisions

### 1. Tiếng Việt là ngôn ngữ duy nhất của admin frontend

Change sử dụng chuỗi tiếng Việt trực tiếp thay vì thêm thư viện i18n vì sản phẩm hiện chỉ yêu cầu một ngôn ngữ. Cách này giữ phạm vi nhỏ và không tạo abstraction chưa cần thiết.

### 2. Role và status được ánh xạ tập trung

Thêm `admin-frontend/lib/ui-labels.ts` với `formatRoleLabel` và `formatStatusLabel`. Component vẫn so sánh enum gốc để quyết định quyền/màu sắc, nhưng chỉ render nhãn đã định dạng. Giá trị chưa biết được giữ nguyên để không che mất dữ liệu mới từ backend.

### 3. Giữ thuật ngữ kỹ thuật cần nhận diện

Các từ TicketBox, API, AI, VIP, PDF, CSV, SVG, QR, UUID, eventCode, zoneCode và email không bị dịch gượng ép. Các động từ và ngữ cảnh xung quanh chúng phải là tiếng Việt, ví dụ `Tải lên PDF`, `Nhập CSV`, `Mã eventCode`.

### 4. Không thay đổi lỗi backend

Thông báo do UI tự tạo và fallback lỗi được viết bằng tiếng Việt. Message backend tiếp tục hiển thị nguyên bản để không làm sai ý nghĩa nghiệp vụ; chuẩn hóa backend error catalog là change riêng.

## Risks / Trade-offs

- **Một status mới chưa có trong bảng ánh xạ sẽ hiện enum gốc** → Fallback có chủ đích giúp phát hiện contract mới; bổ sung mapping khi backend thêm trạng thái.
- **Một số thuật ngữ kỹ thuật vẫn chứa tiếng Anh** → Giữ có chọn lọc vì đây là mã/chuẩn mà người vận hành cần đối chiếu.
- **Không có i18n framework** → Phù hợp yêu cầu một ngôn ngữ; có thể migration sang message catalog khi sản phẩm cần đa ngôn ngữ.

## Migration Plan

1. Thêm helper role/status.
2. Thay nội dung tĩnh theo từng màn hình và dùng helper tại mọi vị trí render enum.
3. Build admin frontend và quét lại chuỗi tiếng Anh hiển thị.
4. Rollback bằng cách hoàn nguyên các file frontend; không có migration dữ liệu.

## Open Questions

Không có.
