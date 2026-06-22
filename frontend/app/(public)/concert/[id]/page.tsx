'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Mic2,
  Music,
  Ticket,
} from 'lucide-react';
import { Concert, fetchConcertById } from '../../../../lib/api';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number) {
  return `${Number(value).toLocaleString('vi-VN')} đ`;
}

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
      minimumPrice: Math.min(...concert.ticketTypes.map((ticketType) => Number(ticketType.price))),
      remaining: concert.ticketTypes.reduce((total, ticketType) => total + ticketType.remaining, 0),
      typeCount: concert.ticketTypes.length,
    };
  }, [concert]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Đang tải thông tin concert...</p>
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
        <h1 className="text-xl font-bold mb-2">Không thể mở concert</h1>
        <p className="text-sm text-gray-400 max-w-sm mb-6">{error || 'Không tìm thấy concert.'}</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const artistBio = concert.artistBio?.trim();

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      <div className="max-w-6xl mx-auto px-6 py-6 border-b border-gray-900">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <article className="lg:col-span-8 min-w-0 bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-xl">
            <p className="text-xs font-bold uppercase text-indigo-400 mb-3">Thông tin concert</p>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white break-words">{concert.title}</h1>
            <p className="mt-5 text-sm md:text-base text-gray-400 leading-relaxed whitespace-pre-line break-words">
              {concert.description || 'Concert chưa có mô tả.'}
            </p>

            <dl className="mt-8 pt-6 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-6">
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
        </article>

        <aside className="lg:col-span-4 lg:row-span-2 lg:sticky lg:top-6 bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl min-w-0">
          <div className="flex items-center gap-2 text-white">
            <Ticket className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold">Vé tham dự</h2>
          </div>

          {ticketSummary ? (
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-500">Loại vé</dt>
                <dd className="font-semibold text-white">{ticketSummary.typeCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-500">Giá từ</dt>
                <dd className="font-bold text-indigo-400">{formatCurrency(ticketSummary.minimumPrice)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-gray-800 pt-4">
                <dt className="text-gray-500">Vé còn lại</dt>
                <dd className="font-semibold text-white">{ticketSummary.remaining}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-5 text-sm text-gray-500">Chưa có thông tin vé.</p>
          )}

          <Link
            href={`/concert/${concert.id}/booking`}
            className="mt-7 w-full min-h-12 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            Đặt vé
            <ArrowRight className="w-4 h-4" />
          </Link>
        </aside>

        {artistBio && (
          <section className="lg:col-span-8 min-w-0 bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-800 shadow-xl">
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
