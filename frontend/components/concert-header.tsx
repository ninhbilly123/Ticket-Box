'use client'

import Image from 'next/image'
import { Calendar, MapPin, Clock, Sparkles } from 'lucide-react'
import { Concert } from '@/lib/mock-data'

interface ConcertHeaderProps {
  concert: Concert
}

export function ConcertHeader({ concert }: ConcertHeaderProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
      {/* Concert Poster */}
      <div className="flex items-center justify-center">
        <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
          <Image
            src={concert.image}
            alt={concert.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Concert Info */}
      <div className="flex flex-col justify-center space-y-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-2">{concert.name}</h1>
          <p className="text-2xl text-primary font-semibold">{concert.artist}</p>
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Ngày diễn ra</p>
              <p className="text-lg font-semibold text-foreground">{formatDate(concert.date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Giờ bắt đầu</p>
              <p className="text-lg font-semibold text-foreground">{concert.time}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Địa điểm</p>
              <p className="text-lg font-semibold text-foreground">{concert.venue}</p>
              <p className="text-sm text-muted-foreground">{concert.city}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {concert.description && (
          <div className="pt-4 border-t border-border">
            <p className="text-foreground leading-relaxed">{concert.description}</p>
          </div>
        )}

        {/* Artist Bio */}
        {concert.artistBio && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Giới thiệu nghệ sĩ</h3>
            </div>
            <p className="text-foreground/80 leading-relaxed">{concert.artistBio}</p>
          </div>
        )}
      </div>
    </div>
  )
}
