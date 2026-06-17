'use client'

export function PaymentNote() {
  return (
    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <p className="text-xs text-slate-400 leading-relaxed">
        Bằng cách thanh toán, bạn đồng ý với{' '}
        <a href="#" className="text-primary hover:underline">
          điều khoản sử dụng
        </a>
        {' '}và{' '}
        <a href="#" className="text-primary hover:underline">
          chính sách bảo mật
        </a>
        {' '}của TicketBox. Vé sẽ được gửi đến email của bạn sau khi thanh toán thành công.
      </p>
    </div>
  )
}
