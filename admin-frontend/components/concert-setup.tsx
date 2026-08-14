'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  RefreshCw,
  Save,
  Send,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Artist, Concert, ConcertReadiness, adminApi } from '../lib/api';

interface ConcertSetupProps {
  token: string;
  concert: Concert;
  saving: boolean;
  runMutation: (action: () => Promise<unknown>, successMessage: string) => Promise<void>;
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function ConcertSetup({ token, concert, saving, runMutation }: ConcertSetupProps) {
  const [readiness, setReadiness] = useState<ConcertReadiness | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistName, setArtistName] = useState('');
  const [seatMapFile, setSeatMapFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    eventCode: concert.eventCode,
    name: concert.name,
    venue: concert.venue,
    startAt: toLocalDateTime(concert.startAt),
    saleOpenAt: toLocalDateTime(concert.saleOpenAt),
    description: concert.description || '',
    seatMapEnabled: concert.seatMapEnabled,
  });
  const isDraft = concert.status === 'DRAFT';

  const loadSetup = useCallback(async () => {
    setLoading(true);
    try {
      const [nextReadiness, nextArtists] = await Promise.all([
        adminApi.getConcertReadiness(token, concert.id),
        adminApi.listConcertArtists(token, concert.id),
      ]);
      setReadiness(nextReadiness);
      setArtists(nextArtists);
    } finally {
      setLoading(false);
    }
  }, [concert.id, token]);

  useEffect(() => {
    setForm({
      eventCode: concert.eventCode,
      name: concert.name,
      venue: concert.venue,
      startAt: toLocalDateTime(concert.startAt),
      saleOpenAt: toLocalDateTime(concert.saleOpenAt),
      description: concert.description || '',
      seatMapEnabled: concert.seatMapEnabled,
    });
    setSeatMapFile(null);
    void loadSetup();
  }, [
    concert.description,
    concert.eventCode,
    concert.id,
    concert.name,
    concert.saleOpenAt,
    concert.seatMapEnabled,
    concert.startAt,
    concert.status,
    concert.svgSeatingMap,
    concert.venue,
    loadSetup,
  ]);

  async function mutate(action: () => Promise<unknown>, message: string) {
    await runMutation(action, message);
    await loadSetup().catch(() => undefined);
  }

  function submitBasicInfo(event: FormEvent) {
    event.preventDefault();
    const payload = isDraft
      ? {
          eventCode: form.eventCode.trim().toUpperCase(),
          name: form.name.trim(),
          venue: form.venue.trim(),
          startAt: new Date(form.startAt).toISOString(),
          saleOpenAt: new Date(form.saleOpenAt).toISOString(),
          description: form.description.trim(),
          seatMapEnabled: form.seatMapEnabled,
        }
      : { description: form.description.trim() };
    void mutate(
      () => adminApi.updateConcert(token, concert.id, payload),
      'Đã cập nhật cấu hình sự kiện.'
    );
  }

  function submitArtist(event: FormEvent) {
    event.preventDefault();
    if (!artistName.trim()) return;
    void mutate(
      () => adminApi.addConcertArtist(token, concert.id, artistName.trim()),
      'Đã gắn nghệ sĩ.'
    ).then(() => setArtistName(''));
  }

  function submitSeatMap(event: FormEvent) {
    event.preventDefault();
    if (!seatMapFile) return;
    void mutate(
      () => adminApi.uploadSeatMap(token, concert.id, seatMapFile),
      'Đã kiểm tra và lưu sơ đồ SVG.'
    ).then(() => setSeatMapFile(null));
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Sự kiện đang chọn</p>
          <h3 className="text-lg font-semibold">{concert.eventCode} · {concert.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-button" disabled={loading} onClick={() => void loadSetup()} title="Tải lại mức độ sẵn sàng" type="button">
            <RefreshCw className="h-4 w-4" />
          </button>
          {isDraft && (
            <button
              className="primary-button"
              disabled={saving || !readiness?.ready}
              onClick={() => void mutate(() => adminApi.publishConcert(token, concert.id), 'Sự kiện đã được công khai.')}
              type="button"
            >
              <Send className="h-4 w-4" />
              Công khai
            </button>
          )}
        </div>
      </div>

      <section className="border-b border-slate-200 pb-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-semibold">Mức độ sẵn sàng</h4>
          <span className={`rounded px-2 py-1 text-xs font-semibold ${readiness?.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {readiness?.ready ? 'Sẵn sàng công khai' : 'Chưa sẵn sàng'}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {readiness?.checks.map((check) => (
            <div className="flex min-h-20 gap-3 rounded border border-slate-200 bg-slate-50 p-3" key={check.key}>
              {check.status === 'PASS' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${check.status === 'FAIL' ? 'text-rose-600' : 'text-amber-600'}`} />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">{check.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{check.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section>
          <h4 className="mb-3 font-semibold">Thông tin sự kiện</h4>
          <form className="space-y-3" onSubmit={submitBasicInfo}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SetupInput disabled={!isDraft} label="Mã eventCode" onChange={(eventCode) => setForm({ ...form, eventCode })} value={form.eventCode} />
              <SetupInput disabled={!isDraft} label="Tên sự kiện" onChange={(name) => setForm({ ...form, name })} value={form.name} />
            </div>
            <SetupInput disabled={!isDraft} label="Địa điểm" onChange={(venue) => setForm({ ...form, venue })} value={form.venue} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SetupInput disabled={!isDraft} label="Thời gian biểu diễn" onChange={(startAt) => setForm({ ...form, startAt })} type="datetime-local" value={form.startAt} />
              <SetupInput disabled={!isDraft} label="Mở bán" onChange={(saleOpenAt) => setForm({ ...form, saleOpenAt })} type="datetime-local" value={form.saleOpenAt} />
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Mô tả</span>
              <textarea className="input min-h-24" onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} />
            </label>
            <label className="flex items-center justify-between rounded border border-slate-200 px-3 py-2.5">
              <span className="text-sm font-medium">Sử dụng sơ đồ khu vực</span>
              <input
                checked={form.seatMapEnabled}
                className="h-4 w-4 accent-cyan-700"
                disabled={!isDraft}
                onChange={(event) => setForm({ ...form, seatMapEnabled: event.target.checked })}
                type="checkbox"
              />
            </label>
            <button className="primary-button w-full" disabled={saving} type="submit">
              <Save className="h-4 w-4" />
              Lưu cấu hình
            </button>
          </form>
        </section>

        <div className="space-y-5">
          <section className="border-b border-slate-200 pb-5">
            <h4 className="mb-3 font-semibold">Nghệ sĩ</h4>
            <div className="mb-3 flex flex-wrap gap-2">
              {artists.length ? artists.map((artist) => (
                <span className="inline-flex items-center gap-2 rounded bg-slate-100 px-2.5 py-1.5 text-sm" key={artist.id}>
                  {artist.name}
                  {isDraft && (
                    <button
                      className="text-slate-500 hover:text-rose-600"
                      onClick={() => void mutate(() => adminApi.removeConcertArtist(token, concert.id, artist.id), 'Đã gỡ nghệ sĩ.')}
                      title="Gỡ nghệ sĩ"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              )) : <span className="text-sm text-slate-500">Chưa có nghệ sĩ.</span>}
            </div>
            {isDraft && (
              <form className="flex gap-2" onSubmit={submitArtist}>
                <input className="input min-w-0 flex-1" onChange={(event) => setArtistName(event.target.value)} placeholder="Tên nghệ sĩ" value={artistName} />
                <button className="icon-button" disabled={saving || !artistName.trim()} title="Thêm nghệ sĩ" type="submit">
                  <UserPlus className="h-4 w-4" />
                </button>
              </form>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">Sơ đồ SVG</h4>
              {isDraft && concert.svgSeatingMap && (
                <button
                  className="danger-small-button"
                  onClick={() => void mutate(() => adminApi.deleteSeatMap(token, concert.id), 'Đã xóa sơ đồ SVG.')}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              )}
            </div>
            {isDraft && (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitSeatMap}>
                <input
                  accept="image/svg+xml,.svg"
                  className="input min-w-0 flex-1 py-2"
                  onChange={(event) => setSeatMapFile(event.target.files?.[0] || null)}
                  type="file"
                />
                <button className="primary-button" disabled={saving || !seatMapFile} type="submit">
                  <FileUp className="h-4 w-4" />
                  Tải lên
                </button>
              </form>
            )}
            {concert.svgSeatingMap?.trim().startsWith('<svg') ? (
              <div className="mt-3 aspect-[4/3] overflow-hidden rounded border border-slate-200 bg-slate-950 p-3 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: concert.svgSeatingMap }} />
            ) : (
              <div className="mt-3 flex aspect-[4/1] items-center justify-center rounded border border-dashed border-slate-300 text-sm text-slate-500">
                Chưa có SVG hợp lệ.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SetupInput({
  disabled,
  label,
  onChange,
  type = 'text',
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input className="input disabled:bg-slate-100" disabled={disabled} onChange={(event) => onChange(event.target.value)} required type={type} value={value} />
    </label>
  );
}
