'use client'

import { Search, Sliders } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative w-full bg-gradient-to-br from-primary/5 via-background to-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Headline */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance">
              Đặt vé concert{' '}
              <span className="text-primary">dễ dàng</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Khám phá những buổi concert tuyệt vời nhất và đặt vé của bạn chỉ trong vài click
            </p>
          </div>

          {/* Search Input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tên concert, nghệ sĩ hoặc địa điểm..."
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
              <Sliders className="h-5 w-5" />
              <span className="hidden sm:inline">Lọc</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
