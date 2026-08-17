'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Check,
  ClipboardList,
  KeyRound,
  Pencil,
  LogOut,
  RefreshCw,
  Shield,
  Ticket,
  Trash2,
  X,
  Users,
} from 'lucide-react';
import {
  AuthSession,
  Concert,
  RevenueSummary,
  StaffUser,
  StaffAssignment,
  TicketType,
  ADMIN_SESSION_CHANGED_EVENT,
  adminApi,
  clearStoredAdminSession,
  formatMoney,
  readStoredAdminSession,
  writeStoredAdminSession,
} from '../lib/api';
import { ArtistBioTab, SponsorEmailTab, VipSyncTab } from '../components/integration-tabs';
import { Alert, DataTable, EmptyState, Field, Info, PaginationControls, Panel, Stat, StatusBadge, Success, TextInput } from '../components/admin-ui';
import CheckinMonitor from '../components/checkin-monitor';
import ConcertSetup from '../components/concert-setup';
import { formatRoleLabel, formatStatusLabel } from '../lib/ui-labels';
import { useConfirmDialog } from '../components/confirm-dialog';
import {
  activeTitle,
  compareConcerts,
  compareRevenueRows,
  compareStaffAssignments,
  compareTicketTypes,
  CONCERT_PAGE_SIZE,
  emptyConcertForm,
  emptyStaffUserForm,
  emptyTicketTypeForm,
  formatDate,
  getErrorMessage,
  normalizeSearch,
  paginate,
  REVENUE_PAGE_SIZE,
  STAFF_PAGE_SIZE,
  tabs,
  TICKET_PAGE_SIZE,
  toDateTimeInput,
  type TabKey,
} from '../lib/admin-dashboard-utils';

export default function AdminHomePage() {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState('');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [loginForm, setLoginForm] = useState({
    email: process.env.NEXT_PUBLIC_ADMIN_DEMO_EMAIL || '',
    password: '',
  });
  const [concertForm, setConcertForm] = useState(emptyConcertForm);
  const [concertFormError, setConcertFormError] = useState<string | null>(null);
  const [ticketTypeForm, setTicketTypeForm] = useState(emptyTicketTypeForm);
  const [editingTicketTypeId, setEditingTicketTypeId] = useState<string | null>(null);
  const [ticketTypeFormError, setTicketTypeFormError] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({ staffId: '', gateId: 'GATE-A' });
  const [staffUserForm, setStaffUserForm] = useState(emptyStaffUserForm);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [cancelReason] = useState('Ban tổ chức hủy sự kiện');
  const [concertQuery, setConcertQuery] = useState('');
  const [concertStatusFilter, setConcertStatusFilter] = useState('ALL');
  const [concertSort, setConcertSort] = useState('startAt-asc');
  const [concertPage, setConcertPage] = useState(1);
  const [ticketQuery, setTicketQuery] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');
  const [ticketSort, setTicketSort] = useState('price-desc');
  const [ticketPage, setTicketPage] = useState(1);
  const [staffQuery, setStaffQuery] = useState('');
  const [staffGateFilter, setStaffGateFilter] = useState('ALL');
  const [staffSort, setStaffSort] = useState('createdAt-desc');
  const [staffPage, setStaffPage] = useState(1);
  const [revenueQuery, setRevenueQuery] = useState('');
  const [revenueSort, setRevenueSort] = useState('revenue-desc');
  const [revenuePage, setRevenuePage] = useState(1);

  const token = session?.accessToken || '';
  const selectedConcert = useMemo(
    () => concerts.find((concert) => concert.id === selectedConcertId) || concerts[0] || null,
    [concerts, selectedConcertId]
  );
  const isOrganizer = session?.user.role === 'ORGANIZER';
  const filteredConcerts = useMemo(() => {
    const query = normalizeSearch(concertQuery);
    const rows = concerts.filter((concert) => {
      const matchesQuery =
        !query ||
        normalizeSearch(concert.name).includes(query) ||
        normalizeSearch(concert.eventCode).includes(query) ||
        normalizeSearch(concert.venue).includes(query);
      const matchesStatus = concertStatusFilter === 'ALL' || concert.status === concertStatusFilter;
      return matchesQuery && matchesStatus;
    });

    return rows.sort((left, right) => compareConcerts(left, right, concertSort));
  }, [concertQuery, concertSort, concertStatusFilter, concerts]);
  const concertPageCount = Math.max(1, Math.ceil(filteredConcerts.length / CONCERT_PAGE_SIZE));
  const pagedConcerts = paginate(filteredConcerts, concertPage, CONCERT_PAGE_SIZE);
  const filteredTicketTypes = useMemo(() => {
    const query = normalizeSearch(ticketQuery);
    const rows = ticketTypes.filter((ticketType) => {
      const matchesQuery =
        !query ||
        normalizeSearch(ticketType.name).includes(query) ||
        normalizeSearch(ticketType.zoneCode).includes(query);
      const matchesStatus = ticketStatusFilter === 'ALL' || ticketType.status === ticketStatusFilter;
      return matchesQuery && matchesStatus;
    });

    return rows.sort((left, right) => compareTicketTypes(left, right, ticketSort));
  }, [ticketQuery, ticketSort, ticketStatusFilter, ticketTypes]);
  const ticketPageCount = Math.max(1, Math.ceil(filteredTicketTypes.length / TICKET_PAGE_SIZE));
  const pagedTicketTypes = paginate(filteredTicketTypes, ticketPage, TICKET_PAGE_SIZE);
  const filteredStaffAssignments = useMemo(() => {
    const query = normalizeSearch(staffQuery);
    const rows = staffAssignments.filter((item) => {
      const matchesQuery =
        !query ||
        normalizeSearch(item.staff?.fullName || item.staffId).includes(query) ||
        normalizeSearch(item.staff?.email || '').includes(query) ||
        normalizeSearch(item.gateId).includes(query);
      const matchesGate = staffGateFilter === 'ALL' || item.gateId === staffGateFilter;
      return matchesQuery && matchesGate;
    });

    return rows.sort((left, right) => compareStaffAssignments(left, right, staffSort));
  }, [staffAssignments, staffGateFilter, staffQuery, staffSort]);
  const staffGateOptions = useMemo(
    () => Array.from(new Set(staffAssignments.map((item) => item.gateId))).sort((left, right) => left.localeCompare(right, 'vi')),
    [staffAssignments]
  );
  const staffPageCount = Math.max(1, Math.ceil(filteredStaffAssignments.length / STAFF_PAGE_SIZE));
  const pagedStaffAssignments = paginate(filteredStaffAssignments, staffPage, STAFF_PAGE_SIZE);
  const filteredRevenueRows = useMemo(() => {
    const query = normalizeSearch(revenueQuery);
    const rows = Object.entries(revenue?.byTicketType || {})
      .map(([name, value]) => ({
        name,
        quantity: value.quantity,
        revenue: value.revenue,
      }))
      .filter((row) => !query || normalizeSearch(row.name).includes(query));

    return rows.sort((left, right) => compareRevenueRows(left, right, revenueSort));
  }, [revenue?.byTicketType, revenueQuery, revenueSort]);
  const revenuePageCount = Math.max(1, Math.ceil(filteredRevenueRows.length / REVENUE_PAGE_SIZE));
  const pagedRevenueRows = paginate(filteredRevenueRows, revenuePage, REVENUE_PAGE_SIZE);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [concertList, staffList] = await Promise.all([
        adminApi.listConcerts(token),
        adminApi.listStaff(token),
      ]);
      setConcerts(concertList);
      setStaffUsers(staffList);
      setSelectedConcertId((current) => current || concertList[0]?.id || '');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadConcertScoped = useCallback(async (concertId: string) => {
    if (!token || !concertId) return;
    try {
      const [ticketTypeList, assignmentList, revenueData] = await Promise.all([
        adminApi.listTicketTypes(token, concertId),
        adminApi.listStaffAssignments(token, concertId),
        adminApi.revenueSummary(token, concertId),
      ]);
      setTicketTypes(ticketTypeList);
      setStaffAssignments(assignmentList);
      setRevenue(revenueData);
      setInventoryDrafts(
        Object.fromEntries(ticketTypeList.map((item) => [item.id, String(item.inventory?.totalQuantity || item.totalQuantity)]))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [token]);

  useEffect(() => {
    const syncSessionFromStorage = () => {
      setSession(readStoredAdminSession());
    };

    window.addEventListener(ADMIN_SESSION_CHANGED_EVENT, syncSessionFromStorage);

    const parsed = readStoredAdminSession();
    if (!parsed) {
      return () => window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, syncSessionFromStorage);
    }

    adminApi.me(parsed.accessToken)
      .then((user) => {
        const latest = readStoredAdminSession() || parsed;
        setSession({ ...latest, user });
      })
      .catch(() => {
        const refreshed = readStoredAdminSession();
        if (refreshed && refreshed.accessToken !== parsed.accessToken) {
          setSession(refreshed);
          return;
        }
        clearStoredAdminSession();
      });

    return () => window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, syncSessionFromStorage);
  }, []);

  useEffect(() => {
    if (session && isOrganizer) {
      void loadAll();
    }
  }, [isOrganizer, loadAll, session]);

  useEffect(() => {
    if (session && selectedConcert?.id) {
      void loadConcertScoped(selectedConcert.id);
    }
  }, [loadConcertScoped, selectedConcert?.id, session]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setConcertPage(1);
  }, [concertQuery, concertStatusFilter, concertSort]);

  useEffect(() => {
    if (concertPage > concertPageCount) setConcertPage(concertPageCount);
  }, [concertPage, concertPageCount]);

  useEffect(() => {
    setTicketPage(1);
  }, [selectedConcert?.id, ticketQuery, ticketStatusFilter, ticketSort]);

  useEffect(() => {
    if (ticketPage > ticketPageCount) setTicketPage(ticketPageCount);
  }, [ticketPage, ticketPageCount]);

  useEffect(() => {
    setStaffPage(1);
  }, [selectedConcert?.id, staffGateFilter, staffQuery, staffSort]);

  useEffect(() => {
    if (staffPage > staffPageCount) setStaffPage(staffPageCount);
  }, [staffPage, staffPageCount]);

  useEffect(() => {
    setRevenuePage(1);
  }, [selectedConcert?.id, revenueQuery, revenueSort]);

  useEffect(() => {
    if (revenuePage > revenuePageCount) setRevenuePage(revenuePageCount);
  }, [revenuePage, revenuePageCount]);

  useEffect(() => {
    resetTicketTypeForm();
  }, [selectedConcert?.id]);

  // Hàm này sẽ được gọi khi user submit form login, nó sẽ gọi API login để lấy session mới và lưu vào localStorage và state, nếu có lỗi sẽ hiển thị lỗi ra UI
  // trong một session là gồm accessToken, refreshToken, user (id, email, fullName, role, organizationId)
  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextSession = await adminApi.login(loginForm.email, loginForm.password);
      writeStoredAdminSession(nextSession);
      setSession(nextSession);
      setNotice(`Đã đăng nhập với vai trò ${formatRoleLabel(nextSession.user.role)}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Gọi hàm này khi user đăng xuất hoặc khi token hết hạn để xóa session và các dữ liệu liên quan khỏi state
  // Khi gọi hàm này thì refreshtoken cũng sẽ được invalid ở backend nên sẽ không thể sử dụng để lấy access token mới nữa, và access token cũ nếu còn thời hạn sẽ bị xóa khỏi localStorage nên sẽ không thể sử dụng để gọi API nữa.
  async function handleLogout() {
    if (session?.refreshToken) {
      await adminApi.logout(session.refreshToken).catch(() => undefined);
    }
    clearStoredAdminSession();
    setSession(null);
    setConcerts([]);
    setSelectedConcertId('');
  }

  async function handleStaffPasswordChange(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setPasswordError(null);
    setPasswordNotice(null);

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setChangingPassword(true);
    try {
      await adminApi.changePassword(token, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordNotice('Đã đổi mật khẩu.');
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  }

  async function runMutation(action: () => Promise<unknown>, successMessage: string) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
      await loadAll();
      if (selectedConcert?.id) {
        await loadConcertScoped(selectedConcert.id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function resetTicketTypeForm() {
    setEditingTicketTypeId(null);
    setTicketTypeForm(emptyTicketTypeForm);
    setTicketTypeFormError(null);
  }

  function beginEditTicketType(ticketType: TicketType) {
    setEditingTicketTypeId(ticketType.id);
    setTicketTypeForm({
      name: ticketType.name,
      zoneCode: ticketType.zoneCode,
      price: String(ticketType.price),
      totalQuantity: String(ticketType.inventory?.totalQuantity ?? ticketType.totalQuantity),
      maxPerAccount: String(ticketType.maxPerAccount),
      saleOpenAt: toDateTimeInput(ticketType.saleOpenAt),
      saleCloseAt: toDateTimeInput(ticketType.saleCloseAt),
      status: ticketType.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
    setTicketTypeFormError(null);
  }

  function validateTicketTypeForm() {
    const name = ticketTypeForm.name.trim();
    const zoneCode = ticketTypeForm.zoneCode.trim().toUpperCase();
    if (!name || !zoneCode) {
      return 'Tên loại vé và mã khu vực là bắt buộc.';
    }
    const duplicate = ticketTypes.find(
      (item) =>
        item.id !== editingTicketTypeId &&
        (item.name.trim().toLocaleLowerCase('vi-VN') === name.toLocaleLowerCase('vi-VN') ||
          item.zoneCode.trim().toUpperCase() === zoneCode)
    );
    if (duplicate) {
      return `Loại vé hoặc mã khu vực đã tồn tại (${duplicate.name} / ${duplicate.zoneCode}).`;
    }
    if (Number(ticketTypeForm.price) < 0 || Number(ticketTypeForm.totalQuantity) < 0 || Number(ticketTypeForm.maxPerAccount) <= 0) {
      return 'Giá, số lượng và giới hạn mua phải hợp lệ.';
    }
    return null;
  }

  function submitTicketType(event: FormEvent) {
    event.preventDefault();
    if (!selectedConcert) return;

    const validationError = validateTicketTypeForm();
    if (validationError) {
      setTicketTypeFormError(validationError);
      return;
    }

    setTicketTypeFormError(null);
    const zoneCode = ticketTypeForm.zoneCode.trim().toUpperCase();
    const totalQuantity = Number(ticketTypeForm.totalQuantity);
    const saleOpenAt = ticketTypeForm.saleOpenAt ? new Date(ticketTypeForm.saleOpenAt).toISOString() : undefined;
    const saleCloseAt = ticketTypeForm.saleCloseAt ? new Date(ticketTypeForm.saleCloseAt).toISOString() : undefined;

    void runMutation(
      async () => {
        if (editingTicketTypeId) {
          const current = ticketTypes.find((item) => item.id === editingTicketTypeId);
          await adminApi.updateTicketType(token, editingTicketTypeId, {
            name: ticketTypeForm.name.trim(),
            zoneCode,
            price: Number(ticketTypeForm.price),
            maxPerAccount: Number(ticketTypeForm.maxPerAccount),
            saleOpenAt: saleOpenAt || null,
            saleCloseAt: saleCloseAt || null,
            status: ticketTypeForm.status,
          });
          const currentTotal = current?.inventory?.totalQuantity ?? current?.totalQuantity;
          if (currentTotal !== totalQuantity) {
            await adminApi.updateInventory(token, editingTicketTypeId, totalQuantity);
          }
        } else {
          await adminApi.createTicketType(token, selectedConcert.id, {
            name: ticketTypeForm.name.trim(),
            zoneCode,
            price: Number(ticketTypeForm.price),
            totalQuantity,
            maxPerAccount: Number(ticketTypeForm.maxPerAccount),
            saleOpenAt,
            saleCloseAt,
          });
        }
        resetTicketTypeForm();
      },
      editingTicketTypeId ? 'Đã cập nhật thông tin loại vé.' : 'Đã tạo loại vé và tồn kho.'
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#eef3f8] px-6 py-10 text-slate-900">
        <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl grid-cols-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-between bg-slate-950 p-10 text-white">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded bg-cyan-500 text-slate-950">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">TicketBox Quản trị</h1>
                  <p className="text-sm text-slate-400">Cổng vận hành</p>
                </div>
              </div>
              <div className="max-w-xl">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Hệ thống vận hành</p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight">Quản trị sự kiện và vận hành cổng soát vé.</h2>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center p-8">
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Đăng nhập</h2>
                <p className="mt-1 text-sm text-slate-500">Dùng tài khoản ban tổ chức hoặc nhân viên soát vé.</p>
              </div>
              <Field label="Email">
                <input
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  className="input"
                  type="email"
                />
              </Field>
              <Field label="Mật khẩu">
                <input
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  className="input"
                  type="password"
                />
              </Field>
              {error && <Alert message={error} />}
              <button disabled={loading} className="primary-button w-full" type="submit">
                <Shield className="h-4 w-4" />
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  if (session.user.role === 'CHECKIN_STAFF') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] p-6 text-slate-900">
        <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nhân viên soát vé</p>
              <h1 className="mt-3 text-2xl font-semibold">Vui lòng dùng TicketBox Scanner App</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Admin web chỉ dùng để quản lý và theo dõi vận hành. Việc quét QR tại cổng đã được tách sang ứng dụng
                mobile để dùng camera điện thoại, lưu offline và đồng bộ lại khi có mạng.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-950 text-cyan-300">
              <Ticket className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Cách chạy khi demo:</p>
            <code className="rounded bg-white px-3 py-2 font-mono text-xs text-slate-700">cd scanner-android</code>
            <code className="rounded bg-white px-3 py-2 font-mono text-xs text-slate-700">.\gradlew.bat assembleDebug</code>
            <p>
              Mở project bằng Android Studio hoặc cài APK debug trên thiết bị, sau đó cấu hình API URL dạng{' '}
              <span className="font-mono text-xs">http://IP-LAPTOP:3000/api/v1</span>.
            </p>
          </div>

          <form onSubmit={handleStaffPasswordChange} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-cyan-700" />
              <h2 className="font-semibold text-slate-900">Đổi mật khẩu</h2>
            </div>
            <TextInput
              label="Mật khẩu hiện tại"
              required
              type="password"
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })}
            />
            <TextInput
              label="Mật khẩu mới"
              required
              type="password"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
            />
            <TextInput
              label="Xác nhận mật khẩu mới"
              required
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm({ ...passwordForm, confirmPassword: value })}
            />
            {passwordError && <Alert message={passwordError} />}
            {passwordNotice && <Success message={passwordNotice} />}
            <button disabled={changingPassword} className="primary-button w-full" type="submit">
              <KeyRound className="h-4 w-4" />
              {changingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            </button>
          </form>

          <button onClick={handleLogout} className="secondary-button mt-6 w-full" type="button">
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </section>
      </main>
    );
  }

  if (!isOrganizer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-semibold">Truy cập bị từ chối</h1>
          <p className="mt-2 text-sm text-slate-500">Tài khoản này không có quyền sử dụng cổng vận hành.</p>
          <button onClick={handleLogout} className="secondary-button mt-6 w-full" type="button">
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      {confirmDialog}
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-950 text-cyan-300">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-semibold">TicketBox</h1>
                <p className="text-xs text-slate-500">Cổng quản trị</p>
              </div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1">
            {tabs
              .map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`nav-button min-w-max lg:w-full ${activeTab === tab.key ? 'nav-button-active' : ''}`}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{formatRoleLabel(session.user.role)}</p>
                <h2 className="text-2xl font-semibold">{activeTitle(activeTab)}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedConcert?.id || ''}
                  onChange={(event) => setSelectedConcertId(event.target.value)}
                  className="select min-w-0 flex-1 sm:min-w-[260px] sm:flex-none"
                >
                  {concerts.map((concert) => (
                    <option key={concert.id} value={concert.id}>
                      {concert.eventCode} · {concert.name}
                    </option>
                  ))}
                </select>
                <button onClick={() => void loadAll()} className="icon-button" title="Tải lại" type="button">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button onClick={handleLogout} className="secondary-button" type="button">
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-5">
            {error && <Alert message={error} />}
            {notice && <Success message={notice} />}
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải dữ liệu quản trị...</div>
            ) : (
              renderTab()
            )}
          </div>
        </section>
      </div>
    </main>
  );

  function renderTab() {
    if (activeTab === 'overview') {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Stat label="Sự kiện" value={concerts.length} icon={CalendarClock} />
            <Stat label="Loại vé" value={ticketTypes.length} icon={Ticket} />
            <Stat label="Vé đã bán" value={revenue?.ticketsSold || 0} icon={BadgeCheck} />
            <Stat label="Doanh thu" value={formatMoney(revenue?.totalRevenue || 0)} icon={BarChart3} />
          </div>
          <Panel title="Sự kiện đang chọn">
            {selectedConcert ? (
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-5">
                <Info label="Tên" value={selectedConcert.name} />
                <Info label="Mã eventCode" value={selectedConcert.eventCode} />
                <Info label="Trạng thái" value={formatStatusLabel(selectedConcert.status)} />
                <Info label="Địa điểm" value={selectedConcert.venue} />
                <Info label="Bắt đầu" value={formatDate(selectedConcert.startAt)} />
              </div>
            ) : (
              <EmptyState text="Chưa có sự kiện." />
            )}
          </Panel>
          <Panel title="Tổng quan tồn kho">
            <DataTable
              headers={['Loại vé', 'Giá', 'Tổng', 'Còn lại', 'Đã bán', 'Giới hạn']}
              rows={ticketTypes.map((item) => [
                item.name,
                formatMoney(item.price),
                item.inventory?.totalQuantity ?? item.totalQuantity,
                item.inventory?.availableQuantity ?? '-',
                item.inventory?.soldQuantity ?? item.soldQuantity,
                item.maxPerAccount,
              ])}
            />
          </Panel>
        </div>
      );
    }

    if (activeTab === 'concerts') {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Panel title="Danh sách sự kiện">
            <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_180px_200px]">
              <input
                className="input"
                onChange={(event) => setConcertQuery(event.target.value)}
                placeholder="Tìm theo tên, mã hoặc địa điểm"
                value={concertQuery}
              />
              <select className="select" onChange={(event) => setConcertStatusFilter(event.target.value)} value={concertStatusFilter}>
                <option value="ALL">Tất cả trạng thái</option>
                {Array.from(new Set(concerts.map((concert) => concert.status))).map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
              <select className="select" onChange={(event) => setConcertSort(event.target.value)} value={concertSort}>
                <option value="startAt-asc">Sớm nhất trước</option>
                <option value="startAt-desc">Muộn nhất trước</option>
                <option value="name-asc">Tên A-Z</option>
                <option value="name-desc">Tên Z-A</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã eventCode</th>
                    <th>Tên</th>
                    <th>Trạng thái</th>
                    <th>Địa điểm</th>
                    <th>Bắt đầu</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedConcerts.map((concert) => (
                    <tr key={concert.id} className={concert.id === selectedConcert?.id ? 'bg-cyan-50' : ''}>
                      <td><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{concert.eventCode}</span></td>
                      <td className="font-medium text-slate-900 shadow-none">{concert.name}</td>
                      <td>
                        <StatusBadge status={concert.status} />
                      </td>
                      <td>{concert.venue}</td>
                      <td>{formatDate(concert.startAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setSelectedConcertId(concert.id)} className="small-button" type="button">
                            Cấu hình
                          </button>
                          <button
                            onClick={() => runMutation(() => adminApi.cancelConcert(token, concert.id, cancelReason), 'Đã hủy sự kiện.')}
                            className="danger-small-button"
                            type="button"
                          >
                            Hủy
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={concertPage}
              pageCount={concertPageCount}
              totalItems={filteredConcerts.length}
              onPageChange={setConcertPage}
            />
          </Panel>
          <Panel title="Tạo sự kiện">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const eventCode = concertForm.eventCode.trim().toUpperCase();
                if (!eventCode) {
                  setConcertFormError('Mã sự kiện là bắt buộc.');
                  return;
                }
                setConcertFormError(null);
                void runMutation(
                  async () => {
                    const artistName = concertForm.artistName.trim();
                    const created = await adminApi.createConcert(token, {
                      eventCode,
                      name: concertForm.name,
                      venue: concertForm.venue,
                      startAt: new Date(concertForm.startAt).toISOString(),
                      saleOpenAt: new Date(concertForm.saleOpenAt).toISOString(),
                      organizationId: concertForm.organizationId || undefined,
                      description: concertForm.description || undefined,
                      seatMapEnabled: concertForm.seatMapEnabled,
                    });
                    if (artistName) {
                      await adminApi.addConcertArtist(token, created.id, artistName);
                    }
                    setSelectedConcertId(created.id);
                    setConcertForm(emptyConcertForm);
                  },
                    'Đã tạo sự kiện ở trạng thái bản nháp.'
                );
              }}
            >
              <Field label="Mã eventCode">
                <input
                  aria-invalid={Boolean(concertFormError)}
                  className={`input uppercase ${concertFormError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                  onChange={(event) => {
                    setConcertForm({ ...concertForm, eventCode: event.target.value.toUpperCase() });
                    if (concertFormError) setConcertFormError(null);
                  }}
                  placeholder="SKYTOUR-2026-HN"
                  required
                  value={concertForm.eventCode}
                />
                {concertFormError && <span className="text-xs font-medium text-rose-700">{concertFormError}</span>}
              </Field>
              <TextInput label="Tên" required value={concertForm.name} onChange={(value) => setConcertForm({ ...concertForm, name: value })} />
              <TextInput label="Nghệ sĩ" required value={concertForm.artistName} onChange={(value) => setConcertForm({ ...concertForm, artistName: value })} />
              <TextInput label="Địa điểm" required value={concertForm.venue} onChange={(value) => setConcertForm({ ...concertForm, venue: value })} />
              <TextInput label="Thời gian bắt đầu" required type="datetime-local" value={concertForm.startAt} onChange={(value) => setConcertForm({ ...concertForm, startAt: value })} />
              <TextInput label="Thời gian mở bán" required type="datetime-local" value={concertForm.saleOpenAt} onChange={(value) => setConcertForm({ ...concertForm, saleOpenAt: value })} />
              <TextInput label="Mô tả" value={concertForm.description} onChange={(value) => setConcertForm({ ...concertForm, description: value })} />
              <label className="flex items-center justify-between rounded border border-slate-200 px-3 py-2.5">
                <span className="text-sm font-medium">Sử dụng sơ đồ khu vực</span>
                <input
                  checked={concertForm.seatMapEnabled}
                  className="h-4 w-4 accent-cyan-700"
                  onChange={(event) => setConcertForm({ ...concertForm, seatMapEnabled: event.target.checked })}
                  type="checkbox"
                />
              </label>
              <button disabled={saving} className="primary-button w-full" type="submit">
                <Check className="h-4 w-4" />
                Tạo sự kiện
              </button>
            </form>
          </Panel>
          </div>
          {selectedConcert && (
            <Panel title="Cấu hình và công khai">
              <ConcertSetup concert={selectedConcert} runMutation={runMutation} saving={saving} token={token} />
            </Panel>
          )}
        </div>
      );
    }

    if (activeTab === 'tickets') {
      return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <Panel title="Loại vé và tồn kho">
            <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_160px_190px]">
              <input
                className="input"
                onChange={(event) => setTicketQuery(event.target.value)}
                placeholder="Tìm theo tên hoặc mã khu vực"
                value={ticketQuery}
              />
              <select className="select" onChange={(event) => setTicketStatusFilter(event.target.value)} value={ticketStatusFilter}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang bán</option>
                <option value="INACTIVE">Tạm ẩn</option>
              </select>
              <select className="select" onChange={(event) => setTicketSort(event.target.value)} value={ticketSort}>
                <option value="price-desc">Giá cao trước</option>
                <option value="price-asc">Giá thấp trước</option>
                <option value="name-asc">Tên A-Z</option>
                <option value="remaining-desc">Còn lại nhiều trước</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Mã khu vực</th>
                    <th>Giá</th>
                    <th>Tổng</th>
                    <th>Còn lại</th>
                    <th>Đã bán</th>
                    <th>Tối đa/tài khoản</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật tổng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTicketTypes.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">{item.zoneCode}</span></td>
                      <td>{formatMoney(item.price)}</td>
                      <td>{item.inventory?.totalQuantity ?? item.totalQuantity}</td>
                      <td>{item.inventory?.availableQuantity ?? '-'}</td>
                      <td>{item.inventory?.soldQuantity ?? item.soldQuantity}</td>
                      <td>{item.maxPerAccount}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        <div className="flex gap-2">
                          <input
                            value={inventoryDrafts[item.id] || ''}
                            onChange={(event) => setInventoryDrafts({ ...inventoryDrafts, [item.id]: event.target.value })}
                            className="input h-9 w-24"
                            type="number"
                          />
                          <button
                            onClick={() =>
                              runMutation(
                                () => adminApi.updateInventory(token, item.id, Number(inventoryDrafts[item.id] || item.totalQuantity)),
                                'Đã cập nhật tồn kho.'
                              )
                            }
                            className="small-button"
                            type="button"
                          >
                            Lưu
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="icon-button"
                            disabled={selectedConcert?.status !== 'DRAFT'}
                            onClick={() => beginEditTicketType(item)}
                            title="Sửa loại vé"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="icon-button"
                            disabled={selectedConcert?.status !== 'DRAFT'}
                            onClick={() =>
                              confirm({
                                title: 'Xóa loại vé',
                                message: `Xóa loại vé ${item.name}? Hành động này không thể hoàn tác.`,
                                confirmLabel: 'Xóa',
                                tone: 'danger',
                                onConfirm: () => runMutation(() => adminApi.deleteTicketType(token, item.id), 'Đã xóa loại vé.'),
                              })
                            }
                            title="Xóa loại vé"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={ticketPage}
              pageCount={ticketPageCount}
              totalItems={filteredTicketTypes.length}
              onPageChange={setTicketPage}
            />
          </Panel>
          <Panel title={editingTicketTypeId ? 'Sửa loại vé' : 'Tạo loại vé'}>
            <form className="space-y-3" onSubmit={submitTicketType}>
              <TextInput label="Tên" required value={ticketTypeForm.name} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, name: value })} />
              <TextInput label="Mã zoneCode" required value={ticketTypeForm.zoneCode} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, zoneCode: value.toUpperCase() })} />
              <TextInput label="Giá" required type="number" value={ticketTypeForm.price} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, price: value })} />
              <TextInput label="Tổng số lượng" required type="number" value={ticketTypeForm.totalQuantity} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, totalQuantity: value })} />
              <TextInput label="Tối đa mỗi tài khoản" required type="number" value={ticketTypeForm.maxPerAccount} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, maxPerAccount: value })} />
              <TextInput label="Mở bán riêng (không bắt buộc)" type="datetime-local" value={ticketTypeForm.saleOpenAt} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, saleOpenAt: value })} />
              <TextInput label="Đóng bán riêng (không bắt buộc)" type="datetime-local" value={ticketTypeForm.saleCloseAt} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, saleCloseAt: value })} />
              {editingTicketTypeId && (
                <Field label="Trạng thái">
                  <select className="select w-full" onChange={(event) => setTicketTypeForm({ ...ticketTypeForm, status: event.target.value })} value={ticketTypeForm.status}>
                    <option value="ACTIVE">Đang bán</option>
                    <option value="INACTIVE">Tạm ẩn</option>
                  </select>
                </Field>
              )}
              {ticketTypeFormError && <Alert message={ticketTypeFormError} />}
              {selectedConcert?.status !== 'DRAFT' && <p className="text-sm text-amber-700">Cấu hình loại vé đã khóa sau khi công khai.</p>}
              <div className="flex gap-2">
                <button disabled={saving || !selectedConcert || selectedConcert.status !== 'DRAFT'} className="primary-button flex-1" type="submit">
                  <Ticket className="h-4 w-4" />
                  {editingTicketTypeId ? 'Lưu loại vé' : 'Tạo loại vé'}
                </button>
                {editingTicketTypeId && (
                  <button className="icon-button" onClick={resetTicketTypeForm} title="Hủy sửa" type="button">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </Panel>
        </div>
      );
    }

    if (activeTab === 'staff') {
      return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <Panel title="Phân công nhân viên">
            <div className="mb-3 grid gap-2 md:grid-cols-[1fr_180px_180px]">
              <input
                className="input"
                onChange={(event) => setStaffQuery(event.target.value)}
                placeholder="Tìm nhân viên, email hoặc cổng"
                value={staffQuery}
              />
              <select className="select" onChange={(event) => setStaffGateFilter(event.target.value)} value={staffGateFilter}>
                <option value="ALL">Tất cả cổng</option>
                {staffGateOptions.map((gateId) => (
                  <option key={gateId} value={gateId}>
                    {gateId}
                  </option>
                ))}
              </select>
              <select className="select" onChange={(event) => setStaffSort(event.target.value)} value={staffSort}>
                <option value="createdAt-desc">Mới phân công</option>
                <option value="createdAt-asc">Cũ trước</option>
                <option value="name-asc">Tên A-Z</option>
                <option value="gate-asc">Cổng A-Z</option>
              </select>
            </div>
            <DataTable
              headers={['Nhân viên', 'Email', 'Cổng', 'Ngày tạo']}
              rows={pagedStaffAssignments.map((item) => [
                item.staff?.fullName || item.staffId,
                item.staff?.email || '-',
                item.gateId,
                formatDate(item.createdAt),
              ])}
              actions={pagedStaffAssignments.map((item) => (
                <button
                  key={item.id}
                  onClick={() => runMutation(() => adminApi.deleteStaffAssignment(token, item.id), 'Đã gỡ phân công.')}
                  className="danger-small-button"
                  type="button"
                >
                  Gỡ
                </button>
              ))}
            />
            <PaginationControls
              page={staffPage}
              pageCount={staffPageCount}
              totalItems={filteredStaffAssignments.length}
              onPageChange={setStaffPage}
            />
          </Panel>
          <div className="space-y-5">
            <Panel title="Tạo nhân viên">
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runMutation(
                    async () => {
                      const created = await adminApi.createStaff(token, {
                        email: staffUserForm.email,
                        fullName: staffUserForm.fullName,
                        phone: staffUserForm.phone || undefined,
                        password: staffUserForm.password,
                      });
                      setStaffForm((current) => ({ ...current, staffId: created.id }));
                      setStaffUserForm(emptyStaffUserForm);
                    },
                    'Đã tạo tài khoản nhân viên.'
                  );
                }}
              >
                <TextInput label="Email" type="email" value={staffUserForm.email} onChange={(value) => setStaffUserForm({ ...staffUserForm, email: value })} />
                <TextInput label="Họ và tên" value={staffUserForm.fullName} onChange={(value) => setStaffUserForm({ ...staffUserForm, fullName: value })} />
                <TextInput label="Số điện thoại" value={staffUserForm.phone} onChange={(value) => setStaffUserForm({ ...staffUserForm, phone: value })} />
                <TextInput label="Mật khẩu" type="password" value={staffUserForm.password} onChange={(value) => setStaffUserForm({ ...staffUserForm, password: value })} />
                <button disabled={saving} className="primary-button w-full" type="submit">
                  <Users className="h-4 w-4" />
                  Tạo nhân viên
                </button>
              </form>
            </Panel>

            <Panel title="Phân công nhân viên">
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedConcert) return;
                  void runMutation(
                    () => adminApi.createStaffAssignment(token, selectedConcert.id, staffForm.staffId, staffForm.gateId),
                    'Đã phân công nhân viên.'
                  );
                }}
              >
                {staffUsers.length > 0 ? (
                  <Field label="Nhân viên">
                    <select value={staffForm.staffId} onChange={(event) => setStaffForm({ ...staffForm, staffId: event.target.value })} className="select w-full">
                      <option value="">Chọn nhân viên</option>
                      {staffUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName} - {user.email}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <TextInput label="Mã nhân viên" value={staffForm.staffId} onChange={(value) => setStaffForm({ ...staffForm, staffId: value })} />
                )}
                <TextInput label="Mã cổng" value={staffForm.gateId} onChange={(value) => setStaffForm({ ...staffForm, gateId: value })} />
                <button disabled={saving || !selectedConcert} className="primary-button w-full" type="submit">
                  <Users className="h-4 w-4" />
                  Phân công
                </button>
              </form>
            </Panel>
          </div>
        </div>
      );
    }

    if (activeTab === 'checkin') {
      return <CheckinMonitor token={token} concert={selectedConcert} staffAssignments={staffAssignments} />;
    }

    if (activeTab === 'sponsors') {
      return <SponsorEmailTab token={token} concerts={concerts} />;
    }

    if (activeTab === 'ai-bio') {
      return (
        <ArtistBioTab
          token={token}
          concerts={concerts}
          selectedConcertId={selectedConcert?.id || ''}
          onSelectConcert={setSelectedConcertId}
        />
      );
    }

    if (activeTab === 'vip-sync') {
      return <VipSyncTab token={token} concerts={concerts} />;
    }

    if (activeTab === 'revenue') {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Stat label="Đơn đã thanh toán" value={revenue?.paidOrders || 0} icon={ClipboardList} />
            <Stat label="Vé đã bán" value={revenue?.ticketsSold || 0} icon={BadgeCheck} />
            <Stat label="Doanh thu" value={formatMoney(revenue?.totalRevenue || 0)} icon={BarChart3} />
          </div>
          <Panel title="Doanh thu theo loại vé">
            <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px]">
              <input
                className="input"
                onChange={(event) => setRevenueQuery(event.target.value)}
                placeholder="Tìm theo loại vé"
                value={revenueQuery}
              />
              <select className="select" onChange={(event) => setRevenueSort(event.target.value)} value={revenueSort}>
                <option value="revenue-desc">Doanh thu cao trước</option>
                <option value="revenue-asc">Doanh thu thấp trước</option>
                <option value="quantity-desc">Số lượng cao trước</option>
                <option value="quantity-asc">Số lượng thấp trước</option>
                <option value="name-asc">Tên A-Z</option>
              </select>
            </div>
            <DataTable
              headers={['Loại vé', 'Số lượng', 'Doanh thu']}
              rows={pagedRevenueRows.map((row) => [
                row.name,
                row.quantity,
                formatMoney(row.revenue),
              ])}
            />
            <PaginationControls
              page={revenuePage}
              pageCount={revenuePageCount}
              totalItems={filteredRevenueRows.length}
              onPageChange={setRevenuePage}
            />
          </Panel>
        </div>
      );
    }

    return null;
  }
}
