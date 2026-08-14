export function formatCurrency(value: number | string) {
  return `${Number(value).toLocaleString('vi-VN')} đ`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isPaidStatus(status?: string | null) {
  return ['paid', 'PAID'].includes(status || '');
}

export function isFailedOrderStatus(status?: string | null) {
  return ['failed', 'FAILED', 'cancelled', 'CANCELLED', 'expired'].includes(status || '');
}
