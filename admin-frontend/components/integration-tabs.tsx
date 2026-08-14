'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { useConfirmDialog } from './confirm-dialog';
import {
  ConcertSelector,
  EmptyState,
  EventCodeSelector,
  Field,
  formatDate,
  getErrorMessage,
  ImportReportDetail,
  Info,
  InlineError,
  IntegrationPanel,
  LoadingState,
  PageMessage,
  paginate,
  PaginationControls,
  StatusPill,
  normalizeSearch,
} from './integration-ui';

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
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
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
  }, [artistBio, loadArtistBio]);

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

  function publishBio() {
    if (!artistBio || artistBio.status !== 'APPROVED') return;
    confirm({
      title: 'Công khai tiểu sử',
      message: 'Tiểu sử đã duyệt sẽ hiển thị trên trang sự kiện cho khách hàng.',
      confirmLabel: 'Công khai',
      onConfirm: publishApprovedBio,
    });
  }

  async function publishApprovedBio() {
    if (!artistBio || artistBio.status !== 'APPROVED') return;
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
      {confirmDialog}
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
                  <button className="primary-button" disabled={saving || artistBio.status !== 'APPROVED'} onClick={publishBio} type="button">
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
