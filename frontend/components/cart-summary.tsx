'use client'

import { TicketType } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ShoppingCart, X } from 'lucide-react'

interface CartSummaryProps {
  selectedTickets: Record<string, number>
  allTickets: TicketType[]
  onCheckout: () => void
}

const formatPrice = (price: number | string) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(price))
}

export function CartSummary({ selectedTickets, allTickets, onCheckout }: CartSummaryProps) {
  const totalItems = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0)

  const totalPrice = allTickets.reduce((sum, ticket) => {
    const quantity = selectedTickets[ticket.id] || 0
    return sum + Number(ticket.price) * quantity
  }, 0)

  const isEmpty = totalItems === 0

  if (isEmpty) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Summary */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tổng số vé</p>
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-muted-foreground">Tổng tiền</p>
                <p className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</p>
              </div>
            </div>
          </div>

          {/* Mobile Total */}
          <div className="sm:hidden text-right">
            <p className="text-sm text-muted-foreground">Tổng tiền</p>
            <p className="text-xl font-bold text-primary">{formatPrice(totalPrice)}</p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onCheckout}
            size="lg"
            className="whitespace-nowrap"
          >
            Đặt vé ngay
          </Button>
        </div>

        {/* Selected Tickets Breakdown */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {allTickets.map((ticket) => {
              const quantity = selectedTickets[ticket.id]
              if (quantity) {
                return (
                  <div key={ticket.id} className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-medium">
                    {ticket.name} × {quantity} = {formatPrice(Number(ticket.price) * quantity)}
                  </div>
                )
              }
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
