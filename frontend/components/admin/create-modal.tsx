'use client'

import React, { useState, useEffect } from 'react'
import { X, Upload, Calendar, MapPin, Image as ImageIcon, Map, Sparkles, Check } from 'lucide-react'

export interface ConcertFormData {
  id?: string
  name: string
  artist: string
  date: string
  time: string
  venue: string
  city: string
  description: string
  image: string
  seatMapSvg: string
  status: 'Sắp mở bán' | 'Đang mở bán' | 'Tạm dừng' | 'Đã kết thúc' | 'Đã hủy'
  ticketsSold: number
  ticketsTotal: number
  revenue: number
}

interface CreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ConcertFormData) => void
  editData?: ConcertFormData | null
}

export function CreateModal({ isOpen, onClose, onSave, editData }: CreateModalProps) {
  const [formData, setFormData] = useState<ConcertFormData>({
    name: '',
    artist: '',
    date: '',
    time: '19:00',
    venue: '',
    city: 'TP. Hồ Chí Minh',
    description: '',
    image: '',
    seatMapSvg: '',
    status: 'Sắp mở bán',
    ticketsSold: 0,
    ticketsTotal: 1000,
    revenue: 0
  })

  const [posterFile, setPosterFile] = useState<string | null>(null)
  const [svgFile, setSvgFile] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setFormData(editData)
      setPosterFile(editData.image || null)
      setSvgFile(editData.seatMapSvg || null)
    } else {
      setFormData({
        name: '',
        artist: '',
        date: '',
        time: '19:00',
        venue: '',
        city: 'TP. Hồ Chí Minh',
        description: '',
        image: '',
        seatMapSvg: '',
        status: 'Sắp mở bán',
        ticketsSold: 0,
        ticketsTotal: 1000,
        revenue: 0
      })
      setPosterFile(null)
      setSvgFile(null)
    }
    setErrors({})
  }, [editData, isOpen])

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev }
        delete copy[name]
        return copy
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Tên concert là bắt buộc'
    if (!formData.artist.trim()) newErrors.artist = 'Tên nghệ sĩ là bắt buộc'
    if (!formData.date) newErrors.date = 'Ngày diễn ra là bắt buộc'
    if (!formData.venue.trim()) newErrors.venue = 'Địa điểm là bắt buộc'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onSave({
      ...formData,
      image: posterFile || '/concert-placeholder.png',
      seatMapSvg: svgFile || 'default-seating-map'
    })
    onClose()
  }

  // Pre-fill button helper for fast testing
  const handleAutoFill = () => {
    setFormData({
      name: 'Vũ. Live Concert "Bảo Tàng Của Những Tiếc Nuối"',
      artist: 'Thái Vũ',
      date: '2026-10-15',
      time: '19:30',
      venue: 'Nhà thi đấu Nguyễn Du',
      city: 'TP. Hồ Chí Minh',
      description: 'Đêm diễn đặc biệt kỷ niệm album mới của Vũ. hứa hẹn đem đến những câu chuyện âm nhạc đầy chất thơ, lãng mạn và xúc cảm đong đầy.',
      image: '/concert-2.png',
      seatMapSvg: 'svg-data',
      status: 'Sắp mở bán',
      ticketsSold: 0,
      ticketsTotal: 2500,
      revenue: 0
    })
    setPosterFile('/concert-2.png')
    setSvgFile('svg-data')
    setErrors({})
  }

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setPosterFile(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setSvgFile(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 font-sans">
      <div 
        className="bg-[#161D2B] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-slate-200 animate-in fade-in-50 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="bg-[#6C47FF]/10 text-[#6C47FF] p-1.5 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {editData ? 'Cập Nhật Concert' : 'Tạo Concert Mới'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!editData && (
              <button 
                type="button"
                onClick={handleAutoFill}
                className="text-xs bg-indigo-500/10 text-[#6C47FF] hover:bg-[#6C47FF] hover:text-white border border-[#6C47FF]/30 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Nhập nhanh dữ liệu mẫu
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable Form) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Row 1: Tên Concert & Nghệ sĩ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tên Concert <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="name" 
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ví dụ: Dream Concert 2025" 
                className={`w-full bg-[#0E131F] border ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF]'} rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B]`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nghệ Sĩ Biểu Diễn <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="artist" 
                value={formData.artist}
                onChange={handleInputChange}
                placeholder="Ví dụ: The Harmonies, Vũ." 
                className={`w-full bg-[#0E131F] border ${errors.artist ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF]'} rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B]`}
              />
              {errors.artist && <p className="text-red-500 text-xs mt-1.5">{errors.artist}</p>}
            </div>
          </div>

          {/* Row 2: Ngày giờ & Địa điểm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ngày diễn ra <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type="date" 
                  name="date" 
                  value={formData.date}
                  onChange={handleInputChange}
                  className={`w-full bg-[#0E131F] border ${errors.date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF]'} rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B]`}
                />
                <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
              {errors.date && <p className="text-red-500 text-xs mt-1.5">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Giờ diễn</label>
              <input 
                type="time" 
                name="time" 
                value={formData.time}
                onChange={handleInputChange}
                className="w-full bg-[#0E131F] border border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Thành Phố</label>
              <select 
                name="city" 
                value={formData.city}
                onChange={handleInputChange}
                className="w-full bg-[#0E131F] border border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B]"
              >
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Nha Trang">Nha Trang</option>
                <option value="Đà Lạt">Đà Lạt</option>
              </select>
            </div>
          </div>

          {/* Row 3: Địa điểm chi tiết & Trạng thái */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Địa điểm tổ chức <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type="text" 
                  name="venue" 
                  value={formData.venue}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Nhà thi đấu Quân khu 7" 
                  className={`w-full bg-[#0E131F] border ${errors.venue ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF]'} rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B]`}
                />
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
              {errors.venue && <p className="text-red-500 text-xs mt-1.5">{errors.venue}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trạng Thái</label>
              <select 
                name="status" 
                value={formData.status}
                onChange={handleInputChange}
                className="w-full bg-[#0E131F] border border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B]"
              >
                <option value="Sắp mở bán">Sắp mở bán</option>
                <option value="Đang mở bán">Đang mở bán</option>
                <option value="Tạm dừng">Tạm dừng</option>
                <option value="Đã kết thúc">Đã kết thúc</option>
                <option value="Đã hủy">Đã hủy</option>
              </select>
            </div>
          </div>

          {/* Row 4: Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mô Tả Chương Trình</label>
            <textarea 
              name="description" 
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Giới thiệu nội dung, thông điệp của đêm nhạc..." 
              className="w-full bg-[#0E131F] border border-slate-800 focus:border-[#6C47FF] focus:ring-[#6C47FF] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161D2B] resize-none"
            />
          </div>

          {/* Row 5: File uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Poster Image */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hình Ảnh Poster</label>
              <div className="relative group/upload w-full border-2 border-dashed border-slate-800 hover:border-[#6C47FF]/50 rounded-2xl bg-[#0E131F] p-5 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px]">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePosterUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                />
                
                {posterFile ? (
                  <div className="relative w-full h-full min-h-[120px] flex flex-col items-center justify-center">
                    <img 
                      src={posterFile} 
                      alt="Poster Preview" 
                      className="max-h-28 rounded-lg object-contain mb-2 shadow-md" 
                    />
                    <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" /> Đã chọn ảnh poster
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-slate-900 rounded-xl mb-3 text-slate-400 group-hover/upload:text-[#6C47FF] group-hover/upload:bg-[#6C47FF]/10 transition-colors">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">Kéo thả hoặc nhấn để tải ảnh</p>
                    <p className="text-[10px] text-slate-500 mt-1">Hỗ trợ JPG, PNG, WEBP (Khuyên dùng 3:4)</p>
                  </>
                )}
              </div>
            </div>

            {/* Upload Seating Map SVG */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sơ đồ chỗ ngồi (SVG Layout)</label>
              <div className="relative group/upload w-full border-2 border-dashed border-slate-800 hover:border-[#6C47FF]/50 rounded-2xl bg-[#0E131F] p-5 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px]">
                <input 
                  type="file" 
                  accept=".svg" 
                  onChange={handleSvgUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                />

                {svgFile ? (
                  <div className="relative w-full h-full min-h-[120px] flex flex-col items-center justify-center">
                    <div className="p-3 bg-[#6C47FF]/10 text-[#6C47FF] rounded-xl mb-2">
                      <Map className="h-8 w-8" />
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" /> Sơ đồ chỗ ngồi SVG đã nạp
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-slate-900 rounded-xl mb-3 text-slate-400 group-hover/upload:text-[#6C47FF] group-hover/upload:bg-[#6C47FF]/10 transition-colors">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">Kéo thả hoặc nhấn để tải sơ đồ</p>
                    <p className="text-[10px] text-slate-500 mt-1">Chỉ nhận định dạng SVG sơ đồ phân khu</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white text-sm font-medium transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-[#6C47FF] hover:bg-[#5C36FF] text-white text-sm font-medium shadow-md shadow-indigo-600/10 transition-colors"
          >
            {editData ? 'Lưu thay đổi' : 'Tạo concert'}
          </button>
        </div>
      </div>
    </div>
  )
}
