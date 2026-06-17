'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Breadcrumb } from '@/components/breadcrumb'
import { ConcertHeader } from '@/components/concert-header'
import { TicketSelection } from '@/components/ticket-selection'
import { SeatingMap } from '@/components/seating-map'
import { CartSummary } from '@/components/cart-summary'
import { fetchConcertById, Concert } from '@/lib/api'

export default function ConcertDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [concert, setConcert] = useState<Concert | null>(null)
  const [loading, setLoading] = useState(true)

  // Map of ticketTypeId -> quantity. Restricted to 1 entry.
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null)

  useEffect(() => {
    const loadConcert = async () => {
      try {
        const data = await fetchConcertById(id)
        setConcert(data)
      } catch (error) {
        console.error('Failed to load concert:', error)
      } finally {
        setLoading(false)
      }
    }
    loadConcert()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!concert) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Concert không tìm thấy</h1>
          <Link href="/" className="text-primary hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    )
  }

  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    setSelectedTickets({
      [ticketTypeId]: Math.max(0, quantity),
    })
    if (quantity > 0) {
      setSelectedTicketTypeId(ticketTypeId)
    } else {
      setSelectedTicketTypeId(null)
    }
  }

  const handleSelectTicket = (ticketTypeId: string) => {
    const qty = selectedTickets[ticketTypeId] || 0
    if (qty === 0) {
      handleQuantityChange(ticketTypeId, 1)
    }
  }

  const handleZoneSelect = (ticketTypeId: string) => {
    if (selectedTicketTypeId === ticketTypeId) {
      handleQuantityChange(ticketTypeId, 0)
    } else {
      handleQuantityChange(ticketTypeId, 1)
    }
  }

  const handleCheckout = () => {
    const totalItems = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0)
    if (totalItems > 0 && selectedTicketTypeId) {
      const quantity = selectedTickets[selectedTicketTypeId]
      localStorage.setItem('checkoutData', JSON.stringify({
        concertId: concert.id,
        ticketTypeId: selectedTicketTypeId,
        quantity: quantity
      }))
      router.push('/checkout')
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-primary hover:underline text-sm font-medium">
            ← Quay lại
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Trang chủ', href: '/' },
            { label: 'Concert' },
            { label: concert.title },
          ]}
        />

        {/* Concert Header */}
        <div className="mt-8 mb-12">
          {/* Reuse the modified ConcertHeader, but we need to map API fields */}
          <ConcertHeader concert={{
             ...concert,
             name: concert.title,
             image: concert.seatMapUrl || '/concert-1.png',
             date: concert.dateTime.split('T')[0],
             time: new Date(concert.dateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
             venue: concert.location,
             city: '',
             tickets: [],
          } as any} />
        </div>

        {/* Ticket Selection */}
        <TicketSelection
          tickets={concert.ticketTypes}
          selectedTickets={selectedTickets}
          onQuantityChange={handleQuantityChange}
          onSelectTicket={handleSelectTicket}
        />

        {/* Seating Map */}
        {concert.ticketTypes && (
          <SeatingMap
            ticketTypes={concert.ticketTypes}
            selectedTicketTypeId={selectedTicketTypeId}
            onZoneSelect={handleZoneSelect}
          />
        )}
      </div>

      {/* Cart Summary */}
      <CartSummary
        selectedTickets={selectedTickets}
        allTickets={concert.ticketTypes}
        onCheckout={handleCheckout}
      />

      {/* Padding for sticky cart */}
      <div className="h-32" />
    </main>
  )
}
