'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Music, Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { CustomerEmptyState, CustomerErrorState, CustomerLoadingState } from '../../components/CustomerState';
import { Concert, fetchConcerts } from '../../lib/api';
import { getConcertImage, getTicketSaleClassName, getTicketSaleLabel, getTicketSaleState, getTicketTotalRemaining } from '../../lib/concert-assets';

interface ConcertFilterState {
  search?: string;
  artist?: string;
  location?: string;
  date?: string;
}

export default function ConcertListingPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [filterCatalog, setFilterCatalog] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [artist, setArtist] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');

  // Load concerts
  const loadConcerts = useCallback(
    async (filters: ConcertFilterState = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchConcerts({
          search: filters.search || undefined,
          artist: filters.artist || undefined,
          location: filters.location || undefined,
          date: filters.date || undefined,
        });
        setConcerts(data);
        if (!filters.search && !filters.artist && !filters.location && !filters.date) {
          setFilterCatalog(data);
        }
      } catch (err) {
        setError((err as Error).message || 'Không thể tải danh sách concert.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadConcerts();
  }, [loadConcerts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadConcerts({ search, artist, location, date });
  };

  const clearFilters = () => {
    setSearch('');
    setArtist('');
    setLocation('');
    setDate('');
    // Load immediately with cleared values
    loadConcerts({
      search: '',
      artist: '',
      location: '',
      date: '',
    });
  };

  const artistOptions = useMemo(
    () => Array.from(new Set(filterCatalog.map((concert) => concert.artist).filter(Boolean))).sort((left, right) => left.localeCompare(right, 'vi')),
    [filterCatalog]
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(filterCatalog.map((concert) => concert.location).filter(Boolean))).sort((left, right) => left.localeCompare(right, 'vi')),
    [filterCatalog]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20">
      {/* Hero Header Banner */}
      <div className="relative bg-gradient-to-r from-purple-900 to-indigo-950 py-16 px-6 text-center border-b border-indigo-900/50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-80 pointer-events-none"></div>
        <div className="relative max-w-3xl mx-auto z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 drop-shadow">
            TicketBox Concerts
          </h1>
          <p className="text-base md:text-lg text-indigo-200 mb-8 max-w-xl mx-auto">
            Đặt vé tham gia các đại nhạc hội, liveshow âm nhạc đặc sắc và bùng nổ nhất tại Việt Nam.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-lg mx-auto bg-gray-900/90 p-1.5 rounded-full border border-indigo-500/30 shadow-lg backdrop-blur">
            <div className="flex-1 flex items-center pl-4 gap-2">
              <Search className="w-5 h-5 text-indigo-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm concert hoặc nghệ sĩ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-white placeholder-gray-500 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 transition-colors text-white px-6 py-2 rounded-full font-semibold text-sm shadow-md"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* Filters Toolbar */}
        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-lg mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mr-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Bộ lọc
            </span>

            {/* Artist filter */}
            <select
              value={artist}
              onChange={(e) => {
                const val = e.target.value;
                setArtist(val);
                loadConcerts({ search, artist: val, location, date });
              }}
              className="bg-gray-950 border border-gray-800 rounded-lg text-xs py-2 px-3 text-gray-300 outline-none focus:border-indigo-500"
            >
              <option value="">-- Tất cả nghệ sĩ --</option>
              {artistOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {/* Location filter */}
            <select
              value={location}
              onChange={(e) => {
                const val = e.target.value;
                setLocation(val);
                loadConcerts({ search, artist, location: val, date });
              }}
              className="bg-gray-950 border border-gray-800 rounded-lg text-xs py-2 px-3 text-gray-300 outline-none focus:border-indigo-500"
            >
              <option value="">-- Tất cả địa điểm --</option>
              {locationOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={date}
              onChange={(e) => {
                const val = e.target.value;
                setDate(val);
                loadConcerts({ search, artist, location, date: val });
              }}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {}
              }}
              style={{ colorScheme: 'dark' }}
              className="bg-gray-950 border border-gray-800 rounded-lg text-xs py-2 px-3 text-gray-300 outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-white transition-colors py-2 px-3 border border-gray-800 hover:border-gray-700 rounded-lg"
            >
              Xóa bộ lọc
            </button>
            <button
              onClick={() => loadConcerts({ search, artist, location, date })}
              className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 hover:bg-indigo-950 hover:text-white transition-all py-2 px-3 rounded-lg text-xs flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Listings Section */}
        {loading ? (
          <CustomerLoadingState text="Đang tải danh sách sự kiện..." />
        ) : error ? (
          <CustomerErrorState
            message={error}
            onRetry={() => loadConcerts({ search, artist, location, date })}
          />
        ) : concerts.length === 0 ? (
          <CustomerEmptyState
            title="Không tìm thấy sự kiện nào"
            message="Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm của bạn."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concerts.map((concert) => {
              // Calculate summary of remaining tickets
              const totalRemaining = getTicketTotalRemaining(concert.ticketTypes);
              const saleState = getTicketSaleState(concert);

              return (
                <Link
                  key={concert.id}
                  href={`/concert/${concert.id}`}
                  aria-label={`Xem thông tin chi tiết ${concert.title}`}
                  className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-950/20 transition-all duration-300 flex flex-col h-full group"
                >
                  {/* Concert Banner Image */}
                  <div className="h-48 relative overflow-hidden flex flex-col justify-end p-6">
                    <Image
                      src={getConcertImage(concert.title)}
                      alt={concert.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent"></div>
                    <div className="relative z-10 flex items-center gap-1.5 text-xs text-purple-300 font-bold bg-purple-950/60 w-fit px-2.5 py-1 rounded-full border border-purple-800/50">
                      <Music className="w-3 h-3" />
                      LIVE SHOW
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h2 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {concert.title}
                    </h2>
                    <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                      {concert.description || 'Không có mô tả chi tiết cho sự kiện này.'}
                    </p>

                    {/* Metadata indicators */}
                    <div className="space-y-2 text-xs text-gray-400 mb-6">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Nghệ sĩ: <strong className="text-gray-200">{concert.artist}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{new Date(concert.dateTime).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="line-clamp-1">{concert.location}</span>
                      </div>
                    </div>

                    {/* Remaining Tickets status per category */}
                    <div className="mt-auto pt-4 border-t border-gray-800">
                      <div className="flex justify-between items-center mb-3 text-xs">
                        <span className="text-gray-400">Vé còn lại (real-time):</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${getTicketSaleClassName(saleState)}`}>
                          {getTicketSaleLabel(saleState)}
                        </span>
                      </div>
                      <div className="mb-3 flex justify-between text-xs">
                        <span className="text-gray-500">Tổng tồn kho</span>
                        <span className={`font-bold ${totalRemaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {totalRemaining > 0 ? `${totalRemaining} vé` : 'Hết vé'}
                        </span>
                      </div>

                      {/* Small inventory tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {concert.ticketTypes.map((tt) => (
                          <span
                            key={tt.id}
                            className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
                              tt.remaining > 0
                                ? 'bg-gray-800 text-gray-300 border border-gray-700/50'
                                : 'bg-red-950/20 text-red-400/60 border border-red-950/50 line-through'
                            }`}
                          >
                            {tt.name}: {tt.remaining}
                          </span>
                        ))}
                      </div>

                      <span
                        className="block w-full text-center bg-indigo-600 group-hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md group-hover:shadow-lg"
                      >
                        Xem thông tin chi tiết
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
