'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Mic2,
  Music,
} from 'lucide-react';
import { CustomerErrorState, CustomerLoadingState } from '../../../../components/CustomerState';
import { Concert, fetchConcertById } from '../../../../lib/api';
import { getConcertImage, getMinimumTicketPrice, getTicketSaleClassName, getTicketSaleLabel, getTicketSaleState } from '../../../../lib/concert-assets';
import { formatCurrency, formatDateTime } from '../../../../lib/format';

export default function ConcertDetailPage() {
  const params = useParams();
  const concertId = params.id as string;
  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConcert() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchConcertById(concertId);
        if (active) setConcert(data);
      } catch (err) {
        if (active) setError((err as Error).message || 'Không thể tải thông tin concert.');
      } finally {
        if (active) setLoading(false);
      }
    }

    if (concertId) loadConcert();
    return () => {
      active = false;
    };
  }, [concertId]);

  const ticketSummary = useMemo(() => {
    if (!concert?.ticketTypes.length) return null;

    return {
      minimumPrice: getMinimumTicketPrice(concert.ticketTypes) || 0,
      remaining: concert.ticketTypes.reduce((total, ticketType) => total + ticketType.remaining, 0),
      typeCount: concert.ticketTypes.length,
    };
  }, [concert]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-6 py-12">
        <CustomerLoadingState text="Đang tải thông tin concert..." />
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="min-h-screen bg-gray-950 px-6 py-12 text-white">
        <CustomerErrorState
          title="Không thể mở concert"
          message={error || 'Không tìm thấy concert.'}
          backHref="/"
          backLabel="Quay lại danh sách"
        />
      </div>
    );
  }

  const artistBio = concert.artistBio?.trim();
  const saleState = getTicketSaleState(concert);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      <div className="max-w-3xl mx-auto px-6 py-6 border-b border-gray-900">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Title Section */}
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white break-words">{concert.title}</h1>
        </div>

        {/* Concert Banner Image */}
        <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden relative border border-gray-800 shadow-2xl">
          <Image
            src={getConcertImage(concert.title)}
            alt={concert.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
        </div>

        {/* Other Details Section */}
        <div className="bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Mô tả sự kiện</h2>
            <p className="text-sm md:text-base text-gray-400 leading-relaxed whitespace-pre-line break-words">
              {concert.description || 'Concert chưa có mô tả.'}
            </p>
          </div>

          <dl className="pt-6 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex gap-3 min-w-0">
              <Music className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <dt className="text-[10px] uppercase text-gray-500">Nghệ sĩ</dt>
                <dd className="mt-1 text-sm font-semibold text-white break-words">{concert.artist}</dd>
              </div>
            </div>
            <div className="flex gap-3 min-w-0">
              <Calendar className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <dt className="text-[10px] uppercase text-gray-500">Thời gian</dt>
                <dd className="mt-1 text-sm font-semibold text-white">{formatDateTime(concert.dateTime)}</dd>
              </div>
            </div>
            <div className="flex gap-3 min-w-0">
              <MapPin className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <dt className="text-[10px] uppercase text-gray-500">Địa điểm</dt>
                <dd className="mt-1 text-sm font-semibold text-white break-words">{concert.location}</dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Ticket Summary Section (Centered) */}
        {ticketSummary ? (
          <div className="mx-auto max-w-2xl bg-gray-900/60 p-5 rounded-2xl border border-gray-800 text-center shadow-md">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 sm:divide-x sm:divide-gray-800">
              <div>
                <dt className="text-gray-500 text-xs uppercase mb-1">Số lượng loại vé</dt>
                <dd className="font-semibold text-white text-base">{ticketSummary.typeCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs uppercase mb-1">Giá chỉ từ</dt>
                <dd className="font-bold text-indigo-400 text-base">{formatCurrency(ticketSummary.minimumPrice)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs uppercase mb-1">Số vé còn lại</dt>
                <dd className="font-semibold text-white text-base">{ticketSummary.remaining}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs uppercase mb-1">Trạng thái</dt>
                <dd className={`mx-auto inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${getTicketSaleClassName(saleState)}`}>
                  {getTicketSaleLabel(saleState)}
                </dd>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">Chưa có thông tin vé.</p>
        )}

        {concert.ticketTypes.length > 0 && (
          <section className="bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Bảng giá vé</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-3 pr-4">Loại vé</th>
                    <th className="py-3 pr-4">Khu vực</th>
                    <th className="py-3 pr-4">Giá</th>
                    <th className="py-3 pr-4">Còn lại</th>
                    <th className="py-3 pr-4">Giới hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {concert.ticketTypes.map((ticketType) => (
                    <tr key={ticketType.id}>
                      <td className="py-3 pr-4 font-bold text-white">{ticketType.name}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs font-bold text-gray-300">
                          {ticketType.zoneCode}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-indigo-300">{formatCurrency(ticketType.price)}</td>
                      <td className={`py-3 pr-4 font-bold ${ticketType.remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ticketType.remaining > 0 ? `${ticketType.remaining} vé` : 'Hết vé'}
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{ticketType.maxLimitPerUser} vé/tài khoản</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Booking Button (Centered with pulse) */}
        <div className="flex justify-center">
          <Link
            href={`/concert/${concert.id}/booking`}
            className="animate-ticketbox-slow-pulse w-full max-w-sm min-h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 transform"
          >
            Đặt vé ngay
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Artist Bio (Optional) */}
        {artistBio && (
          <section className="bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg md:text-xl font-bold text-white mb-5 flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-indigo-400 shrink-0" />
              Giới thiệu nghệ sĩ
            </h2>
            <p className="text-sm md:text-base text-gray-300 leading-7 whitespace-pre-line break-words">
              {artistBio}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
