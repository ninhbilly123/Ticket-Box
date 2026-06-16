'use client'

import React from 'react'
import { Music, AlertCircle, Ticket, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react'

interface StatsCardsProps {
  totalConcerts: number
  openConcerts: number
  totalTicketsSold: number
  revenueThisMonth: number
}

export function StatsCards({ 
  totalConcerts, 
  openConcerts, 
  totalTicketsSold, 
  revenueThisMonth 
}: StatsCardsProps) {
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val)
  }

  const cards = [
    {
      title: 'Tổng Concert',
      value: formatNumber(totalConcerts),
      change: '+2 concert mới tháng này',
      trend: 'up',
      icon: Music,
      iconColor: 'text-[#6C47FF]',
      iconBg: 'bg-[#6C47FF]/10',
      gradient: 'from-[#6C47FF]/10 to-transparent'
    },
    {
      title: 'Đang Mở Bán',
      value: formatNumber(openConcerts),
      change: 'Chiếm 62.5% tổng số',
      trend: 'neutral',
      icon: AlertCircle,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-400/10',
      gradient: 'from-emerald-400/10 to-transparent'
    },
    {
      title: 'Tổng Vé Đã Bán',
      value: `${formatNumber(totalTicketsSold)} / 4,800`,
      change: '74% hiệu suất lấp đầy',
      trend: 'up',
      icon: Ticket,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-400/10',
      gradient: 'from-amber-400/10 to-transparent',
      progress: 74
    },
    {
      title: 'Doanh Thu Tháng Này',
      value: formatCurrency(revenueThisMonth),
      change: '+18.4% so với tháng trước',
      trend: 'up',
      icon: DollarSign,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-400/10',
      gradient: 'from-cyan-400/10 to-transparent'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div 
            key={idx} 
            className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#161D2B]/90 backdrop-blur-md p-6 shadow-lg shadow-black/20 hover:border-slate-700 transition-all duration-300 group"
          >
            {/* Top right subtle background glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradient} rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 pointer-events-none`} />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">{card.title}</span>
              <div className={`p-2.5 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white tracking-tight">{card.value}</h3>
              
              {card.progress !== undefined && (
                <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-amber-300 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-3 text-xs">
                {card.trend === 'up' && (
                  <span className="flex items-center text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                    +{card.progress ? '12%' : '18.4%'}
                  </span>
                )}
                <span className="text-slate-500">{card.change}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
