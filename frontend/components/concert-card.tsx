'use client'

import Link from 'next/link'
import { Concert } from '@/lib/api'
import { Calendar, Clock, MapPin } from 'lucide-react'
import Image from 'next/image'
import { TicketBadge } from './ticket-badge'
import { useState } from 'react'

interface ConcertCardProps {
  concert: Concert
}

export function ConcertCard({ concert }: ConcertCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Link href={`/concert/${concert.id}`}>
      <div
        className="bg-card rounded-lg overflow-hidden border border-border transition-all duration-300 hover:shadow-lg hover:border-primary/20 h-full flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Concert Poster Image */}
      <div className="relative h-64 w-full overflow-hidden bg-muted flex-shrink-0">
        <Image
          src={concert.seatMapUrl || '/concert-1.png'} // Use seatMapUrl as image or fallback since DB doesn't have image
          alt={concert.title}
          fill
          className={`object-cover transition-transform duration-300 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        />
      </div>

      {/* Concert Info */}
      <div className="p-4 space-y-4 flex-grow flex flex-col">
        {/* Concert Title and Artist */}
        <div>
          <h3 className="text-lg font-bold text-foreground line-clamp-2">
            {concert.title}
          </h3>
          <p className="text-sm text-primary font-semibold mt-1">
            {concert.artist}
          </p>
        </div>

        {/* Date, Time, Venue, City */}
        <div className="space-y-2 text-sm text-muted-foreground flex-grow">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formatDate(concert.dateTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>{formatTime(concert.dateTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium line-clamp-1">{concert.location}</span>
          </div>
        </div>

        {/* Ticket Availability */}
        <div className="pt-4 border-t border-border space-y-3">
          {concert.ticketTypes.slice(0, 3).map((ticket) => (
            <TicketBadge key={ticket.id} ticket={ticket} />
          ))}
          {concert.ticketTypes.length > 3 && (
            <div className="text-xs text-muted-foreground text-center pt-1">+ {concert.ticketTypes.length - 3} hạng vé khác</div>
          )}
        </div>

        {/* Book Button */}
        <button className="w-full mt-4 px-4 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors">
          Đặt vé ngay
        </button>
      </div>
      </div>
    </Link>
  )
}
