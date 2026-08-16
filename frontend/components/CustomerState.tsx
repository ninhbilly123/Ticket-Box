import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';

export function CustomerLoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-white">
      <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

export function CustomerErrorState({
  title = 'Đã xảy ra lỗi',
  message,
  actionLabel = 'Thử lại',
  onRetry,
  backHref,
  backLabel = 'Quay lại',
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto my-10 max-w-md rounded-2xl border border-red-900/50 bg-red-950/20 p-6 text-center text-red-200">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
      <h2 className="font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-red-200/80">{message}</p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {onRetry && (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-900 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
            onClick={onRetry}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {actionLabel}
          </button>
        )}
        {backHref && (
          <Link className="inline-flex items-center justify-center rounded-xl border border-red-900/60 px-4 py-2 text-xs font-bold text-red-100 hover:bg-red-950/40" href={backHref}>
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

export function CustomerEmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto my-10 max-w-md rounded-2xl border border-dashed border-gray-800 bg-gray-900 p-10 text-center text-gray-400">
      <SearchX className="mx-auto mb-3 h-10 w-10 text-gray-600" />
      <h2 className="font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
