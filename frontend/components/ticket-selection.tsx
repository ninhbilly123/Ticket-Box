'use client'

import { TicketType } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Check } from 'lucide-react'

interface TicketSelectionProps {
  tickets: TicketType[]
  selectedTickets: Record<string, number>
  onQuantityChange: (ticketTypeId: string, quantity: number) => void
  onSelectTicket: (ticketTypeId: string) => void
}

const formatPrice = (price: number | string) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(price))
}

export function TicketSelection({
  tickets,
  selectedTickets,
  onQuantityChange,
  onSelectTicket,
}: TicketSelectionProps) {
  const isSoldOut = (ticket: TicketType) => ticket.remaining === 0 && ticket.reserved === 0
  const isLowStock = (ticket: TicketType) => ticket.remaining > 0 && ticket.remaining < 10
  const isReserved = (ticket: TicketType) => ticket.remaining === 0 && ticket.reserved > 0

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-foreground mb-6">Chọn loại vé</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => {
          const quantity = selectedTickets[ticket.id] || 0
          const sold = isSoldOut(ticket)
          const lowStock = isLowStock(ticket)
          const reserved = isReserved(ticket)

          return (
            <div
              key={ticket.id}
              className={`rounded-lg border-2 transition-all ${
                quantity > 0
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              } ${sold ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{ticket.name}</h3>
                    <p className="text-2xl font-bold text-primary mt-1">{formatPrice(ticket.price)}</p>
                  </div>
                  {quantity > 0 && (
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Availability */}
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground">
                    {sold ? (
                      <span className="text-destructive font-semibold">Hết vé</span>
                    ) : reserved ? (
                      <span className="text-amber-500 font-semibold">Đang giữ chỗ</span>
                    ) : lowStock ? (
                      <span className="text-orange-500 font-semibold">
                        Sắp hết ({ticket.remaining} vé còn)
                      </span>
                    ) : (
                      <span>{ticket.remaining} vé còn</span>
                    )}
                  </p>
                </div>

                {/* Quantity Selector */}
                {(!sold && !reserved) ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-secondary rounded-lg p-2">
                      <button
                        onClick={() => {
                          if (quantity > 0) {
                            onQuantityChange(ticket.id, quantity - 1)
                          }
                        }}
                        className="p-2 hover:bg-primary/20 rounded transition-colors"
                        disabled={quantity === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-lg font-semibold">{quantity}</span>
                      <button
                        onClick={() => {
                          if (quantity < ticket.remaining && quantity < ticket.maxLimitPerUser) {
                            onQuantityChange(ticket.id, quantity + 1)
                          }
                        }}
                        className="p-2 hover:bg-primary/20 rounded transition-colors"
                        disabled={quantity >= ticket.remaining || quantity >= ticket.maxLimitPerUser}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <Button
                      onClick={() => onSelectTicket(ticket.id)}
                      disabled={quantity === 0}
                      className="w-full"
                    >
                      {quantity > 0 ? 'Đã chọn' : 'Chọn'}
                    </Button>
                  </div>
                ) : (
                  <Button disabled className="w-full">
                    {reserved ? 'Đang giữ chỗ' : 'Hết vé'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
