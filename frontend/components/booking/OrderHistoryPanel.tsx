import { History } from 'lucide-react';
import { TicketHistoryItem } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/format';

interface OrderHistoryPanelProps {
  sessionAvailable: boolean;
  history: TicketHistoryItem[];
  loading: boolean;
  onReload: () => void;
}

export default function OrderHistoryPanel({
  sessionAvailable,
  history,
  loading,
  onReload,
}: OrderHistoryPanelProps) {
  return (
    <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          Lịch sử đơn hàng
        </h3>
        <button
          type="button"
          onClick={onReload}
          disabled={!sessionAvailable || loading}
          className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-white"
        >
          Tải
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {!sessionAvailable ? (
          <p className="text-xs text-gray-500">Đăng nhập để xem lịch sử.</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-500">Chưa có dữ liệu lịch sử.</p>
        ) : (
          history.map((item) => (
            <div key={item.orderId} className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{item.concertName}</p>
                  <p className="text-gray-500 mt-0.5">{formatDateTime(item.createdAt)}</p>
                </div>
                <span className="font-bold text-indigo-300">{item.status}</span>
              </div>
              <div className="mt-2 flex justify-between text-gray-400">
                <span>{item.tickets.length} vé</span>
                <span className="font-bold text-white">{formatCurrency(item.totalAmount)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
