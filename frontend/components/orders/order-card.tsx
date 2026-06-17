'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Order } from '@/lib/mock-data'
import { ChevronDown, Download, Mail, Clock } from 'lucide-react'

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = () => {
    switch (order.status) {
      case 'COMPLETED':
        return 'bg-green-900/20 text-green-400 border-green-700'
      case 'PENDING':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-700'
      case 'CANCELLED':
        return 'bg-red-900/20 text-red-400 border-red-700'
      default:
        return 'bg-slate-700/50 text-slate-300'
    }
  }

  const getStatusLabel = () => {
    switch (order.status) {
      case 'COMPLETED':
        return 'Thành công'
      case 'PENDING':
        return 'Chờ thanh toán'
      case 'CANCELLED':
        return 'Đã hủy'
      default:
        return 'Không xác định'
    }
  }

  const totalTickets = order.tickets.reduce((sum, t) => sum + t.quantity, 0)

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900/50 overflow-hidden mb-4">
      {/* Collapsed View */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex-1 text-left">
          <h3 className="text-lg font-semibold text-slate-50 mb-2">{order.concertName}</h3>
          <p className="text-sm text-slate-400 mb-2">{order.concertDate}</p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">Mã: {order.orderCode}</span>
            <span className="text-lg font-bold text-primary">{order.totalAmount.toLocaleString()} ₫</span>
            <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-slate-700 p-4 bg-slate-950/50">
          {/* Order Info */}
          <div className="mb-6 pb-6 border-b border-slate-700">
            <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase">Thông tin đơn hàng</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400 mb-1">Mã đơn hàng</p>
                <p className="text-slate-50 font-medium">{order.orderCode}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Ngày đặt</p>
                <p className="text-slate-50 font-medium">{order.createdAt}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Phương thức thanh toán</p>
                <p className="text-slate-50 font-medium">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Trạng thái</p>
                <p className={`font-medium ${getStatusColor().split(' ')[1]}`}>{getStatusLabel()}</p>
              </div>
            </div>
          </div>

          {/* Ticket List */}
          <div className="mb-6 pb-6 border-b border-slate-700">
            <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase">Danh sách vé</h4>
            <div className="space-y-2">
              {order.tickets.map((ticket, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700"
                >
                  <span className="text-slate-200">{ticket.type}</span>
                  <span className="text-slate-400">x{ticket.quantity}</span>
                  <span className="text-slate-300">{ticket.unitPrice.toLocaleString()} ₫</span>
                  <span className="text-primary font-semibold">{(ticket.quantity * ticket.unitPrice).toLocaleString()} ₫</span>
                </div>
              ))}
            </div>
          </div>

          {/* E-Ticket Section */}
          {order.status === 'COMPLETED' && (
            <div className="mb-6 pb-6 border-b border-slate-700">
              <h4 className="text-sm font-semibold text-slate-400 mb-4 uppercase">Vé điện tử</h4>
              <div className="flex flex-col items-center gap-6">
                {/* QR Code */}
                <div className="p-6 bg-white rounded-lg">
                  <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/10 rounded flex items-center justify-center border-2 border-dashed border-primary">
                    <span className="text-primary text-sm font-medium text-center">QR Code</span>
                  </div>
                </div>

                {/* Ticket Info */}
                <div className="text-center">
                  <p className="text-slate-300 mb-1">
                    <span className="text-slate-400">Tên:</span> {order.customerName}
                  </p>
                  <p className="text-slate-300 mb-1">
                    <span className="text-slate-400">Loại vé:</span> {order.tickets[0]?.type}
                  </p>
                  <p className="text-slate-300 mb-1">
                    <span className="text-slate-400">Concert:</span> {order.concertName}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-400">Ngày vào:</span> {order.concertDate}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    <Download className="w-4 h-4" />
                    Tải xuống vé
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
                    <Mail className="w-4 h-4" />
                    Gửi lại email
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending Status Actions */}
          {order.status === 'PENDING' && (
            <div className="flex gap-4">
              <div className="flex-1 flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300 text-sm font-medium">Vui lòng thanh toán trong 24 giờ</span>
              </div>
              <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Thanh toán ngay
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
