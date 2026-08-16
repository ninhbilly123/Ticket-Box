'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock3,
  MapPin,
  Music,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import OrderHistoryPanel from '../../../../../components/booking/OrderHistoryPanel';
import OrderSummaryPanel from '../../../../../components/booking/OrderSummaryPanel';
import { CustomerErrorState, CustomerLoadingState } from '../../../../../components/CustomerState';
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
import { formatCurrency, formatDateTime } from '../../../../../lib/format';

function getErrorCode(error: unknown) {
  return (error as Error & { errorCode?: string })?.errorCode;
}

export default function ConcertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const concertId = params.id as string;
  const { session } = useAuth();

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
  const holdIdempotencyKeyRef = useRef<string | null>(null);

  const selectedTicketType = useMemo(
    () => concert?.ticketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId) || null,
    [concert, selectedTicketTypeId]
  );

  const maxSelectableQuantity = selectedTicketType
    ? Math.max(1, Math.min(selectedTicketType.remaining, selectedTicketType.maxLimitPerUser))
    : 1;

  function resetHoldIdempotencyKey() {
    holdIdempotencyKeyRef.current = null;
  }

  function getHoldIdempotencyKey() {
    if (!holdIdempotencyKeyRef.current) {
      holdIdempotencyKeyRef.current = `hold-${concertId}-${selectedTicketTypeId || 'none'}-${quantity}-${crypto.randomUUID()}`;
    }
    return holdIdempotencyKeyRef.current;
  }

  const loadConcert = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);

    try {
      const data = await fetchConcertById(concertId);
      setConcert(data);

      if (data.ticketTypes.length > 0) {
        const firstAvailable = data.ticketTypes.find((ticketType) => ticketType.remaining > 0);
        setSelectedTicketTypeId((current) => current || (firstAvailable || data.ticketTypes[0]).id);
      }
    } catch (err) {
      setError((err as Error).message || 'Không thể tải chi tiết concert.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [concertId]);

  const getSessionForCheckout = useCallback(async () => {
    if (session) return session;
    router.push(`/login?redirect=${encodeURIComponent(`/concert/${concertId}/booking`)}`);
    throw new Error('Vui lòng đăng nhập để giữ vé.');
  }, [concertId, router, session]);

  const loadHistory = useCallback(async (activeSession = session) => {
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
  }, [session]);

  const prepareWaitingRoom = useCallback(async (activeSession: AuthSession) => {
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
  }, [concertId, waitingStatus]);

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
        idempotencyKey: getHoldIdempotencyKey(),
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
      const activeSession = await getSessionForCheckout();
      const payment = await initiatePayment({
        orderId: holdResult.orderId,
        gateway: 'vnpay',
        accessToken: activeSession.accessToken,
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

  const checkPaymentStatus = useCallback(async () => {
    if (!holdResult) return;

    setCheckingPayment(true);
    setHoldError(null);

    try {
      const activeSession = await getSessionForCheckout();
      const updatedOrder = await fetchOrderById(holdResult.orderId, activeSession.accessToken);
      setOrderSnapshot(updatedOrder);
      await loadConcert(false);
      await loadHistory();
    } catch (err) {
      setHoldError((err as Error).message || 'Không thể kiểm tra trạng thái đơn hàng.');
    } finally {
      setCheckingPayment(false);
    }
  }, [getSessionForCheckout, holdResult, loadConcert, loadHistory]);

  useEffect(() => {
    if (concertId) {
      loadConcert();
    }
  }, [concertId, loadConcert]);

  useEffect(() => {
    if (session) {
      loadHistory(session);
    }
  }, [loadHistory, session]);

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
          setHoldError((err as Error).message || 'Kh?ng th? ki?m tra h?ng ch?.');
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
  }, [checkPaymentStatus, holdResult, orderSnapshot?.order.status]);

  function resetCheckout() {
    resetHoldIdempotencyKey();
    setHoldResult(null);
    setOrderSnapshot(null);
    setPaymentUrl(null);
    setHoldError(null);
    setWaitingStatus(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-6 py-12">
        <CustomerLoadingState text="Đang tải chi tiết sự kiện..." />
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="min-h-screen bg-gray-950 px-6 py-12 text-white">
        <CustomerErrorState
          message={error || 'Không tìm thấy dữ liệu sự kiện.'}
          backHref="/"
          backLabel="Quay lại trang chủ"
        />
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
            seatMapEnabled={Boolean(concert.seatMapEnabled)}
            seatMapSvg={concert.seatMapSvg || null}
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
                        onClick={() => {
                          setQuantity(Math.max(1, quantity - 1));
                          resetCheckout();
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 text-white hover:bg-gray-700 font-bold"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuantity(Math.min(maxSelectableQuantity, quantity + 1));
                          resetCheckout();
                        }}
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
            <OrderSummaryPanel
              holdResult={holdResult}
              orderSnapshot={orderSnapshot}
              paymentUrl={paymentUrl}
              paymentLoading={paymentLoading}
              checkingPayment={checkingPayment}
              onStartPayment={handleStartPayment}
              onCheckPaymentStatus={checkPaymentStatus}
              onResetCheckout={resetCheckout}
            />
          )}

          <OrderHistoryPanel
            sessionAvailable={Boolean(session)}
            history={history}
            loading={historyLoading}
            onReload={() => loadHistory()}
          />
        </div>
      </div>
    </div>
  );
}
