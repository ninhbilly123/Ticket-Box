'use client'

import { TicketType } from '@/lib/api'

interface SeatingMapProps {
  ticketTypes: TicketType[]
  selectedTicketTypeId: string | null
  onZoneSelect: (ticketTypeId: string) => void
}

const formatPrice = (price: number | string) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(price))
}

const ZONE_COLORS: Record<string, string> = {
  'GA': '#9B7FFF',
  'CAT 2': '#B99FFF',
  'CAT 1': '#D4C5FF',
  'VIP': '#7A5FFF',
  'SVIP': '#6C47FF',
}

export function SeatingMap({ ticketTypes, selectedTicketTypeId, onZoneSelect }: SeatingMapProps) {
  
  const getTicketColor = (name: string) => {
    for (const [key, color] of Object.entries(ZONE_COLORS)) {
      if (name.toUpperCase().includes(key)) return color
    }
    return '#9B7FFF' // default color
  }

  const getTicketTypeByKeyword = (keyword: string) => {
    return ticketTypes.find(t => t.name.toUpperCase().includes(keyword))
  }

  const gaTicket = getTicketTypeByKeyword('GA')
  const cat2Ticket = getTicketTypeByKeyword('CAT 2')
  const cat1Ticket = getTicketTypeByKeyword('CAT 1')
  const vipTicket = getTicketTypeByKeyword('VIP')
  const svipTicket = getTicketTypeByKeyword('SVIP')

  const getOpacity = (ticket: TicketType | undefined, isSelected: boolean) => {
    if (!ticket) return 0.2
    if (ticket.remaining === 0 && ticket.reserved === 0) return 0.2 // Sold out
    if (ticket.remaining === 0 && ticket.reserved > 0) return 0.4 // Reserved
    return isSelected ? 0.9 : 0.6
  }
  
  const handleSelect = (ticket: TicketType | undefined) => {
    if (ticket && (ticket.remaining > 0 || ticket.reserved > 0)) {
      onZoneSelect(ticket.id)
    }
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-foreground mb-6">Bản đồ sân khấu</h2>

      {/* Venue Map */}
      <div className="bg-gradient-to-b from-secondary to-secondary/50 rounded-xl p-12 mb-8 shadow-lg">
        <svg viewBox="0 0 800 600" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Stage */}
          <rect x="250" y="30" width="300" height="80" fill="#6C47FF" opacity="0.2" rx="8" />
          <text x="400" y="75" textAnchor="middle" className="text-lg font-bold" fill="currentColor">
            🎤 SÂN KHẤU
          </text>

          {/* GA Zone - Bottom Center */}
          <rect
            x="200"
            y="380"
            width="400"
            height="120"
            fill={gaTicket ? getTicketColor(gaTicket.name) : '#9B7FFF'}
            opacity={getOpacity(gaTicket, gaTicket?.id === selectedTicketTypeId)}
            rx="8"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleSelect(gaTicket)}
          />
          <text x="400" y="445" textAnchor="middle" className="text-xl font-bold" fill="white" pointerEvents="none">
            GA - Đứng
          </text>

          {/* CAT2 Zones - Left & Right */}
          <rect
            x="80"
            y="280"
            width="100"
            height="90"
            fill={cat2Ticket ? getTicketColor(cat2Ticket.name) : '#B99FFF'}
            opacity={getOpacity(cat2Ticket, cat2Ticket?.id === selectedTicketTypeId)}
            rx="6"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleSelect(cat2Ticket)}
          />
          <text x="130" y="328" textAnchor="middle" className="text-sm font-bold" fill="white" pointerEvents="none">
            CAT 2
          </text>

          <rect
            x="620"
            y="280"
            width="100"
            height="90"
            fill={cat2Ticket ? getTicketColor(cat2Ticket.name) : '#B99FFF'}
            opacity={getOpacity(cat2Ticket, cat2Ticket?.id === selectedTicketTypeId)}
            rx="6"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleSelect(cat2Ticket)}
          />
          <text x="670" y="328" textAnchor="middle" className="text-sm font-bold" fill="white" pointerEvents="none">
            CAT 2
          </text>

          {/* CAT1 Zones - Left & Right */}
          <rect
            x="150"
            y="180"
            width="70"
            height="90"
            fill={cat1Ticket ? getTicketColor(cat1Ticket.name) : '#D4C5FF'}
            opacity={getOpacity(cat1Ticket, cat1Ticket?.id === selectedTicketTypeId)}
            rx="6"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleSelect(cat1Ticket)}
          />
          <text x="185" y="228" textAnchor="middle" className="text-sm font-bold" fill="white" pointerEvents="none">
            CAT 1
          </text>

          <rect
            x="580"
            y="180"
            width="70"
            height="90"
            fill={cat1Ticket ? getTicketColor(cat1Ticket.name) : '#D4C5FF'}
            opacity={getOpacity(cat1Ticket, cat1Ticket?.id === selectedTicketTypeId)}
            rx="6"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleSelect(cat1Ticket)}
          />
          <text x="615" y="228" textAnchor="middle" className="text-sm font-bold" fill="white" pointerEvents="none">
            CAT 1
          </text>

          {/* VIP Zones - Left & Right */}
          <rect
            x="100"
            y="120"
            width="50"
            height="50"
            fill={vipTicket ? getTicketColor(vipTicket.name) : '#7A5FFF'}
            opacity={getOpacity(vipTicket, vipTicket?.id === selectedTicketTypeId)}
            rx="4"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleSelect(vipTicket)}
          />
          <text x="125" y="150" textAnchor="middle" className="text-xs font-bold" fill="white" pointerEvents="none">
            VIP
          </text>

          <rect
            x="650"
            y="120"
            width="50"
            height="50"
            fill={vipTicket ? getTicketColor(vipTicket.name) : '#7A5FFF'}
            opacity={getOpacity(vipTicket, vipTicket?.id === selectedTicketTypeId)}
            rx="4"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleSelect(vipTicket)}
          />
          <text x="675" y="150" textAnchor="middle" className="text-xs font-bold" fill="white" pointerEvents="none">
            VIP
          </text>

          {/* SVIP Zone - Center Front */}
          <rect
            x="350"
            y="120"
            width="100"
            height="40"
            fill={svipTicket ? getTicketColor(svipTicket.name) : '#6C47FF'}
            opacity={getOpacity(svipTicket, svipTicket?.id === selectedTicketTypeId)}
            rx="4"
            className="cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleSelect(svipTicket)}
          />
          <text x="400" y="145" textAnchor="middle" className="text-sm font-bold" fill="white" pointerEvents="none">
            SVIP
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="bg-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Chú giải các khu vực</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {ticketTypes.map((ticket) => (
            <div key={ticket.id} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded border-2 border-foreground/20"
                style={{ backgroundColor: getTicketColor(ticket.name) }}
              />
              <div className="text-sm">
                <p className="font-medium text-foreground">{ticket.name}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(ticket.price)}</p>
                {ticket.remaining === 0 && ticket.reserved > 0 && (
                   <p className="text-xs text-amber-500">Đang giữ chỗ</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
