'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Mail,
  Phone,
  QrCode,
  RefreshCw,
  Save,
  Shield,
  Ticket,
  UserCircle,
} from 'lucide-react';
import { TicketHistoryItem, fetchTicketHistory, initiatePayment, updateProfile } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { formatCurrency, formatDateTime } from '../../../lib/format';
import QrCodeImage from '../../../components/QrCodeImage';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TB';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (['paid', 'booked', 'valid', 'active'].includes(normalized)) return 'text-emerald-400';
  if (['failed', 'cancelled', 'refunded'].includes(normalized)) return 'text-red-400';
  return 'text-yellow-500';
}

export default function ProfilePage() {
  const { session, status, refreshSession } = useAuth();
  const [history, setHistory] = useState<TicketHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });

  const initials = useMemo(() => getInitials(session?.user.fullName || ''), [session?.user.fullName]);

  useEffect(() => {
    if (!session) return;
    setProfileForm({
      fullName: session.user.fullName || '',
      phone: session.user.phone || '',
    });
  }, [session]);

  const loadHistory = useCallback(async () => {
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
  }, [session]);

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session) return;

    setSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);
    try {
      await updateProfile(session.accessToken, {
        fullName: profileForm.fullName,
        phone: profileForm.phone || null,
      });
      await refreshSession();
      setProfileNotice('Đã cập nhật hồ sơ.');
    } catch (err) {
      setProfileError((err as Error).message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePayNow(orderId: string) {
    if (!session) {
      setError('Bạn cần đăng nhập để thanh toán đơn hàng.');
      return;
    }

    setPayingOrderId(orderId);
    setError(null);
    try {
      const payment = await initiatePayment({
        orderId,
        gateway: 'vnpay',
        accessToken: session.accessToken,
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

    const handleFocus = () => {
      loadHistory();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadHistory, session?.accessToken]);

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
            <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-lg font-extrabold text-white">
              {initials}
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-indigo-400">Customer Profile</p>
              <h1 className="text-xl font-extrabold text-white">{session.user.fullName}</h1>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Họ và tên</span>
              <input
                value={profileForm.fullName}
                onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })}
                required
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Email</span>
              <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300">
                <Mail className="h-4 w-4 text-indigo-400" />
                <span className="min-w-0 break-all">{session.user.email}</span>
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Số điện thoại</span>
              <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5">
                <Phone className="h-4 w-4 shrink-0 text-indigo-400" />
                <input
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                  placeholder="Chưa cập nhật"
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                <div className="flex items-center gap-1.5 font-bold text-gray-500">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" />
                  Vai trò
                </div>
                <p className="mt-1 font-bold text-gray-200">{session.user.role}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                <div className="font-bold text-gray-500">Trạng thái</div>
                <p className="mt-1 font-bold text-gray-200">{session.user.status || 'ACTIVE'}</p>
              </div>
            </div>

            {profileError && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
                {profileError}
              </div>
            )}
            {profileNotice && (
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-3 text-sm text-emerald-200">
                {profileNotice}
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:bg-gray-800 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </button>
          </form>
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
                      <p className={`mt-1 text-xs font-bold uppercase ${statusClass(order.status)}`}>
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

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {order.tickets.map((ticket) => {
                      const isExpanded = expandedTicketId === ticket.id;
                      return (
                        <div key={ticket.id} className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Ticket className="h-3.5 w-3.5 text-indigo-400" />
                                {ticket.ticketType}
                              </span>
                              <p className="mt-1 text-gray-500">Ghế: {ticket.seatNumber || 'N/A'} · {formatCurrency(ticket.price)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold uppercase ${statusClass(ticket.status)}`}>{ticket.status}</span>
                              <button
                                type="button"
                                onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 font-bold text-gray-200 hover:border-indigo-500 hover:text-white"
                              >
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                Chi tiết
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 grid gap-4 rounded-xl border border-gray-800 bg-gray-950 p-4 md:grid-cols-[180px_1fr]">
                              <div className="flex flex-col items-center gap-2">
                                {ticket.qrCode ? (
                                  <div className="rounded-xl bg-white p-2">
                                    <QrCodeImage value={ticket.qrCode} alt="Mã QR của vé" className="h-40 w-40" />
                                  </div>
                                ) : (
                                  <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-gray-700 text-gray-500">
                                    <QrCode className="h-8 w-8" />
                                  </div>
                                )}
                                <span className="text-center text-[11px] leading-4 text-gray-500">Mã QR dự phòng khi email vé bị lỗi.</span>
                              </div>
                              <div className="grid content-start gap-2 text-sm">
                                <InfoRow label="Mã vé" value={ticket.id} mono />
                                <InfoRow label="Loại vé" value={ticket.ticketType} />
                                <InfoRow label="Giá vé" value={formatCurrency(ticket.price)} />
                                <InfoRow label="Trạng thái" value={ticket.status} />
                                <InfoRow label="Mã QR" value={ticket.qrCode || 'N/A'} mono />
                                <InfoRow label="Mã đơn hàng" value={order.orderId} mono />
                                <InfoRow label="Thời gian đặt" value={formatDateTime(order.createdAt)} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 rounded-lg border border-gray-800 bg-gray-900/80 p-2 sm:grid-cols-[110px_1fr]">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <span className={`min-w-0 break-all text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
