'use client'

import { useState } from 'react'
import { Concert } from '@/lib/api'
import { ConcertCard } from './concert-card'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ConcertGridProps {
  concerts: Concert[]
  filter?: string
  city?: string
}

const ITEMS_PER_PAGE = 9

export function ConcertGrid({ concerts, filter = 'all', city = 'Tất cả thành phố' }: ConcertGridProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Filter concerts based on selected city (mock logic for now since API doesn't have city specifically, we can use location)
  const filteredConcerts = city === 'Tất cả thành phố'
    ? concerts
    : concerts.filter(c => c.location.toLowerCase().includes(city.toLowerCase()))

  const totalPages = Math.ceil(filteredConcerts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedConcerts = filteredConcerts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!concerts || concerts.length === 0) {
    return (
      <section className="w-full py-12 bg-background flex justify-center text-muted-foreground">
        Không có sự kiện nào
      </section>
    )
  }

  return (
    <section className="w-full py-12 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Concert Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedConcerts.map(concert => (
            <ConcertCard key={concert.id} concert={concert} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8 border-t border-border">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Trước</span>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={`h-10 w-10 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
