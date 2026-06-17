'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface FilterBarProps {
  onFilterChange?: (filter: string, city: string) => void
}

const filters = [
  { id: 'all', label: 'Tất cả' },
  { id: 'upcoming', label: 'Sắp diễn ra' },
  { id: 'this-week', label: 'Tuần này' },
  { id: 'this-month', label: 'Tháng này' },
]

const cities = [
  'Tất cả thành phố',
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
]

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedCity, setSelectedCity] = useState('Tất cả thành phố')
  const [isOpen, setIsOpen] = useState(false)

  const handleFilterClick = (filterId: string) => {
    setActiveFilter(filterId)
    onFilterChange?.(filterId, selectedCity)
  }

  const handleCitySelect = (city: string) => {
    setSelectedCity(city)
    setIsOpen(false)
    onFilterChange?.(activeFilter, city)
  }

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterClick(filter.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* City Dropdown */}
          <div className="relative w-full sm:w-48">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between px-4 py-2 border border-input rounded-lg bg-card text-foreground hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium">{selectedCity}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-input rounded-lg shadow-lg z-10">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleCitySelect(city)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      selectedCity === city ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
