'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Edit, 
  Pause, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  CheckCircle,
  Play,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { StatsCards } from './stats-cards'
import { CreateModal, ConcertFormData } from './create-modal'
import { concerts as mockConcerts } from '@/lib/mock-data'

// Initial list setup matching requirements
const INITIAL_CONCERTS: ConcertFormData[] = [
  {
    id: '1',
    name: 'Dream Concert 2025',
    artist: 'The Harmonies',
    date: '2025-07-15',
    time: '19:00',
    venue: 'Nhạc Viện TP.HCM',
    city: 'TP. Hồ Chí Minh',
    description: 'Trải nghiệm một đêm âm nhạc tuyệt vời với The Harmonies...',
    image: '/concert-1.png',
    seatMapSvg: 'svg-1',
    status: 'Đang mở bán',
    ticketsSold: 350,
    ticketsTotal: 500,
    revenue: 650000000
  },
  {
    id: '2',
    name: 'Summer Night Festival',
    artist: 'Luna Moon',
    date: '2025-07-20',
    time: '20:00',
    venue: 'Công viên Tào Đàn',
    city: 'Hà Nội',
    description: 'Một đêm hè tuyệt vời với Luna Moon...',
    image: '/concert-2.png',
    seatMapSvg: 'svg-2',
    status: 'Đang mở bán',
    ticketsSold: 180,
    ticketsTotal: 600,
    revenue: 216000000
  },
  {
    id: '3',
    name: 'Electric Vibes Tour',
    artist: 'Neon Nights',
    date: '2025-07-25',
    time: '18:30',
    venue: 'Sân vận động Mỹ Đình',
    city: 'Hà Nội',
    description: 'Một buổi hòa nhạc điện tử futuristic với Neon Nights...',
    image: '/concert-3.png',
    seatMapSvg: 'svg-3',
    status: 'Tạm dừng',
    ticketsSold: 75,
    ticketsTotal: 150,
    revenue: 135000000
  },
  {
    id: '4',
    name: 'Retro Beats Live',
    artist: 'Echo Chamber',
    date: '2025-07-28',
    time: '19:30',
    venue: 'Diamond Plaza',
    city: 'TP. Hồ Chí Minh',
    description: 'Hãy quay trở lại những năm 70-80 với Echo Chamber...',
    image: '/concert-4.png',
    seatMapSvg: 'svg-4',
    status: 'Sắp mở bán',
    ticketsSold: 0,
    ticketsTotal: 300,
    revenue: 0
  },
  {
    id: '5',
    name: 'Indie Soul Showcase',
    artist: 'City Lights',
    date: '2025-08-05',
    time: '20:00',
    venue: 'Hoàng Hoa Thám Open Air',
    city: 'TP. Hồ Chí Minh',
    description: 'Một buổi hòa nhạc indie soul intimate với City Lights...',
    image: '/concert-5.png',
    seatMapSvg: 'svg-5',
    status: 'Đang mở bán',
    ticketsSold: 12,
    ticketsTotal: 100,
    revenue: 13200000
  },
  {
    id: '6',
    name: 'Jazz Under Stars',
    artist: 'Blue Notes',
    date: '2025-08-10',
    time: '19:00',
    venue: 'Hồ Tây Amphitheater',
    city: 'Hà Nội',
    description: 'Một đêm jazz thanh lịch dưới ánh sao...',
    image: '/concert-6.png',
    seatMapSvg: 'svg-6',
    status: 'Đã kết thúc',
    ticketsSold: 437,
    ticketsTotal: 600,
    revenue: 720000000
  },
  {
    id: '7',
    name: 'Pop Explosion',
    artist: 'Starlight',
    date: '2025-08-15',
    time: '20:30',
    venue: 'Phú Thọ Stadium',
    city: 'TP. Hồ Chí Minh',
    description: 'Một buổi hòa nhạc pop sôi động với Starlight...',
    image: '/concert-7.png',
    seatMapSvg: 'svg-7',
    status: 'Đang mở bán',
    ticketsSold: 191,
    ticketsTotal: 350,
    revenue: 296000000
  },
  {
    id: '8',
    name: 'World Music Fusion',
    artist: 'Global Harmony',
    date: '2025-08-20',
    time: '19:00',
    venue: 'Water Park Stage',
    city: 'Hà Nội',
    description: 'Một buổi hòa nhạc âm nhạc thế giới đa sắc tộc...',
    image: '/concert-8.png',
    seatMapSvg: 'svg-8',
    status: 'Đã kết thúc',
    ticketsSold: 366,
    ticketsTotal: 400,
    revenue: 475800000
  },
  {
    id: '9',
    name: 'Rock Legends Night',
    artist: 'Thunder Road',
    date: '2025-08-25',
    time: '20:00',
    venue: 'Aeon Mall Tân Phú',
    city: 'TP. Hồ Chí Minh',
    description: 'Một đêm rock tưng bừng với Thunder Road...',
    image: '/concert-9.png',
    seatMapSvg: 'svg-9',
    status: 'Đã hủy',
    ticketsSold: 0,
    ticketsTotal: 200,
    revenue: 0
  }
]

export function AdminDashboard() {
  const [concertList, setConcertList] = useState<ConcertFormData[]>(INITIAL_CONCERTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConcert, setEditingConcert] = useState<ConcertFormData | null>(null)

  // Dropdown action state
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calculate dynamic stats
  const totalConcertsCount = concertList.length
  const openConcertsCount = concertList.filter(c => c.status === 'Đang mở bán').length
  const totalTicketsSoldSum = concertList.reduce((sum, c) => sum + c.ticketsSold, 0)
  const revenueThisMonthSum = concertList.reduce((sum, c) => sum + c.revenue, 0)

  // Filter & Search logic
  const filteredConcerts = concertList.filter((concert) => {
    const matchesSearch = 
      concert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      concert.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      concert.venue.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'All' || concert.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Pagination bounds
  const totalPages = Math.ceil(filteredConcerts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedConcerts = filteredConcerts.slice(startIndex, startIndex + itemsPerPage)

  // Reset pagination if filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Handlers for edit and add
  const handleOpenCreateModal = () => {
    setEditingConcert(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (concert: ConcertFormData) => {
    setEditingConcert(concert)
    setIsModalOpen(true)
    setActiveDropdownId(null)
  }

  const handleSaveConcert = (data: ConcertFormData) => {
    if (data.id) {
      // Edit mode
      setConcertList(prev => prev.map(c => c.id === data.id ? data : c))
    } else {
      // Create mode
      const newConcert: ConcertFormData = {
        ...data,
        id: String(Date.now()),
        ticketsSold: 0,
        revenue: 0
      }
      setConcertList(prev => [newConcert, ...prev])
    }
  }

  // Row status triggers
  const handleTogglePause = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Tạm dừng' ? 'Đang mở bán' : 'Tạm dừng'
    setConcertList(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus as any } : c))
    setActiveDropdownId(null)
  }

  const handleCancelConcert = (id: string) => {
    setConcertList(prev => prev.map(c => c.id === id ? { ...c, status: 'Đã hủy', ticketsSold: 0, revenue: 0 } : c))
    setActiveDropdownId(null)
  }

  const handleDeleteConcert = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa concert này khỏi hệ thống?')) {
      setConcertList(prev => prev.filter(c => c.id !== id))
    }
    setActiveDropdownId(null)
  }

  // Currency utility
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  // Badges styling mapper
  const getStatusBadgeClass = (status: ConcertFormData['status']) => {
    switch (status) {
      case 'Đang mở bán':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
      case 'Sắp mở bán':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
      case 'Tạm dừng':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium'
      case 'Đã kết thúc':
        return 'bg-slate-500/15 text-slate-400 border border-slate-700/50'
      case 'Đã hủy':
        return 'bg-red-500/10 text-red-400 border border-red-500/30'
      default:
        return 'bg-slate-800 text-slate-200'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Quản lý Concert</h2>
          <p className="text-sm text-slate-400">Xem, tìm kiếm, chỉnh sửa và lập kế hoạch concert của TicketBox</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-[#6C47FF] hover:bg-[#5C36FF] text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
        >
          <Plus className="h-5 w-5" />
          Tạo concert mới
        </button>
      </div>

      {/* Statistics dashboard KPIs */}
      <StatsCards 
        totalConcerts={totalConcertsCount} 
        openConcerts={openConcertsCount} 
        totalTicketsSold={totalTicketsSoldSum} 
        revenueThisMonth={revenueThisMonthSum} 
      />

      {/* Main Table section wrapper */}
      <div className="rounded-2xl border border-slate-800 bg-[#161D2B]/95 backdrop-blur-sm overflow-hidden shadow-xl">
        
        {/* Table filter and search tools header */}
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Left search */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm tên concert, nghệ sĩ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0E131F] border border-slate-800 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Right Filters */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar py-1">
            {['All', 'Đang mở bán', 'Sắp mở bán', 'Tạm dừng', 'Đã kết thúc', 'Đã hủy'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? 'bg-[#6C47FF] text-white' 
                    : 'bg-[#0E131F] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {status === 'All' ? 'Tất cả trạng thái' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                <th className="px-6 py-4">Tên concert</th>
                <th className="px-6 py-4">Nghệ sĩ</th>
                <th className="px-6 py-4">Ngày diễn</th>
                <th className="px-6 py-4">Địa điểm</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Vé đã bán</th>
                <th className="px-6 py-4 text-right">Doanh thu</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedConcerts.length > 0 ? (
                paginatedConcerts.map((concert) => (
                  <tr key={concert.id} className="hover:bg-slate-900/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-12 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700/50">
                          <img 
                            src={concert.image} 
                            alt={concert.name} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=120&auto=format&fit=crop'
                            }}
                          />
                        </div>
                        <span className="font-semibold text-white truncate max-w-[180px]">{concert.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{concert.artist}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{concert.date}</td>
                    <td className="px-6 py-4 text-slate-400 truncate max-w-[150px]">{concert.venue}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(concert.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          concert.status === 'Đang mở bán' ? 'bg-emerald-400' :
                          concert.status === 'Sắp mở bán' ? 'bg-blue-400' :
                          concert.status === 'Tạm dừng' ? 'bg-amber-400' :
                          concert.status === 'Đã hủy' ? 'bg-red-400' : 'bg-slate-500'
                        }`} />
                        {concert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold text-white font-mono">{concert.ticketsSold} <span className="text-slate-500 text-xs font-normal">/ {concert.ticketsTotal}</span></div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {Math.round((concert.ticketsSold / concert.ticketsTotal) * 100)}% đã bán
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-white font-mono">
                      {formatCurrency(concert.revenue)}
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === concert.id ? null : concert.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center justify-center"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu actions overlay */}
                      {activeDropdownId === concert.id && (
                        <div 
                          ref={dropdownRef}
                          className="absolute right-6 top-12 w-48 rounded-xl border border-slate-800 bg-[#0E131F] p-1.5 shadow-2xl z-40 text-left animate-in fade-in-50 slide-in-from-top-2 duration-100"
                        >
                          <button
                            onClick={() => handleOpenEditModal(concert)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-[#6C47FF] hover:text-white rounded-lg transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Sửa thông tin
                          </button>
                          
                          <button
                            onClick={() => handleTogglePause(concert.id, concert.status)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-amber-600 hover:text-white rounded-lg transition-colors"
                          >
                            {concert.status === 'Tạm dừng' ? (
                              <>
                                <Play className="h-3.5 w-3.5" />
                                Mở bán lại
                              </>
                            ) : (
                              <>
                                <Pause className="h-3.5 w-3.5" />
                                Tạm dừng bán
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCancelConcert(concert.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-650 hover:text-white rounded-lg transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Hủy Concert
                          </button>
                          
                          <div className="h-px bg-slate-800 my-1" />

                          <button
                            onClick={() => handleDeleteConcert(concert.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-550 hover:text-white rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa vĩnh viễn
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-600" />
                      <span>Không tìm thấy concert phù hợp với bộ lọc</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Section footer */}
        {totalPages > 0 && (
          <div className="p-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/10">
            <span className="text-xs text-slate-400">
              Hiển thị <span className="font-semibold text-white">{startIndex + 1}</span> - <span className="font-semibold text-white">{Math.min(startIndex + itemsPerPage, filteredConcerts.length)}</span> trong <span className="font-semibold text-white">{filteredConcerts.length}</span> concert
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white bg-[#0E131F] disabled:bg-slate-950 disabled:text-slate-700 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 w-9 rounded-xl text-xs font-semibold transition-all ${
                      currentPage === page 
                        ? 'bg-[#6C47FF] text-white shadow-md shadow-indigo-600/10' 
                        : 'bg-[#0E131F] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white bg-[#0E131F] disabled:bg-slate-950 disabled:text-slate-700 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Concert Creator & Editor Modal overlay popup */}
      <CreateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveConcert}
        editData={editingConcert}
      />
    </div>
  )
}
