'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Ticket } from 'lucide-react';
import QrCodeImage from '../../../../components/QrCodeImage';
import { BookTicketsResponse, fetchOrderById } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { formatCurrency, formatDateTime, isFailedOrderStatus, isPaidStatus } from '../../../../lib/format';

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<PaymentResultFallback />}>
      <PaymentResultContent />
    </Suspense>
  );
}

function PaymentResultFallback() {
  return (
    <main className="min-h-screen bg-gray-950 px-6 py-12 text-gray-100">
      <section className="mx-auto max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <p className="text-sm text-gray-400">Đang tải kết quả thanh toán...</p>
      </section>
    </main>
  );
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const { session, status: authStatus } = useAuth();
  const orderId = searchParams.get('orderId') || '';
  const gatewayStatus = searchParams.get('status') || '';

  const [order, setOrder] = useState<BookTicketsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedStatus = order?.order.status || gatewayStatus;
  const paid = isPaidStatus(resolvedStatus);
  const failed = isFailedOrderStatus(resolvedStatus) || gatewayStatus === 'failed';

  const title = useMemo(() => {
    if (paid) return 'Thanh toán thành công';
    if (failed) return 'Thanh toán chưa hoàn tất';
    return 'Đang kiểm tra thanh toán';
  }, [failed, paid]);

  const loadOrder = useCallback(async () => {
    if (!session || !orderId) return;

    setLoading(true);
    setError(null);
    try {
      const nextOrder = await fetchOrderById(orderId, session.accessToken);
      setOrder(nextOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải trạng thái đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [orderId, session]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-12 text-gray-100">
      <section className="mx-auto max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            paid ? 'bg-emerald-500/15 text-emerald-400' : failed ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
          }`}>
            {paid ? <CheckCircle2 className="h-7 w-7" /> : failed ? <AlertTriangle className="h-7 w-7" /> : <Clock3 className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Payment result</p>
            <h1 className="mt-2 text-2xl font-extrabold text-white">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {orderId
                ? 'Hệ thống đã nhận kết quả từ cổng thanh toán. Bạn có thể tải lại trạng thái nếu ngân hàng xử lý chậm.'
                : 'Thiếu mã đơn hàng trong URL kết quả thanh toán.'}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Mã đơn hàng</span>
            <span className="break-all text-right font-mono font-bold text-white">{orderId || '-'}</span>
          </div>
          <div className="mt-3 flex justify-between gap-4">
            <span className="text-gray-500">Trạng thái</span>
            <span className={`font-bold uppercase ${paid ? 'text-emerald-400' : failed ? 'text-red-400' : 'text-yellow-400'}`}>
              {resolvedStatus || 'UNKNOWN'}
            </span>
          </div>
          {order && (
            <>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-gray-500">Tổng tiền</span>
                <span className="font-bold text-indigo-300">{formatCurrency(order.order.totalAmount)}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-gray-500">Ngày tạo</span>
                <span className="text-right font-semibold text-white">{formatDateTime(order.order.createdAt)}</span>
              </div>
            </>
          )}
        </div>

        {authStatus === 'loading' && <p className="mt-4 text-sm text-gray-500">Đang kiểm tra phiên đăng nhập...</p>}
        {!session && authStatus !== 'loading' && (
          <div className="mt-4 rounded-xl border border-yellow-900/50 bg-yellow-950/20 p-4 text-sm text-yellow-100">
            Đăng nhập để xem chi tiết đơn hàng và mã QR vé.
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {paid && order?.tickets.length ? (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-bold text-white">Vé đã cấp</h2>
            {order.tickets.map((ticket) => (
              <div key={ticket.id} className="grid gap-4 rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm sm:grid-cols-[150px_1fr]">
                <div className="flex justify-center">
                  {ticket.qrCode ? (
                    <div className="rounded-xl bg-white p-2">
                      <QrCodeImage value={ticket.qrCode} alt="Mã QR của vé" className="h-32 w-32" />
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-gray-700 text-gray-500">
                      <Ticket className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Ticket code</p>
                      <p className="mt-1 break-all font-mono font-bold text-white">{ticket.qrCode || ticket.id}</p>
                    </div>
                    <Ticket className="h-6 w-6 shrink-0 text-indigo-400" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-gray-800 bg-gray-900 p-2">
                      <p className="text-gray-500">Trạng thái</p>
                      <p className="mt-1 font-bold text-emerald-400">{ticket.status}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-900 p-2">
                      <p className="text-gray-500">Ghế</p>
                      <p className="mt-1 font-bold text-white">{ticket.seatNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadOrder()}
            disabled={!session || !orderId || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Tải lại trạng thái
          </button>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-xl border border-gray-700 px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-800"
          >
            Xem lịch sử đơn hàng
          </Link>
        </div>
      </section>
    </main>
  );
}
