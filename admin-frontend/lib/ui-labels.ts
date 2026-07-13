const ROLE_LABELS: Record<string, string> = {
  ORGANIZER: 'Ban tổ chức',
  CHECKIN_STAFF: 'Nhân viên soát vé',
  AUDIENCE: 'Khán giả',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  DISABLED: 'Đã vô hiệu hóa',
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã công khai',
  ON_SALE: 'Đang bán vé',
  SALE_CLOSED: 'Đã đóng bán',
  COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã hủy',
  PENDING: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  UPLOADED: 'Đã tải lên',
  AI_GENERATED: 'AI đã tạo',
  APPROVED: 'Đã duyệt',
  SUCCESS: 'Thành công',
  PARTIAL_SUCCESS: 'Thành công một phần',
  FAILED: 'Thất bại',
  NO_FILE: 'Không có tệp',
  QUEUED: 'Đang xếp hàng',
  SENT: 'Đã gửi',
  SKIPPED: 'Đã bỏ qua',
  VALID: 'Hợp lệ',
  USED: 'Đã sử dụng',
  RESERVED: 'Đang giữ',
  AVAILABLE: 'Còn vé',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
  ALREADY_USED: 'Đã sử dụng',
  INVALID_TICKET: 'Vé không hợp lệ',
  WRONG_CONCERT: 'Sai sự kiện',
  WRONG_DATE: 'Sai ngày',
};

export function formatRoleLabel(role?: string | null): string {
  if (!role) return '-';
  return ROLE_LABELS[role.toUpperCase()] || role;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return '-';
  return STATUS_LABELS[status.toUpperCase()] || status;
}
