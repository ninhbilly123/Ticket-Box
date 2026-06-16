'use client'

import { useState } from 'react'
import { Order, OrderStatus, orders } from '@/lib/mock-data'
import { Header } from '@/components/header'
import { FilterTabs } from '@/components/orders/filter-tabs'
import { OrderCard } from '@/components/orders/order-card'

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'ALL'>('ALL')

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'ALL') return true
    return order.status === activeFilter
  })

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Đơn hàng của tôi</h1>
        
        <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Không có đơn hàng nào</p>
          </div>
        )}
      </div>
    </main>
  )
}
