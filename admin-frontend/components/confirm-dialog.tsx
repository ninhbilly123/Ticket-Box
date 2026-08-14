'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

type ConfirmTone = 'default' | 'danger';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => Promise<void> | void;
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const openConfirm = useCallback((nextRequest: ConfirmRequest) => {
    setRequest(nextRequest);
  }, []);

  const closeConfirm = useCallback(() => {
    if (!busy) setRequest(null);
  }, [busy]);

  const handleConfirm = useCallback(async () => {
    if (!request) return;
    setBusy(true);
    try {
      await request.onConfirm();
      setRequest(null);
    } finally {
      setBusy(false);
    }
  }, [request]);

  const dialog = useMemo(
    () => (
      <ConfirmDialog
        busy={busy}
        request={request}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      />
    ),
    [busy, closeConfirm, handleConfirm, request]
  );

  return { confirm: openConfirm, dialog };
}

function ConfirmDialog({
  busy,
  request,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  request: ConfirmRequest | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!request) return null;

  const isDanger = request.tone === 'danger';
  const confirmClass = isDanger
    ? 'inline-flex items-center justify-center gap-2 rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
    : 'primary-button';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <section
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${isDanger ? 'bg-rose-50 text-rose-700' : 'bg-cyan-50 text-cyan-700'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{request.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{request.message}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="secondary-button" disabled={busy} onClick={onCancel} type="button">
            {request.cancelLabel || 'Hủy'}
          </button>
          <button className={confirmClass} disabled={busy} onClick={onConfirm} type="button">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {request.confirmLabel || 'Xác nhận'}
          </button>
        </div>
      </section>
    </div>
  );
}
