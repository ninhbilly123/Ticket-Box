'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BadgeCheck, Clock3, RefreshCw, ShieldCheck, Ticket, Users } from 'lucide-react';
import { CheckinStats, Concert, StaffAssignment, adminApi } from '../lib/api';

interface CheckinMonitorProps {
  token: string;
  concert: Concert | null;
  staffAssignments: StaffAssignment[];
}

export default function CheckinMonitor({ token, concert, staffAssignments }: CheckinMonitorProps) {
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const concertId = concert?.id || '';

  const gateCount = useMemo(
    () => new Set(staffAssignments.map((assignment) => assignment.gateId)).size,
    [staffAssignments]
  );
  const remainingTickets = Math.max(0, (stats?.totalTickets || 0) - (stats?.checkedInTickets || 0));
  const sortedTicketTypes = useMemo(
    () =>
      Object.entries(stats?.byTicketType || {}).sort(([left], [right]) =>
        left.localeCompare(right, 'vi')
      ),
    [stats?.byTicketType]
  );

  const loadStats = useCallback(async () => {
    if (!token || !concertId) return;

    setLoading(true);
    setError(null);
    try {
      const nextStats = await adminApi.fetchAdminCheckinStats(token, concertId);
      setStats(nextStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thống kê check-in.');
    } finally {
      setLoading(false);
    }
  }, [concertId, token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (!concert) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Chưa có sự kiện để theo dõi.
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in monitor</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{concert.name}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {concert.eventCode} · {concert.venue} · {new Date(concert.startAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <button
            onClick={() => void loadStats()}
            disabled={loading}
            className="secondary-button"
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MonitorStat label="Đã soát" value={stats?.checkedInTickets || 0} icon={BadgeCheck} />
        <MonitorStat label="Tổng vé bán" value={stats?.totalTickets || 0} icon={Ticket} />
        <MonitorStat label="Còn lại" value={remainingTickets} icon={Clock3} />
        <MonitorStat label="Cổng phân công" value={gateCount} icon={Users} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Tiến độ vào cổng</h3>
            <span className="text-sm font-semibold text-cyan-700">{stats?.percent || 0}%</span>
          </div>
        </div>
        <div className="p-4">
          <div className="h-3 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded bg-cyan-700 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, stats?.percent || 0))}%` }}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hạng vé</th>
                  <th>Đã soát</th>
                  <th>Tổng</th>
                  <th>Tỉ lệ</th>
                </tr>
              </thead>
              <tbody>
                {sortedTicketTypes.map(([name, row]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{row.checkedIn}</td>
                    <td>{row.total}</td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!sortedTicketTypes.length && (
              <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Chưa có dữ liệu check-in cho sự kiện này.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Nhân viên và cổng phụ trách</h3>
        </div>
        <div className="p-4">
          {staffAssignments.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {staffAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-start gap-3 rounded border border-slate-200 p-3 text-sm"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-700" />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {assignment.staff?.fullName || assignment.staffId}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {assignment.staff?.email || '-'} · {assignment.gateId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Chưa phân công nhân viên soát vé cho sự kiện này.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MonitorStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-cyan-700" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
