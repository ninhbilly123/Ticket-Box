'use client'

import { OrderStatus } from '@/lib/mock-data'

interface FilterTabsProps {
  activeFilter: OrderStatus | 'ALL'
  onFilterChange: (filter: OrderStatus | 'ALL') => void
}

export function FilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
  const tabs = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'PENDING', label: 'Chờ thanh toán' },
    { id: 'COMPLETED', label: 'Thành công' },
    { id: 'CANCELLED', label: 'Đã hủy' },
  ]

  return (
    <div className="flex gap-4 border-b border-slate-700 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id as OrderStatus | 'ALL')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeFilter === tab.id
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
