'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { Concert, GuestImportReport } from '../lib/api';
import { formatStatusLabel } from '../lib/ui-labels';

export function ConcertSelector({
  concerts,
  selectedConcertId,
  onChange,
}: {
  concerts: Concert[];
  selectedConcertId: string;
  onChange: (concertId: string) => void;
}) {
  return (
    <select className="select w-full" onChange={(event) => onChange(event.target.value)} value={selectedConcertId}>
      <option value="">Chọn sự kiện</option>
      {concerts.map((concert) => (
        <option key={concert.id} value={concert.id}>
          {concert.eventCode} · {concert.name}
        </option>
      ))}
    </select>
  );
}

export function EventCodeSelector({
  concerts,
  selected,
  onChange,
}: {
  concerts: Concert[];
  selected: string[];
  onChange: (eventCodes: string[]) => void;
}) {
  if (!concerts.length) return <EmptyState text="Chưa có sự kiện để chọn." />;
  return (
    <div className="max-h-52 space-y-1 overflow-y-auto rounded border border-slate-300 bg-white p-2">
      {concerts.map((concert) => {
        const checked = selected.includes(concert.eventCode);
        return (
          <label key={concert.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-2 hover:bg-slate-50">
            <input
              checked={checked}
              className="mt-0.5 h-4 w-4 accent-cyan-700"
              onChange={() => onChange(checked ? selected.filter((code) => code !== concert.eventCode) : [...selected, concert.eventCode])}
              type="checkbox"
            />
            <span className="min-w-0 text-sm">
              <span className="block font-medium text-slate-800">{concert.eventCode}</span>
              <span className="block truncate text-xs text-slate-500">{concert.name}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function IntegrationPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function StatusPill({ status }: { status: string }) {
  const success = ['ACTIVE', 'SUCCESS', 'SENT', 'PUBLISHED', 'APPROVED', 'VALID'].includes(status);
  const danger = ['INACTIVE', 'FAILED', 'CANCELLED'].includes(status);
  const warning = ['PARTIAL_SUCCESS', 'NO_FILE', 'QUEUED', 'PENDING'].includes(status);
  const processing = ['PROCESSING', 'UPLOADED', 'AI_GENERATED'].includes(status);
  const colors = danger
    ? 'bg-rose-50 text-rose-700'
    : success
      ? 'bg-emerald-50 text-emerald-700'
      : warning
        ? 'bg-amber-50 text-amber-800'
        : processing
          ? 'bg-cyan-50 text-cyan-800'
          : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex max-w-full rounded px-2 py-1 text-xs font-semibold ${colors}`}>{formatStatusLabel(status)}</span>;
}

export function PageMessage({ error, notice }: { error: string | null; notice: string | null }) {
  return <>{error && <InlineError message={error} />}{notice && <InlineSuccess message={notice} />}</>;
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="break-words">{message}</span>
    </div>
  );
}

export function InlineSuccess({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{text}</div>;
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words font-medium">{value}</div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function ImportReportDetail({ detail }: { detail: GuestImportReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-5 sm:grid-cols-3 lg:grid-cols-6">
        <ReportMetric label="Trạng thái" value={<StatusPill status={detail.status} />} />
        <ReportMetric label="Tổng dòng" value={detail.totalRows} />
        <ReportMetric label="Thành công" value={detail.successRows} />
        <ReportMetric label="Trùng" value={detail.duplicateRows} />
        <ReportMetric label="Lỗi" value={detail.errorRows} />
        <ReportMetric label="Email đã gửi" value={detail.emailSentRows} />
      </div>

      {detail.errorMessage && <InlineError message={detail.errorMessage} />}

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Lỗi từng dòng</h4>
        {!detail.rowErrors.length ? (
          <EmptyState text="Báo cáo không có lỗi dữ liệu theo dòng." />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead><tr><th>Dòng</th><th>Mã lỗi</th><th>Thông điệp</th><th>Dữ liệu</th></tr></thead>
              <tbody>
                {detail.rowErrors.map((rowError) => (
                  <tr key={rowError.id}>
                    <td>{rowError.rowNumber}</td>
                    <td><StatusPill status={rowError.errorCode} /></td>
                    <td>{rowError.message}</td>
                    <td><code className="block max-w-[360px] whitespace-pre-wrap break-all text-xs">{JSON.stringify(rowError.rawData)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Khách đã nhập</h4>
        {!detail.vipGuests?.length ? (
          <EmptyState text="Báo cáo không có khách VIP mới." />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[980px]">
              <thead><tr><th>Khách mời</th><th>Liên hệ</th><th>Công ty</th><th>Vé</th><th>Email</th><th>Lỗi email</th></tr></thead>
              <tbody>
                {detail.vipGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="font-medium text-slate-900">{guest.fullName}</td>
                    <td><p>{guest.email || '-'}</p><p className="text-xs text-slate-500">{guest.phone || '-'}</p></td>
                    <td>{guest.company || '-'}</td>
                    <td><StatusPill status={guest.ticketStatus} /></td>
                    <td><StatusPill status={guest.emailStatus} /></td>
                    <td className="max-w-[280px] text-xs text-rose-700">{guest.emailError || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function PaginationControls({
  page,
  pageCount,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>{totalItems} dòng dữ liệu</span>
      <div className="flex items-center gap-2">
        <button className="small-button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} type="button">
          Trước
        </button>
        <span className="min-w-16 text-center font-semibold text-slate-700">{page}/{pageCount}</span>
        <button className="small-button" disabled={page >= pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))} type="button">
          Sau
        </button>
      </div>
    </div>
  );
}

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('vi-VN');
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (Math.max(1, page) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}
