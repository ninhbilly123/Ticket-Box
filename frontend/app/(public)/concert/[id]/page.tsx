'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, MapPin, Music, User, ShoppingCart, ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Concert, fetchConcertById, bookTickets, BookTicketsResponse, initiatePayment, fetchOrderById } from '../../../../lib/api';
import SeatMap from '../../../../components/SeatMap';
import CountdownTimer from '../../../../components/CountdownTimer';

export default function ConcertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [userId, setUserId] = useState('user-test-01'); // Prefilled mock userId
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [gateway, setGateway] = useState<'vnpay' | 'momo'>('vnpay'); // Payment gateway
  
  // Action States
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookTicketsResponse | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  
  // Status check states
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Load concert details
  const loadConcert = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await fetchConcertById(id);
      setConcert(data);
      
      // Auto select the first available ticket type if none selected
      if (!selectedTicketTypeId && data.ticketTypes.length > 0) {
        const firstAvailable = data.ticketTypes.find((tt) => tt.remaining > 0);
        if (firstAvailable) {
          setSelectedTicketTypeId(firstAvailable.id);
        } else {
          setSelectedTicketTypeId(data.ticketTypes[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải chi tiết concert.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadConcert();
    }
  }, [id]);

  const selectedTicketType = concert?.ticketTypes.find((tt) => tt.id === selectedTicketTypeId);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketTypeId || !concert) return;

    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);
    setPaymentUrl(null);

    try {
      // 1. Create the pending order
      const result = await bookTickets({
        userId,
        concertId: concert.id,
        ticketTypeId: selectedTicketTypeId,
        quantity,
      });

      // 2. Initiate payment with Idempotency-Key
      const idempotencyKey = `idem-pay-${result.order.id}`;
      const paymentData = await initiatePayment({
        orderId: result.order.id,
        gateway,
        idempotencyKey,
      });

      setBookingSuccess(result);
      setPaymentUrl(paymentData.paymentUrl);

      // 3. Open the checkout simulator in a new tab
      window.open(paymentData.paymentUrl, '_blank');

      // Reload concert details in the background to update ticket counts
      loadConcert(false);
    } catch (err: any) {
      setBookingError(err.message || 'Đặt vé thất bại.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Poll or check order status manually
  const checkPaymentStatus = async () => {
    if (!bookingSuccess?.order?.id) return;
    setCheckingPayment(true);
    try {
      const updatedOrder = await fetchOrderById(bookingSuccess.order.id);
      setBookingSuccess((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          order: {
            ...prev.order,
            status: updatedOrder.order.status,
          },
        };
      });
      loadConcert(false); // Sync ticket inventory counts
    } catch (err: any) {
      console.error('Failed to verify order status:', err);
    } finally {
      setCheckingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
        <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2.5 rounded-xl font-semibold transition-colors">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20">
      {/* Navbar Banner */}
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-gray-900">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <button
          onClick={() => loadConcert(false)}
          className="text-xs text-indigo-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Cập nhật số vé
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Concert Info & SeatMap SVG (8 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Info Card */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
              {concert.title}
            </h1>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              {concert.description || 'Không có mô tả chi tiết cho concert này.'}
            </p>

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
                  <span className="font-semibold">
                    {new Date(concert.dateTime).toLocaleDateString('vi-VN', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
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

          {/* SVG SeatMap */}
          <SeatMap
            ticketTypes={concert.ticketTypes}
            selectedTicketTypeId={selectedTicketTypeId}
            onSelectTicketType={(id) => {
              setSelectedTicketTypeId(id);
              setBookingSuccess(null);
              setBookingError(null);
              setPaymentUrl(null);
            }}
          />
        </div>

        {/* Right Column: Order Form (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-3 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              Thông tin đặt mua vé
            </h2>

            {/* Booking Form */}
            <form onSubmit={handleBook} className="space-y-5">
              
              {/* User ID Field for Testing Limits */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Mã tài khoản (User ID) để test giới hạn:
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setBookingSuccess(null);
                    setBookingError(null);
                    setPaymentUrl(null);
                  }}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                  placeholder="Nhập User ID..."
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  * Nhập cùng một User ID để thử giới hạn cộng dồn (Per-user Limit) khi mua nhiều đơn.
                </p>
              </div>

              {/* Ticket Type Select */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">
                  Chọn phân hạng vé:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {concert.ticketTypes.map((tt) => (
                    <button
                      key={tt.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicketTypeId(tt.id);
                        setBookingSuccess(null);
                        setBookingError(null);
                        setPaymentUrl(null);
                      }}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl border text-xs text-left transition-all ${
                        tt.remaining === 0
                          ? 'border-gray-950 bg-gray-950 text-gray-600 opacity-50 cursor-not-allowed'
                          : selectedTicketTypeId === tt.id
                          ? 'border-indigo-500 bg-indigo-950/20 text-white font-bold'
                          : 'border-gray-800 bg-gray-950/40 text-gray-300 hover:border-gray-700'
                      }`}
                      disabled={tt.remaining === 0}
                    >
                      <div>
                        <span>{tt.name}</span>
                        <span className="text-[10px] text-gray-500 block">
                          Giới hạn: {tt.maxLimitPerUser} vé/tài khoản
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold block text-indigo-400">
                          {Number(tt.price).toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {tt.remaining > 0 ? `Còn: ${tt.remaining} vé` : 'Hết vé'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Gateway Selection */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">
                  Chọn cổng thanh toán trực tuyến:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGateway('vnpay')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      gateway === 'vnpay'
                        ? 'border-indigo-500 bg-indigo-950/20 text-white font-bold'
                        : 'border-gray-800 bg-gray-950/40 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-extrabold text-blue-400">VNPAY</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Cổng ngân hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateway('momo')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      gateway === 'momo'
                        ? 'border-indigo-500 bg-indigo-950/20 text-white font-bold'
                        : 'border-gray-800 bg-gray-950/40 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-extrabold text-pink-400">MOMO</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Ví điện tử</span>
                  </button>
                </div>
              </div>

              {/* Selected ticket details & Quantity input */}
              {selectedTicketType && !bookingSuccess && (
                <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Đơn giá:</span>
                    <span className="font-bold text-white">
                      {Number(selectedTicketType.price).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Số lượng mua:</span>
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
                        onClick={() => setQuantity(Math.min(selectedTicketType.remaining, quantity + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 text-white hover:bg-gray-700 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-800/80 pt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-semibold">Tổng tạm tính:</span>
                    <span className="text-lg font-bold text-indigo-400">
                      {(Number(selectedTicketType.price) * quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              )}

              {/* Action Error Box */}
              {bookingError && (
                <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-red-200 text-xs flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold">Lỗi đặt hàng / Thanh toán</p>
                    <p className="mt-1 text-red-300/80">{bookingError}</p>
                  </div>
                </div>
              )}

              {/* Booking success and payment options box */}
              {bookingSuccess && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
                  {bookingSuccess.order.status === 'PENDING' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                        Đơn hàng đang chờ thanh toán...
                      </div>
                      
                      {bookingSuccess.expiredAt && (
                        <div className="bg-yellow-950/30 border border-yellow-900/50 p-3 rounded-lg text-center">
                          <p className="text-yellow-500 text-xs mb-1">Thời gian thanh toán còn lại</p>
                          <CountdownTimer 
                            expiredAt={bookingSuccess.expiredAt} 
                            onExpire={() => {
                              // Auto reload or simulate cancellation
                              setBookingSuccess(prev => prev ? {
                                ...prev,
                                order: { ...prev.order, status: 'CANCELLED' }
                              } : null);
                              setPaymentUrl(null);
                            }} 
                          />
                        </div>
                      )}

                      <p className="text-slate-400 text-[11px]">
                        Một yêu cầu giữ chỗ đã được thiết lập. Vui lòng hoàn tất thanh toán trong <strong>10 phút</strong> để tránh bị tự động hủy và giải phóng ghế.
                      </p>
                      
                      {paymentUrl && (
                        <a
                          href={paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-center shadow-md hover:shadow-lg transition-all"
                        >
                          Mở trang thanh toán mô phỏng
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
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            Đang kiểm tra kết quả...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                            Kiểm tra kết quả thanh toán
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {bookingSuccess.order.status === 'PAID' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Thanh toán thành công!
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Giao dịch được đối soát thành công. Vé của bạn đã được chuyển sang trạng thái đã đặt chỗ.
                      </p>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mã đơn hàng:</span>
                          <span className="font-mono font-bold text-white">{bookingSuccess.order.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Số lượng vé:</span>
                          <span className="font-bold text-white">{bookingSuccess.tickets.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mã ghế (SEATS):</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {bookingSuccess.tickets.map((t) => t.seatNumber).join(', ')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Interactive E-Ticket mockup */}
                      <div className="border border-slate-800 bg-white p-4 rounded-xl flex flex-col items-center justify-center shadow-lg">
                        <div className="w-24 h-24 bg-gray-200 border border-gray-300 flex items-center justify-center text-black text-[9px] text-center p-2 rounded">
                          [E-TICKET QR CODE]<br/>
                          ID: {bookingSuccess.order.id.slice(0, 8)}
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold mt-2 tracking-wide uppercase">Mã soát vé điện tử</span>
                      </div>
                    </div>
                  )}

                  {bookingSuccess.order.status === 'CANCELLED' && (
                    <div className="space-y-2 text-red-400">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Đơn hàng đã bị hủy
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Giao dịch thanh toán thất bại hoặc quá hạn 10 phút. Vé giữ chỗ đã được giải phóng cho khán giả khác. Vui lòng thực hiện đặt vé lại.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingSuccess(null);
                          setPaymentUrl(null);
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl transition-all"
                      >
                        Đặt vé mới
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Purchase Button */}
              {!bookingSuccess && (
                <button
                  type="submit"
                  disabled={bookingLoading || !selectedTicketTypeId || (selectedTicketType ? selectedTicketType.remaining === 0 : true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-white font-bold py-3 rounded-xl text-sm shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5"
                >
                  {bookingLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xử lý đặt vé...
                    </>
                  ) : (
                    'Xác nhận đặt mua vé'
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
