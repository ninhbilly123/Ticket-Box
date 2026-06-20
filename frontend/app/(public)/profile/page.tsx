'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, History, Mail, RefreshCw, Shield, Ticket, UserCircle } from 'lucide-react';
import { TicketHistoryItem, fetchTicketHistory, initiatePayment } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

function formatCurrency(value: number) {
  return Number(value).toLocaleString('vi-VN') + ' đ';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfilePage() {
  const { session, status, refreshSession } = useAuth();
  const [history, setHistory] = useState<TicketHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    if (!session) return;

    setLoadingHistory(true);
    setError(null);
    try {
      const items = await fetchTicketHistory(session.accessToken);
      setHistory(items);
    } catch (err) {
      setError((err as Error).message || 'Không thể tải lịch sử.');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handlePayNow(orderId: string) {
    setPayingOrderId(orderId);
    setError(null);
    try {
      const payment = await initiatePayment({
        orderId,
        gateway: 'vnpay',
        idempotencyKey: `pay-profile-${orderId}-${Date.now()}`,
      });
      window.open(payment.paymentUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError((err as Error).message || 'Không thể tạo liên kết thanh toán.');
    } finally {
      setPayingOrderId(null);
    }
  }

  useEffect(() => {
    loadHistory();

    // Tự động tải lại lịch sử đơn hàng khi người dùng quay lại tab (sau khi thanh toán ở tab mới)
    const handleFocus = () => {
      loadHistory();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [session?.accessToken]);

  if (status === 'loading') {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-gray-950 text-white flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-gray-950 text-white flex items-center justify-center px-6">
        <section className="max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
          <UserCircle className="mx-auto h-12 w-12 text-indigo-400" />
          <h1 className="mt-4 text-xl font-extrabold">Bạn chưa đăng nhập</h1>
          <p className="mt-2 text-sm text-gray-400">Đăng nhập để xem hồ sơ và lịch sử đơn hàng.</p>
          <Link href="/login?redirect=/profile" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500">
            Đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-950 text-gray-100 px-6 py-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 h-fit">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center">
              <UserCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-indigo-400">Customer Profile</p>
              <h1 className="text-xl font-extrabold text-white">{session.user.fullName}</h1>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-xl bg-gray-950 border border-gray-800 p-3">
              <Mail className="h-4 w-4 text-indigo-400" />
              <span className="text-gray-300">{session.user.email}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-950 border border-gray-800 p-3">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span className="text-gray-300">{session.user.role}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshSession}
            className="mt-5 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-bold text-gray-200 hover:border-indigo-600 hover:text-white flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh session
          </button>
        </section>

        <section className="lg:col-span-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-indigo-400">Orders</p>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-400" />
                Lịch sử đơn hàng
              </h2>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-sm font-bold text-white flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
              Tải lại
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-950/60 p-10 text-center text-gray-500">
              Chưa có đơn hàng nào.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((order) => (
                <article key={order.orderId} className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{order.concertName}</h3>
                      <p className="mt-1 text-xs text-gray-500 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                      <p className="font-extrabold text-indigo-300">{formatCurrency(order.totalAmount)}</p>
                      <p className={`mt-1 text-xs font-bold uppercase ${
                        order.status.toLowerCase() === 'paid' ? 'text-emerald-400' :
                        order.status.toLowerCase() === 'failed' ? 'text-red-400' : 'text-yellow-500'
                      }`}>
                        {order.status}
                      </p>
                      {order.status.toLowerCase() === 'pending' && (
                        <button
                          type="button"
                          disabled={payingOrderId !== null}
                          onClick={() => handlePayNow(order.orderId)}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-xs font-bold text-white transition-all shadow-md shadow-indigo-900/20"
                        >
                          {payingOrderId === order.orderId ? 'Đang tạo link...' : 'Thanh toán ngay'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {order.tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Ticket className="h-3.5 w-3.5 text-indigo-400" />
                            {ticket.ticketType}
                          </span>
                          <span className="font-bold text-emerald-400">{ticket.status}</span>
                        </div>
                        <p className="mt-2 font-mono text-gray-400 break-all">{ticket.qrCode}</p>
                        <p className="mt-1 text-gray-500">Ghế: {ticket.seatNumber || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
