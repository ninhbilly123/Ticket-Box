import React from 'react';
import { AlertTriangle, Check, LucideIcon } from 'lucide-react';
import { formatStatusLabel } from '../lib/ui-labels';

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="input" required={required} type={type} />
    </Field>
  );
}

export function Alert({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

export function Success({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <Check className="mt-0.5 h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

export function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-cyan-700" />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const active = ['ACTIVE', 'ON_SALE', 'PUBLISHED', 'paid'].includes(status);
  const danger = ['DISABLED', 'CANCELLED', 'failed'].includes(status);
  return (
    <span
      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
        danger
          ? 'bg-rose-50 text-rose-700'
          : active
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-700'
      }`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{text}</div>;
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
  if (pageCount <= 1 && totalItems <= 8) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>{totalItems} dòng dữ liệu</span>
      <div className="flex items-center gap-2">
        <button
          className="small-button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          type="button"
        >
          Trước
        </button>
        <span className="min-w-16 text-center font-semibold text-slate-700">
          {page}/{pageCount}
        </span>
        <button
          className="small-button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  actions,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  actions?: React.ReactNode[];
}) {
  if (rows.length === 0) {
    return <EmptyState text="Chưa có dữ liệu." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
            {actions && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
              {actions && <td>{actions[rowIndex]}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
