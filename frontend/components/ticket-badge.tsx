import { TicketType } from '@/lib/api'

interface TicketBadgeProps {
  ticket: TicketType
}

export function TicketBadge({ ticket }: TicketBadgeProps) {
  const isAvailable = ticket.remaining > 0
  const isSoldOut = ticket.remaining === 0 && ticket.reserved === 0
  const isReserved = ticket.remaining === 0 && ticket.reserved > 0

  const getStatusColor = () => {
    if (isSoldOut) {
      return 'bg-red-100 text-red-700'
    }
    if (isReserved) {
      return 'bg-amber-100 text-amber-700'
    }
    if (ticket.remaining < 10) {
      return 'bg-orange-100 text-orange-700'
    }
    return 'bg-muted text-muted-foreground'
  }

  const getStatusText = () => {
    if (isSoldOut) {
      return 'Hết vé'
    }
    if (isReserved) {
      return 'Đang giữ'
    }
    if (ticket.remaining < 10) {
      return 'Sắp hết'
    }
    return `${ticket.remaining} vé`
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-foreground">{ticket.name}</span>
        <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      <div className="text-sm text-primary font-semibold">
        {Number(ticket.price).toLocaleString('vi-VN')} ₫
      </div>
    </div>
  )
}
