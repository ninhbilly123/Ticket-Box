'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  RefreshCw,
  Send,
  Upload,
  X,
} from 'lucide-react';
import {
  ArtistBio,
  Concert,
  GuestImportReport,
  SponsorEmail,
  adminApi,
} from '../lib/api';
import { formatStatusLabel } from '../lib/ui-labels';

interface IntegrationProps {
  token: string;
  concerts: Concert[];
}

interface ConcertScopedProps extends IntegrationProps {
  selectedConcertId: string;
  onSelectConcert: (concertId: string) => void;
}

const emptySponsorForm = {
  email: '',
  displayName: '',
  allowedEventCodes: [] as string[],
};

const VIP_REPORT_PAGE_SIZE = 8;

export function SponsorEmailTab({ token, concerts }: IntegrationProps) {
  const [sponsors, setSponsors] = useState<SponsorEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySponsorForm);

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSponsors(await adminApi.listSponsorEmails(token));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSponsors();
  }, [loadSponsors]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function beginEdit(sponsor: SponsorEmail) {
    setEditingId(sponsor.id);
    setForm({
      email: sponsor.email,
      displayName: sponsor.displayName || '',
      allowedEventCodes: sponsor.allowedEventCodes,
    });
    setError(null);
    setNotice(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptySponsorForm);
  }

  async function submitSponsor(event: FormEvent) {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!editingId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email nhãn hàng không đúng định dạng.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editingId) {
        const updated = await adminApi.updateSponsorEmail(token, editingId, {
          displayName: form.displayName.trim() || undefined,
          allowedEventCodes: form.allowedEventCodes,
        });
        setSponsors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setNotice('Đã cập nhật email nhãn hàng.');
      } else {
        const created = await adminApi.createSponsorEmail(token, {
          email,
          displayName: form.displayName.trim() || undefined,
          allowedEventCodes: form.allowedEventCodes,
        });
        setSponsors((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        setNotice('Đã thêm email nhãn hàng.');
      }
      resetForm();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSponsor(sponsor: SponsorEmail) {
    const previous = sponsors;
    setSponsors((current) =>
      current.map((item) => (item.id === sponsor.id ? { ...item, isActive: !item.isActive } : item))
    );
    setError(null);
    setNotice(null);
    try {
      const updated = await adminApi.updateSponsorEmail(token, sponsor.id, {
        isActive: !sponsor.isActive,
      });
      setSponsors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(updated.isActive ? 'Đã kích hoạt email nhãn hàng.' : 'Đã vô hiệu hóa email nhãn hàng.');
    } catch (requestError) {
      setSponsors(previous);
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <div className="space-y-5">
      <PageMessage error={error} notice={notice} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <IntegrationPanel
          title="Email nhãn hàng"
          action={
            <button className="icon-button" onClick={() => void loadSponsors()} title="Tải lại" type="button">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          {loading ? (
            <LoadingState text="Đang tải danh sách email..." />
          ) : sponsors.length === 0 ? (
            <EmptyState text="Chưa có email nhãn hàng nào được cấu hình." />
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nhãn hàng</th>
                    <th>Email</th>
                    <th>Mã eventCode</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsors.map((sponsor) => (
                    <tr key={sponsor.id}>
                      <td className="font-medium text-slate-900">{sponsor.displayName || 'Chưa đặt tên'}</td>
                      <td>{sponsor.email}</td>
                      <td>
                        {sponsor.allowedEventCodes.length ? (
                          <div className="flex max-w-[280px] flex-wrap gap-1">
                            {sponsor.allowedEventCodes.map((code) => (
                              <span key={code} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Tất cả sự kiện</span>
                        )}
                      </td>
                      <td><StatusPill status={sponsor.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="small-button" onClick={() => beginEdit(sponsor)} type="button">
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                          </button>
                          <button
                            className={sponsor.isActive ? 'danger-small-button' : 'small-button'}
                            onClick={() => void toggleSponsor(sponsor)}
                            type="button"
                          >
                            {sponsor.isActive ? 'Tắt' : 'Bật'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </IntegrationPanel>

        <IntegrationPanel title={editingId ? 'Cập nhật email' : 'Thêm email nhãn hàng'}>
          <form className="space-y-4" onSubmit={submitSponsor}>
            <Field label="Email">
              <input
                className="input"
                disabled={Boolean(editingId)}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="partner@example.com"
                type="email"
                value={form.email}
              />
            </Field>
            <Field label="Tên hiển thị">
              <input
                className="input"
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                placeholder="Nhãn hàng A"
                value={form.displayName}
              />
            </Field>
            <Field label="Sự kiện được phép">
              <EventCodeSelector
                concerts={concerts}
                selected={form.allowedEventCodes}
                onChange={(allowedEventCodes) => setForm({ ...form, allowedEventCodes })}
              />
            </Field>
              <p className="text-xs text-slate-500">Không chọn sự kiện nghĩa là email được phép gửi cho mọi eventCode.</p>
            <div className="flex gap-2">
              <button className="primary-button flex-1" disabled={saving} type="submit">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Lưu thay đổi' : 'Thêm email'}
              </button>
              {editingId && (
                <button className="icon-button" onClick={resetForm} title="Hủy chỉnh sửa" type="button">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </IntegrationPanel>
      </div>
    </div>
  );
}

export function ArtistBioTab({ token, concerts, selectedConcertId, onSelectConcert }: ConcertScopedProps) {
  const [artistBio, setArtistBio] = useState<ArtistBio | null>(null);
  const [reviewedBio, setReviewedBio] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestInFlight = useRef<string | null>(null);
  const selectedConcertRef = useRef(selectedConcertId);

  const selectedConcert = concerts.find((concert) => concert.id === selectedConcertId) || null;

  const loadArtistBio = useCallback(async (concertId: string, showLoading = false) => {
    if (!concertId || requestInFlight.current === concertId) return;
    requestInFlight.current = concertId;
    if (showLoading) setLoading(true);
    try {
      const result = await adminApi.getLatestArtistBio(token, concertId);
      if (selectedConcertRef.current !== concertId) return;
      setArtistBio(result);
      setReviewedBio(result?.reviewedBio || result?.generatedBio || '');
      setError(null);
    } catch (requestError) {
      if (selectedConcertRef.current === concertId) setError(getErrorMessage(requestError));
    } finally {
      if (requestInFlight.current === concertId) requestInFlight.current = null;
      if (showLoading && selectedConcertRef.current === concertId) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    selectedConcertRef.current = selectedConcertId;
    setArtistBio(null);
    setReviewedBio('');
    setFile(null);
    setNotice(null);
    setError(null);
    if (selectedConcertId) void loadArtistBio(selectedConcertId, true);
  }, [selectedConcertId, loadArtistBio]);

  useEffect(() => {
    if (!artistBio || !['UPLOADED', 'PROCESSING'].includes(artistBio.status)) return;
    const timer = window.setInterval(() => void loadArtistBio(artistBio.concertId), 3000);
    return () => window.clearInterval(timer);
  }, [artistBio?.id, artistBio?.status, artistBio?.concertId, loadArtistBio]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function selectFile(nextFile: File | null) {
    setError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (nextFile.type !== 'application/pdf' && !nextFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Chỉ chấp nhận tệp PDF.');
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError('Tệp PDF không được vượt quá 10 MB.');
      return;
    }
    setFile(nextFile);
  }

  async function uploadPdf(event: FormEvent) {
    event.preventDefault();
    if (!selectedConcertId || !file) {
      setError('Vui lòng chọn tệp PDF trước khi tải lên.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adminApi.uploadArtistBio(token, selectedConcertId, file);
      setArtistBio(created);
      setReviewedBio('');
      setFile(null);
    setNotice('Đã tải lên PDF. Hệ thống đang tạo tiểu sử.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function reviewBio() {
    if (!artistBio || !reviewedBio.trim()) {
      setError('Nội dung tiểu sử duyệt không được để trống.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminApi.reviewArtistBio(token, artistBio.id, reviewedBio.trim());
      if (!updated) throw new Error('Backend không trả về Artist Bio sau khi phê duyệt.');
      setArtistBio(updated);
      setReviewedBio(updated.reviewedBio || '');
      setNotice('Đã lưu và duyệt nội dung tiểu sử.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function publishBio() {
    if (!artistBio || artistBio.status !== 'APPROVED') return;
    if (!window.confirm('Công khai tiểu sử này trên trang sự kiện?')) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminApi.publishArtistBio(token, artistBio.id);
      if (!updated) throw new Error('Máy chủ không trả về tiểu sử nghệ sĩ sau khi công khai.');
      setArtistBio(updated);
      setReviewedBio(updated.reviewedBio || '');
      setNotice('Tiểu sử đã được công khai.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const isProcessing = artistBio && ['UPLOADED', 'PROCESSING'].includes(artistBio.status);
  const canReview = artistBio && ['AI_GENERATED', 'APPROVED'].includes(artistBio.status);

  return (
    <div className="space-y-5">
      <PageMessage error={error} notice={notice} />
        <IntegrationPanel title="Chọn sự kiện">
        <ConcertSelector
          concerts={concerts}
          selectedConcertId={selectedConcertId}
          onChange={onSelectConcert}
        />
      </IntegrationPanel>

      {!selectedConcert ? (
          <EmptyState text="Chưa có sự kiện để quản lý tiểu sử nghệ sĩ AI." />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-5">
            <IntegrationPanel title="Xử lý hồ sơ nghệ sĩ">
              <form className="space-y-4" onSubmit={uploadPdf}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Mã eventCode" value={selectedConcert.eventCode} />
                  <Info label="Trạng thái" value={artistBio ? formatStatusLabel(artistBio.status) : 'Chưa có'} />
                </div>
                {artistBio && (
                  <div className="border-y border-slate-100 py-3 text-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <StatusPill status={artistBio.status} />
                      <span className="text-xs text-slate-500">{formatDate(artistBio.updatedAt)}</span>
                    </div>
                    <p className="truncate font-medium text-slate-800">{artistBio.sourcePdfFileName || 'PDF hồ sơ nghệ sĩ'}</p>
                  </div>
                )}
                {isProcessing && (
                  <div className="flex items-center gap-2 rounded border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                    <Loader2 className="h-4 w-4 animate-spin" /> AI đang xử lý hồ sơ...
                  </div>
                )}
                {artistBio?.status === 'FAILED' && artistBio.errorMessage && (
                  <InlineError message={artistBio.errorMessage} />
                )}
                <Field label="Tải lên PDF mới">
                  <input
                    accept="application/pdf,.pdf"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                    onChange={(event) => selectFile(event.target.files?.[0] || null)}
                    type="file"
                  />
                </Field>
                <p className="text-xs text-slate-500">PDF tối đa 10 MB. Mỗi lần tải lên sẽ tạo một phiên bản tiểu sử mới.</p>
                <button className="primary-button w-full" disabled={saving || !file} type="submit">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Tải lên và tạo tiểu sử
                </button>
              </form>
            </IntegrationPanel>
          </div>

          <IntegrationPanel title="Nội dung tiểu sử nghệ sĩ">
            {loading ? (
              <LoadingState text="Đang tải tiểu sử nghệ sĩ..." />
            ) : !artistBio ? (
              <EmptyState text="Sự kiện này chưa có tiểu sử nghệ sĩ. Tải lên PDF để bắt đầu." />
            ) : artistBio.status === 'FAILED' ? (
              <EmptyState text="Tiểu sử chưa được tạo thành công. Kiểm tra lỗi và tải lại PDF." />
            ) : isProcessing ? (
              <LoadingState text="Đang trích xuất PDF và tạo nội dung tiếng Việt..." />
            ) : artistBio.status === 'PUBLISHED' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <StatusPill status="PUBLISHED" />
                  <span className="text-xs text-slate-500">Công khai: {formatDate(artistBio.publishedAt)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {artistBio.publishedBio || artistBio.reviewedBio}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusPill status={artistBio.status} />
                  <span className="text-xs text-slate-500">Chỉnh sửa trước khi công khai</span>
                </div>
                <Field label="Tiểu sử đã duyệt">
                  <textarea
                    className="min-h-[320px] w-full resize-y rounded border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    disabled={!canReview}
                    onChange={(event) => setReviewedBio(event.target.value)}
                    value={reviewedBio}
                  />
                </Field>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button className="secondary-button" disabled={saving || !canReview} onClick={() => void reviewBio()} type="button">
                    <CheckCircle2 className="h-4 w-4" /> Lưu và duyệt
                  </button>
                  <button className="primary-button" disabled={saving || artistBio.status !== 'APPROVED'} onClick={() => void publishBio()} type="button">
                    <Send className="h-4 w-4" /> Công khai
                  </button>
                </div>
              </div>
            )}
          </IntegrationPanel>
        </div>
      )}
    </div>
  );
}

export function VipSyncTab({ token }: IntegrationProps) {
  const [reports, setReports] = useState<GuestImportReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GuestImportReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reportQuery, setReportQuery] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [reportPage, setReportPage] = useState(1);
  const filteredReports = useMemo(() => {
    const query = normalizeSearch(reportQuery);
    return reports
      .filter((report) => {
        const matchesQuery =
          !query ||
          normalizeSearch(report.senderEmail || '').includes(query) ||
          normalizeSearch(report.originalFileName || '').includes(query) ||
          normalizeSearch(report.errorMessage || '').includes(query);
        const matchesStatus = reportStatusFilter === 'ALL' || report.status === reportStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [reportQuery, reportStatusFilter, reports]);
  const reportPageCount = Math.max(1, Math.ceil(filteredReports.length / VIP_REPORT_PAGE_SIZE));
  const pagedReports = paginate(filteredReports, reportPage, VIP_REPORT_PAGE_SIZE);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await adminApi.listGuestImportReports(token));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    setReportPage(1);
  }, [reportQuery, reportStatusFilter]);

  useEffect(() => {
    if (reportPage > reportPageCount) setReportPage(reportPageCount);
  }, [reportPage, reportPageCount]);

  useEffect(() => {
    if (!selectedReportId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError(null);
    adminApi.getGuestImportReport(token, selectedReportId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((requestError) => {
        if (active) setDetailError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [selectedReportId, token]);

  return (
    <div className="space-y-5">
      {error && <InlineError message={error} />}
      <IntegrationPanel
        title="Lịch sử đồng bộ VIP"
        action={
          <button className="icon-button" onClick={() => void loadReports()} title="Tải lại" type="button">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      >
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            className="input"
            onChange={(event) => setReportQuery(event.target.value)}
            placeholder="Tìm người gửi, tên file hoặc lỗi"
            value={reportQuery}
          />
          <select className="select" onChange={(event) => setReportStatusFilter(event.target.value)} value={reportStatusFilter}>
            <option value="ALL">Tất cả trạng thái</option>
            {Array.from(new Set(reports.map((report) => report.status))).map((status) => (
              <option key={status} value={status}>{formatStatusLabel(status)}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <LoadingState text="Đang tải báo cáo đồng bộ..." />
        ) : reports.length === 0 ? (
          <EmptyState text="Chưa có lần quét hộp thư hoặc nhập CSV nào." />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[1120px]">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người gửi / Tệp</th>
                  <th>Trạng thái</th>
                  <th>Tổng</th>
                  <th>Thành công</th>
                  <th>Trùng</th>
                  <th>Lỗi</th>
                  <th>Email đã gửi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedReports.map((report) => (
                  <tr key={report.id} className={selectedReportId === report.id ? 'bg-cyan-50' : ''}>
                    <td>{formatDate(report.createdAt)}</td>
                    <td>
                      <div className="max-w-[260px]">
                        <p className="truncate font-medium text-slate-900">{report.senderEmail || 'Hệ thống định kỳ'}</p>
                        <p className="truncate text-xs text-slate-500">{report.originalFileName || 'Không có tệp'}</p>
                      </div>
                    </td>
                    <td><StatusPill status={report.status} /></td>
                    <td>{report.totalRows}</td>
                    <td className="font-medium text-emerald-700">{report.successRows}</td>
                    <td className="text-amber-700">{report.duplicateRows}</td>
                    <td className="text-rose-700">{report.errorRows}</td>
                    <td>{report.emailSentRows}</td>
                    <td>
                      <button className="small-button" onClick={() => setSelectedReportId(report.id)} type="button">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls
          page={reportPage}
          pageCount={reportPageCount}
          totalItems={filteredReports.length}
          onPageChange={setReportPage}
        />
      </IntegrationPanel>

      {selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section className="mt-6 flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Chi tiết lần nhập</h3>
              <button className="icon-button" onClick={() => setSelectedReportId(null)} title="Đóng chi tiết" type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {detailError && <InlineError message={detailError} />}
              {detailLoading || !detail ? (
                <LoadingState text="Đang tải chi tiết báo cáo..." />
              ) : (
                <ImportReportDetail detail={detail} />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ConcertSelector({
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
        <option key={concert.id} value={concert.id}>{concert.eventCode} · {concert.name}</option>
      ))}
    </select>
  );
}

function EventCodeSelector({
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

function IntegrationPanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

function StatusPill({ status }: { status: string }) {
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

function PageMessage({ error, notice }: { error: string | null; notice: string | null }) {
  return <>{error && <InlineError message={error} />}{notice && <InlineSuccess message={notice} />}</>;
}

function InlineError({ message }: { message: string }) {
  return <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-words">{message}</span></div>;
}

function InlineSuccess({ message }: { message: string }) {
  return <div className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}</span></div>;
}

function LoadingState({ text }: { text: string }) {
  return <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{text}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{text}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 break-words font-medium">{value}</div></div>;
}

function ReportMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0"><div className="text-xs font-semibold uppercase text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-slate-900">{value}</div></div>;
}

function ImportReportDetail({ detail }: { detail: GuestImportReport }) {
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

function PaginationControls({
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

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (Math.max(1, page) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}
