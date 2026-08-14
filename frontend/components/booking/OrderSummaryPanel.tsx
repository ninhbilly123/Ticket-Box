import { AlertTriangle, CheckCircle2, Clock3, CreditCard, ExternalLink, RefreshCw, Ticket } from 'lucide-react';
import { BookTicketsResponse, HoldOrderResponse } from '../../lib/api';
import { formatCurrency, formatDateTime, isFailedOrderStatus, isPaidStatus } from '../../lib/format';

interface OrderSummaryPanelProps {
  holdResult: HoldOrderResponse;
  orderSnapshot: BookTicketsResponse | null;
  paymentUrl: string | null;
  paymentLoading: boolean;
  checkingPayment: boolean;
  onStartPayment: () => void;
  onCheckPaymentStatus: () => void;
  onResetCheckout: () => void;
}

export default function OrderSummaryPanel({
  holdResult,
  orderSnapshot,
  paymentUrl,
  paymentLoading,
  checkingPayment,
  onStartPayment,
  onCheckPaymentStatus,
  onResetCheckout,
}: OrderSummaryPanelProps) {
  const status = orderSnapshot?.order.status || holdResult.orderStatus;
  const paid = isPaidStatus(orderSnapshot?.order.status);
  const failed = isFailedOrderStatus(orderSnapshot?.order.status);
  const paidTickets = orderSnapshot?.tickets || [];

  return (
    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
      <div className={`flex items-center gap-2 font-bold text-sm ${paid ? 'text-emerald-400' : failed ? 'text-red-400' : 'text-yellow-400'}`}>
        {paid ? <CheckCircle2 className="w-5 h-5" /> : failed ? <AlertTriangle className="w-5 h-5" /> : <Clock3 className="w-5 h-5" />}
        {paid ? 'Đơn hàng thanh toán thành công' : failed ? 'Đơn hàng thanh toán thất bại' : 'Order đang chờ thanh toán'}
      </div>

      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Order ID</span>
          <span className="font-mono font-bold text-white text-right">{holdResult.orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Trạng thái</span>
          <span className={`font-bold uppercase ${paid ? 'text-emerald-400' : failed ? 'text-red-400' : 'text-yellow-300'}`}>
            {status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Hết hạn giữ vé</span>
          <span className="font-bold text-white">{formatDateTime(holdResult.expiresAt)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-800 pt-2">
          <span className="text-slate-400 font-semibold">Tổng tiền</span>
          <span className="font-extrabold text-lg text-indigo-400">{formatCurrency(holdResult.totalAmount)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {holdResult.items.map((item) => (
          <div key={item.ticketTypeId} className="flex justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{item.ticketTypeName}</span>
            <span className="font-bold text-white">
              {item.quantity} x {formatCurrency(item.unitPrice)}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStartPayment}
        disabled={paymentLoading || paid}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all"
      >
        {paymentLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Đang tạo thanh toán...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Thanh toán VNPAY
          </>
        )}
      </button>

      {paymentUrl && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-center shadow-md hover:shadow-lg transition-all"
        >
          Mở lại trang thanh toán
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      <button
        type="button"
        onClick={onCheckPaymentStatus}
        disabled={checkingPayment}
        className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all"
      >
        {checkingPayment ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            Đang kiểm tra...
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            Kiểm tra kết quả thanh toán
          </>
        )}
      </button>

      {paid && (
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Đã cấp e-ticket
          </div>
          {paidTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white text-slate-950 p-4 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold">Ticket code</p>
                  <p className="font-mono text-xs font-bold">{ticket.id}</p>
                </div>
                <Ticket className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="mt-3 bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
                <p className="font-mono text-[11px] break-all">{ticket.qrCode || ticket.id}</p>
              </div>
              <div className="mt-3 flex justify-between text-xs">
                <span className="text-slate-500">Trạng thái</span>
                <span className="font-bold text-emerald-600">{ticket.status}</span>
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-slate-500">Ghế</span>
                <span className="font-bold">{ticket.seatNumber || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {failed && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-200">
          Đơn hàng đã thất bại hoặc hết hạn. Vé giữ tạm đã được hoàn về tồn kho.
        </div>
      )}

      <button
        type="button"
        onClick={onResetCheckout}
        className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl transition-all"
      >
        Đặt vé mới
      </button>
    </div>
  );
}
