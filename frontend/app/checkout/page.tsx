'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { StepIndicator } from '@/components/checkout/step-indicator'
import { BuyerInfoForm, type BuyerInfo } from '@/components/checkout/buyer-info-form'
import { PaymentMethodSelector } from '@/components/checkout/payment-method-selector'
import { CountdownTimer } from '@/components/checkout/countdown-timer'
import { OrderSummary } from '@/components/checkout/order-summary'
import { PaymentNote } from '@/components/checkout/payment-note'
import { fetchConcertById, bookTickets, initiatePayment, fetchOrderById, Concert, BookTicketsResponse } from '@/lib/api'

export default function CheckoutPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

  // API State
  const [concert, setConcert] = useState<Concert | null>(null)
  const [checkoutData, setCheckoutData] = useState<{ concertId: string; ticketTypeId: string; quantity: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Booking State
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState<BookTicketsResponse | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)

  useEffect(() => {
    const dataStr = localStorage.getItem('checkoutData')
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr)
        setCheckoutData(data)
        loadConcert(data.concertId)
      } catch (err) {
        console.error('Failed to parse checkoutData:', err)
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [router])

  const loadConcert = async (id: string) => {
    try {
      const data = await fetchConcertById(id)
      setConcert(data)
    } catch (err: any) {
      setError(err.message || 'Không thể tải chi tiết concert.')
    } finally {
      setLoading(false)
    }
  }

  const selectedTicketType = concert?.ticketTypes.find(t => t.id === checkoutData?.ticketTypeId)

  const handleBuyerInfoSubmit = async (info: BuyerInfo) => {
    if (!checkoutData || !concert) return
    
    setBuyerInfo(info)
    setBookingLoading(true)
    setBookingError(null)

    try {
      // 1. Create the pending order to reserve seats
      const result = await bookTickets({
        userId: info.email, // Using email as user ID for simplicity
        concertId: checkoutData.concertId,
        ticketTypeId: checkoutData.ticketTypeId,
        quantity: checkoutData.quantity,
      })
      setBookingSuccess(result)
      setCurrentStep(2)
    } catch (err: any) {
      setBookingError(err.message || 'Đặt vé thất bại. Hết vé hoặc lỗi hệ thống.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method)
  }

  const handlePaymentSubmit = async () => {
    if (!paymentMethod || !bookingSuccess) return

    setBookingLoading(true)
    setBookingError(null)

    try {
      // 2. Initiate payment with Idempotency-Key
      const idempotencyKey = `idem-pay-${bookingSuccess.order.id}`
      const paymentData = await initiatePayment({
        orderId: bookingSuccess.order.id,
        gateway: paymentMethod,
        idempotencyKey,
      })

      setPaymentUrl(paymentData.paymentUrl)
      
      // Open payment in new tab
      window.open(paymentData.paymentUrl, '_blank')
    } catch (err: any) {
      setBookingError(err.message || 'Khởi tạo thanh toán thất bại.')
    } finally {
      setBookingLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!bookingSuccess?.order?.id) return
    setCheckingPayment(true)
    try {
      const updatedOrder = await fetchOrderById(bookingSuccess.order.id)
      setBookingSuccess((prev) => {
        if (!prev) return null
        return {
          ...prev,
          order: {
            ...prev.order,
            status: updatedOrder.order.status,
          },
        }
      })
      if (updatedOrder.order.status === 'PAID') {
        setCurrentStep(3)
      } else if (updatedOrder.order.status === 'CANCELLED') {
         setBookingError('Đơn hàng đã bị hủy do hết thời gian hoặc thanh toán thất bại.')
      }
    } catch (err: any) {
      console.error('Failed to verify order status:', err)
    } finally {
      setCheckingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !concert || !checkoutData || !selectedTicketType) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
        <p className="text-gray-400 text-sm max-w-sm mb-6">{error || 'Dữ liệu không hợp lệ.'}</p>
        <Link href="/" className="bg-primary hover:bg-primary/90 text-white text-sm px-5 py-2.5 rounded-lg font-semibold transition-colors">
          Quay lại trang chủ
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
          <Link
            href={`/concert/${concert.id}`}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-slate-50">Thanh toán vé</h1>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Form Steps */}
          <div className="lg:col-span-2">
            
            {/* Error Box */}
            {bookingError && currentStep < 3 && (
              <div className="mb-6 bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-red-200 text-sm flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="font-bold">Có lỗi xảy ra</p>
                  <p className="mt-1 text-red-300/80">{bookingError}</p>
                </div>
              </div>
            )}

            {/* Step 1: Buyer Information */}
            {currentStep >= 1 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep === 1 ? 'bg-primary text-white' : 'bg-slate-700 text-slate-50'}`}>
                    1
                  </div>
                  <h2 className="text-xl font-semibold text-slate-50">Thông tin mua vé</h2>
                </div>

                {currentStep === 1 ? (
                  <div>
                    <BuyerInfoForm onSubmit={handleBuyerInfoSubmit} />
                    {bookingLoading && (
                       <p className="mt-4 text-sm text-slate-400 animate-pulse">Đang giữ chỗ...</p>
                    )}
                  </div>
                ) : (
                  buyerInfo && (
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-slate-400">Họ tên</p>
                          <p className="text-slate-50 font-medium">{buyerInfo.fullName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Email</p>
                          <p className="text-slate-50 font-medium">{buyerInfo.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Số điện thoại</p>
                          <p className="text-slate-50 font-medium">{buyerInfo.phone}</p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Step 2: Payment Method */}
            {currentStep >= 2 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep === 2 ? 'bg-primary text-white' : 'bg-slate-700 text-slate-50'}`}>
                    2
                  </div>
                  <h2 className="text-xl font-semibold text-slate-50">Thanh toán</h2>
                </div>

                {currentStep === 2 && bookingSuccess && bookingSuccess.order.status === 'PENDING' && (
                  <>
                    <CountdownTimer expiredAt={bookingSuccess.expiredAt} />
                    
                    {!paymentUrl ? (
                      <>
                        <PaymentMethodSelector
                          selectedMethod={paymentMethod}
                          onSelect={handlePaymentMethodSelect}
                        />

                        <button
                          onClick={handlePaymentSubmit}
                          disabled={!paymentMethod || bookingLoading}
                          className="w-full mt-8 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {bookingLoading ? 'Đang xử lý...' : 'Thanh toán ngay'}
                        </button>
                        <PaymentNote />
                      </>
                    ) : (
                      <div className="space-y-4">
                        <a
                          href={paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-all"
                        >
                          Mở trang thanh toán
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={checkPaymentStatus}
                          disabled={checkingPayment}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                          {checkingPayment ? 'Đang kiểm tra...' : 'Kiểm tra kết quả thanh toán'}
                          {!checkingPayment && <RefreshCw className="w-4 h-4 text-primary" />}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {currentStep > 2 && paymentMethod && (
                  <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Phương thức thanh toán</p>
                        <p className="text-slate-50 font-medium">
                          {paymentMethod === 'vnpay' ? 'VNPAY' : 'MoMo'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-sm">
                    ✓
                  </div>
                  <h2 className="text-xl font-semibold text-slate-50">Xác nhận thanh toán</h2>
                </div>

                <div className="bg-green-900/20 border border-green-800 rounded-lg p-8 text-center">
                  <div className="text-5xl mb-4 flex justify-center"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">
                    Thanh toán thành công!
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Vé của bạn đã được gửi đến email {buyerInfo?.email}
                  </p>
                  <p className="text-sm text-slate-400 mb-6">
                    Mã đơn hàng: <span className="text-green-400 font-mono">{bookingSuccess?.order.id}</span>
                  </p>
                  <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Quay về trang chủ
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <OrderSummary concert={concert} selectedTicket={{ type: selectedTicketType, quantity: checkoutData.quantity }} />
          </div>
        </div>
      </div>
    </div>
  )
}
