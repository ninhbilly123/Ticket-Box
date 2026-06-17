'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { FilterBar } from '@/components/filter-bar'
import { ConcertGrid } from '@/components/concert-grid'
import { fetchConcerts, Concert } from '@/lib/api'

export default function Home() {
  const [filter, setFilter] = useState('all')
  const [city, setCity] = useState('Tất cả thành phố')
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConcerts = async () => {
      try {
        const data = await fetchConcerts()
        setConcerts(data)
      } catch (error) {
        console.error('Failed to load concerts:', error)
      } finally {
        setLoading(false)
      }
    }
    loadConcerts()
  }, [])

  const handleFilterChange = (newFilter: string, newCity: string) => {
    setFilter(newFilter)
    setCity(newCity)
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      <Hero />
      <FilterBar onFilterChange={handleFilterChange} />
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <ConcertGrid concerts={concerts} filter={filter} city={city} />
      )}
    </main>
  )
}
