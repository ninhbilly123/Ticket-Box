'use client'

import { Concert, TicketType } from '@/lib/api'
import Image from 'next/image'

interface OrderSummaryProps {
  concert: Concert
  selectedTicket: { type: TicketType; quantity: number } | null
}

export function OrderSummary({ concert, selectedTicket }: OrderSummaryProps) {
  const totalPrice = selectedTicket ? Number(selectedTicket.type.price) * selectedTicket.quantity : 0
  const totalQuantity = selectedTicket ? selectedTicket.quantity : 0

  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 sticky top-6 h-fit">
      {/* Concert Header */}
      <div className="mb-6 pb-6 border-b border-slate-700">
        <div className="flex gap-4">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={concert.seatMapUrl || '/concert-1.png'}
              alt={concert.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-50 line-clamp-2">{concert.title}</h3>
            <p className="text-sm text-slate-400 mt-1">
              📅 {new Date(concert.dateTime).toLocaleDateString('vi-VN')}
            </p>
            <p className="text-sm text-slate-400">📍 {concert.location}</p>
          </div>
        </div>
      </div>

      {/* Ticket Breakdown */}
      <div className="mb-6 pb-6 border-b border-slate-700">
        <h4 className="font-semibold text-slate-50 mb-4">Chi tiết vé</h4>
        <div className="space-y-3">
          {selectedTicket && (
            <div key={selectedTicket.type.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-slate-50">{selectedTicket.type.name}</p>
                <p className="text-slate-400">
                  {selectedTicket.quantity} × {formatPrice(Number(selectedTicket.type.price))}
                </p>
              </div>
              <p className="font-medium text-slate-50">
                {formatPrice(Number(selectedTicket.type.price) * selectedTicket.quantity)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Total Amount */}
      <div className="mb-6 pb-6 border-b border-slate-700">
        <div className="flex items-baseline justify-between">
          <span className="text-slate-400">Tổng cộng</span>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">
              {formatPrice(totalPrice)}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {totalQuantity} vé
            </p>
          </div>
        </div>
      </div>

      {/* Security Badges */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>🔒</span>
          <span>Bảo mật SSL</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>✅</span>
          <span>Thanh toán an toàn</span>
        </div>
      </div>
    </div>
  )
}
