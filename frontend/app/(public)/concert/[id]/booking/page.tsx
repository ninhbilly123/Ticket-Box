'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  History,
  MapPin,
  Music,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Ticket,
} from 'lucide-react';
import SeatMap from '../../../../../components/SeatMap';
import {
  AuthSession,
  BookTicketsResponse,
  Concert,
  HoldOrderResponse,
  TicketHistoryItem,
  WaitingRoomStatus,
  fetchConcertById,
  fetchOrderById,
  fetchTicketHistory,
  fetchWaitingRoomStatus,
  holdOrder,
  initiatePayment,
  joinWaitingRoom,
} from '../../../../../lib/api';
import { useAuth } from '../../../../../lib/auth-context';

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

function getErrorCode(error: unknown) {
  return (error as Error & { errorCode?: string })?.errorCode;
}

export default function ConcertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const concertId = params.id as string;
  const { session, status: authStatus } = useAuth();

  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [waitingStatus, setWaitingStatus] = useState<WaitingRoomStatus | null>(null);
  const [waitingLoading, setWaitingLoading] = useState(false);

  const [holdLoading, setHoldLoading] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [holdResult, setHoldResult] = useState<HoldOrderResponse | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderSnapshot, setOrderSnapshot] = useState<BookTicketsResponse | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<TicketHistoryItem[]>([]);

  const selectedTicketType = useMemo(
    () => concert?.ticketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId) || null,
    [concert, selectedTicketTypeId]
  );

  const maxSelectableQuantity = selectedTicketType
    ? Math.max(1, Math.min(selectedTicketType.remaining, selectedTicketType.maxLimitPerUser))
    : 1;

  const paidTickets = orderSnapshot?.tickets || [];
  const orderStatus = orderSnapshot?.order.status || holdResult?.orderStatus;

  async function loadConcert(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError(null);

    try {
      const data = await fetchConcertById(concertId);
      setConcert(data);

      if (!selectedTicketTypeId && data.ticketTypes.length > 0) {
        const firstAvailable = data.ticketTypes.find((ticketType) => ticketType.remaining > 0);
        setSelectedTicketTypeId((firstAvailable || data.ticketTypes[0]).id);
      }
    } catch (err) {
      setError((err as Error).message || 'Không thể tải chi tiết concert.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    if (concertId) {
      loadConcert();
    }
  }, [concertId]);

  useEffect(() => {
    if (session) {
      loadHistory(session);
    }
  }, [session]);

  useEffect(() => {
    if (!session || waitingStatus?.status !== 'WAITING') return;

    const timer = window.setInterval(async () => {
      try {
        const status = await fetchWaitingRoomStatus({
          concertId,
          accessToken: session.accessToken,
        });
        setWaitingStatus(status);
        if (status.status === 'READY') {
          setHoldError(null);
        }
      } catch (err) {
        if (getErrorCode(err) !== 'WAITING_ROOM_NOT_FOUND') {
          console.error('Failed to poll waiting room:', err);
        }
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [concertId, session, waitingStatus?.status]);

  // Tự động kiểm tra trạng thái thanh toán khi người dùng quay lại tab (sau khi thanh toán ở tab VNPAY mới)
  useEffect(() => {
    if (!holdResult || orderSnapshot?.order.status === 'paid' || orderSnapshot?.order.status === 'failed') return;

    const handleFocus = () => {
      checkPaymentStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [holdResult?.orderId, orderSnapshot?.order.status]);

  async function getSessionForCheckout() {
    if (session) return session;
    router.push(`/login?redirect=${encodeURIComponent(`/concert/${concertId}/booking`)}`);
    throw new Error('Vui lòng đăng nhập để giữ vé.');
  }

  async function loadHistory(activeSession = session) {
    if (!activeSession) return;
    setHistoryLoading(true);

    try {
      const data = await fetchTicketHistory(activeSession.accessToken);
      setHistory(data);
    } catch (err) {
      setHoldError((err as Error).message || 'Không thể tải lịch sử đơn hàng.');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function prepareWaitingRoom(activeSession: AuthSession) {
    if (waitingStatus?.status === 'READY') {
      return waitingStatus.checkoutToken;
    }

    setWaitingLoading(true);

    try {
      const status = await joinWaitingRoom({
        concertId,
        accessToken: activeSession.accessToken,
      });
      setWaitingStatus(status);

      if (status.status === 'READY') {
        return status.checkoutToken;
      }

      setHoldError(`Bạn đang ở hàng chờ vị trí ${status.position}. Hệ thống sẽ tự kiểm tra lượt.`);
      return null;
    } catch (err) {
      if (getErrorCode(err) === 'WAITING_ROOM_NOT_FOUND') {
        setWaitingStatus(null);
        return undefined;
      }
      throw err;
    } finally {
      setWaitingLoading(false);
    }
  }

  async function refreshWaitingRoom() {
    if (!session) return;
    setWaitingLoading(true);

    try {
      const status = await fetchWaitingRoomStatus({
        concertId,
        accessToken: session.accessToken,
      });
      setWaitingStatus(status);
      if (status.status === 'READY') {
        setHoldError(null);
      }
    } catch (err) {
      setHoldError((err as Error).message || 'Không thể kiểm tra hàng chờ.');
    } finally {
      setWaitingLoading(false);
    }
  }

  async function handleHoldOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!concert || !selectedTicketType) return;

    setHoldLoading(true);
    setHoldError(null);
    setHoldResult(null);
    setOrderSnapshot(null);
    setPaymentUrl(null);

    try {
      const activeSession = await getSessionForCheckout();
      const checkoutToken = await prepareWaitingRoom(activeSession);
      if (checkoutToken === null) return;

      const result = await holdOrder({
        concertId: concert.id,
        ticketTypeId: selectedTicketType.id,
        quantity,
        accessToken: activeSession.accessToken,
        checkoutToken,
        idempotencyKey: `hold-${concert.id}-${selectedTicketType.id}-${Date.now()}`,
      });

      setHoldResult(result);
      await loadConcert(false);
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'NOT_YOUR_TURN' || code === 'CHECKOUT_TOKEN_EXPIRED') {
        try {
          const activeSession = await getSessionForCheckout();
          const status = await joinWaitingRoom({
            concertId,
            accessToken: activeSession.accessToken,
          });
          setWaitingStatus(status);
          setHoldError(status.status === 'WAITING' ? `Bạn đang ở hàng chờ vị trí ${status.position}.` : null);
        } catch (joinErr) {
          setHoldError((joinErr as Error).message || 'Chưa tới lượt mua vé.');
        }
      } else {
        setHoldError((err as Error).message || 'Giữ vé thất bại.');
      }
    } finally {
      setHoldLoading(false);
    }
  }

  async function handleStartPayment() {
    if (!holdResult) return;

    setPaymentLoading(true);
    setHoldError(null);

    try {
      const payment = await initiatePayment({
        orderId: holdResult.orderId,
        gateway: 'vnpay',
        idempotencyKey: `pay-${holdResult.orderId}`,
      });
      setPaymentUrl(payment.paymentUrl);
      window.open(payment.paymentUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setHoldError((err as Error).message || 'Không thể tạo yêu cầu thanh toán.');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function checkPaymentStatus() {
    if (!holdResult) return;

    setCheckingPayment(true);
    setHoldError(null);

    try {
      const updatedOrder = await fetchOrderById(holdResult.orderId);
      setOrderSnapshot(updatedOrder);
      await loadConcert(false);
      await loadHistory();
    } catch (err) {
      setHoldError((err as Error).message || 'Không thể kiểm tra trạng thái đơn hàng.');
    } finally {
      setCheckingPayment(false);
    }
  }

  function resetCheckout() {
    setHoldResult(null);
    setOrderSnapshot(null);
    setPaymentUrl(null);
    setHoldError(null);
    setWaitingStatus(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Đang tải chi tiết sự kiện...</p>
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
        <p className="text-gray-400 text-sm max-w-sm mb-6">{error || 'Không tìm thấy dữ liệu sự kiện.'}</p>
        <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2.5 rounded-xl font-semibold">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20">
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-gray-900">
        <Link href={`/concert/${concert.id}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại thông tin concert
        </Link>
        <button
          type="button"
          onClick={() => loadConcert(false)}
          className="text-xs text-indigo-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Cập nhật số vé
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-4">{concert.title}</h1>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">{concert.description || 'Concert chưa có mô tả.'}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-300 border-t border-gray-800 pt-6">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-gray-500 text-[10px] uppercase">Nghệ sĩ</div>
                  <span className="font-semibold">{concert.artist}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-gray-500 text-[10px] uppercase">Thời gian</div>
                  <span className="font-semibold">{formatDateTime(concert.dateTime)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-gray-500 text-[10px] uppercase">Địa điểm</div>
                  <span className="font-semibold line-clamp-1">{concert.location}</span>
                </div>
              </div>
            </div>
          </div>

          <SeatMap
            ticketTypes={concert.ticketTypes}
            selectedTicketTypeId={selectedTicketTypeId}
            onSelectTicketType={(ticketTypeId) => {
              setSelectedTicketTypeId(ticketTypeId);
              setQuantity(1);
              resetCheckout();
            }}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-3 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              Đặt vé
            </h2>

            <form onSubmit={handleHoldOrder} className="space-y-5">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">Chọn phân hạng vé</label>
                <div className="grid grid-cols-1 gap-2">
                  {concert.ticketTypes.map((ticketType) => (
                    <button
                      key={ticketType.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicketTypeId(ticketType.id);
                        setQuantity(1);
                        resetCheckout();
                      }}
                      disabled={ticketType.remaining === 0}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl border text-xs text-left transition-all ${
                        ticketType.remaining === 0
                          ? 'border-gray-950 bg-gray-950 text-gray-600 opacity-50 cursor-not-allowed'
                          : selectedTicketTypeId === ticketType.id
                          ? 'border-indigo-500 bg-indigo-950/20 text-white font-bold'
                          : 'border-gray-800 bg-gray-950/40 text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <span>{ticketType.name}</span>
                        <span className="text-[10px] text-gray-500 block">
                          Tối đa {ticketType.maxLimitPerUser} vé/tài khoản
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold block text-indigo-400">{formatCurrency(ticketType.price)}</span>
                        <span className="text-[10px] text-gray-500">
                          {ticketType.remaining > 0 ? `Còn ${ticketType.remaining} vé` : 'Hết vé'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedTicketType && !holdResult && (
                <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Đơn giá</span>
                    <span className="font-bold text-white">{formatCurrency(selectedTicketType.price)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Số lượng</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 text-white hover:bg-gray-700 font-bold"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxSelectableQuantity, quantity + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 text-white hover:bg-gray-700 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-800/80 pt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-semibold">Tổng tạm tính</span>
                    <span className="text-lg font-bold text-indigo-400">
                      {formatCurrency(selectedTicketType.price * quantity)}
                    </span>
                  </div>
                </div>
              )}

              {waitingStatus && (
                <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-4 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-indigo-200 font-bold">
                      <Clock3 className="w-4 h-4 text-indigo-400" />
                      {waitingStatus.status === 'WAITING'
                        ? `Hàng chờ vị trí ${waitingStatus.position}`
                        : `Đã tới lượt, token còn ${waitingStatus.expiresInSeconds}s`}
                    </div>
                    <button
                      type="button"
                      onClick={refreshWaitingRoom}
                      disabled={waitingLoading || !session}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold"
                    >
                      Kiểm tra
                    </button>
                  </div>
                </div>
              )}

              {holdError && (
                <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-red-200 text-xs flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold">Không thể tiếp tục</p>
                    <p className="mt-1 text-red-300/80">{holdError}</p>
                  </div>
                </div>
              )}

              {!holdResult && (
                <button
                  type="submit"
                  disabled={holdLoading || waitingLoading || !selectedTicketTypeId || !selectedTicketType || selectedTicketType.remaining === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-white font-bold py-3 rounded-xl text-sm shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5"
                >
                  {holdLoading || waitingLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang giữ vé...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Giữ vé và tạo order
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {holdResult && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <div className={`flex items-center gap-2 font-bold text-sm ${
                ['paid', 'PAID'].includes(orderSnapshot?.order.status || '')
                  ? 'text-emerald-400'
                  : ['failed', 'FAILED', 'cancelled', 'CANCELLED'].includes(orderSnapshot?.order.status || '')
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`}>
                {['paid', 'PAID'].includes(orderSnapshot?.order.status || '') ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : ['failed', 'FAILED', 'cancelled', 'CANCELLED'].includes(orderSnapshot?.order.status || '') ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Clock3 className="w-5 h-5" />
                )}
                {['paid', 'PAID'].includes(orderSnapshot?.order.status || '')
                  ? 'Đơn hàng thanh toán thành công'
                  : ['failed', 'FAILED', 'cancelled', 'CANCELLED'].includes(orderSnapshot?.order.status || '')
                  ? 'Đơn hàng thanh toán thất bại'
                  : 'Order đang chờ thanh toán'}
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono font-bold text-white text-right">{holdResult.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái</span>
                  <span className={`font-bold uppercase ${
                    ['paid', 'PAID'].includes(orderSnapshot?.order.status || '')
                      ? 'text-emerald-400'
                      : ['failed', 'FAILED', 'cancelled', 'CANCELLED'].includes(orderSnapshot?.order.status || '')
                      ? 'text-red-400'
                      : 'text-yellow-300'
                  }`}>
                    {orderStatus}
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
                onClick={handleStartPayment}
                disabled={paymentLoading || ['paid', 'PAID'].includes(orderSnapshot?.order.status || '')}
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
                onClick={checkPaymentStatus}
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

              {['paid', 'PAID'].includes(orderSnapshot?.order.status || '') && (
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

              {['failed', 'CANCELLED', 'expired'].includes(orderSnapshot?.order.status || '') && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-200">
                  Đơn hàng đã thất bại hoặc hết hạn. Vé giữ tạm đã được hoàn về tồn kho.
                </div>
              )}

              <button
                type="button"
                onClick={resetCheckout}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl transition-all"
              >
                Đặt vé mới
              </button>
            </div>
          )}

          <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Lịch sử đơn hàng
              </h3>
              <button
                type="button"
                onClick={() => loadHistory()}
                disabled={!session || historyLoading}
                className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-white"
              >
                Tải
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {!session ? (
                <p className="text-xs text-gray-500">Đăng nhập để xem lịch sử.</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-gray-500">Chưa có dữ liệu lịch sử.</p>
              ) : (
                history.map((item) => (
                  <div key={item.orderId} className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{item.concertName}</p>
                        <p className="text-gray-500 mt-0.5">{formatDateTime(item.createdAt)}</p>
                      </div>
                      <span className="font-bold text-indigo-300">{item.status}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-gray-400">
                      <span>{item.tickets.length} vé</span>
                      <span className="font-bold text-white">{formatCurrency(item.totalAmount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
