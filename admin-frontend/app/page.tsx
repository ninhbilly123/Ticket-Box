'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarClock,
  Check,
  ClipboardList,
  KeyRound,
  LogOut,
  RefreshCw,
  Shield,
  Ticket,
  Trash2,
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
import ConcertSetup from '../components/concert-setup';
import { formatRoleLabel, formatStatusLabel } from '../lib/ui-labels';

type TabKey = 'overview' | 'concerts' | 'tickets' | 'staff' | 'sponsors' | 'ai-bio' | 'vip-sync' | 'revenue';

const tabs: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
  { key: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { key: 'concerts', label: 'Sự kiện', icon: CalendarClock },
  { key: 'tickets', label: 'Loại vé', icon: Ticket },
  { key: 'staff', label: 'Nhân viên', icon: Users },
  { key: 'sponsors', label: 'Email nhãn hàng', icon: Building2 },
  { key: 'ai-bio', label: 'Tiểu sử nghệ sĩ AI', icon: BrainCircuit },
  { key: 'vip-sync', label: 'Đồng bộ khách VIP', icon: RefreshCw },
  { key: 'revenue', label: 'Doanh thu', icon: ClipboardList },
];

const emptyConcertForm = {
  eventCode: '',
  name: '',
  venue: '',
  startAt: '',
  saleOpenAt: '',
  description: '',
  seatMapEnabled: false,
  organizationId: '',
};

const emptyTicketTypeForm = {
  name: 'VIP',
  zoneCode: 'VIP',
  price: '1000000',
  totalQuantity: '100',
  maxPerAccount: '4',
  saleOpenAt: '',
  saleCloseAt: '',
};

const emptyStaffUserForm = {
  email: '',
  fullName: '',
  phone: '',
  password: 'Password123!',
};

export default function AdminHomePage() {
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

  const [loginForm, setLoginForm] = useState({ email: 'organizer@example.com', password: 'Password123!' });
  const [concertForm, setConcertForm] = useState(emptyConcertForm);
  const [concertFormError, setConcertFormError] = useState<string | null>(null);
  const [ticketTypeForm, setTicketTypeForm] = useState(emptyTicketTypeForm);
  const [staffForm, setStaffForm] = useState({ staffId: '', gateId: 'GATE-A' });
  const [staffUserForm, setStaffUserForm] = useState(emptyStaffUserForm);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState('Ban tổ chức hủy sự kiện');

  const token = session?.accessToken || '';
  const selectedConcert = useMemo(
    () => concerts.find((concert) => concert.id === selectedConcertId) || concerts[0] || null,
    [concerts, selectedConcertId]
  );
  const isOrganizer = session?.user.role === 'ORGANIZER';

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
  }, [session?.accessToken]);

  useEffect(() => {
    if (session && selectedConcert?.id) {
      void loadConcertScoped(selectedConcert.id);
    }
  }, [session?.accessToken, selectedConcert?.id]);

  async function loadAll() {
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
      if (!selectedConcertId && concertList[0]) {
        setSelectedConcertId(concertList[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadConcertScoped(concertId: string) {
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
  }

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
            <code className="rounded bg-white px-3 py-2 font-mono text-xs text-slate-700">cd scanner-app</code>
            <code className="rounded bg-white px-3 py-2 font-mono text-xs text-slate-700">npm start</code>
            <p>
              Sau đó mở Expo Go trên điện thoại và nhập API URL dạng{' '}
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
                  {concerts.map((concert) => (
                    <tr key={concert.id} className={concert.id === selectedConcert?.id ? 'bg-cyan-50' : ''}>
                      <td><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{concert.eventCode}</span></td>
                      <td className="font-medium">{concert.name}</td>
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
                    const created = await adminApi.createConcert(token, {
                      ...concertForm,
                      eventCode,
                      startAt: new Date(concertForm.startAt).toISOString(),
                      saleOpenAt: new Date(concertForm.saleOpenAt).toISOString(),
                      organizationId: concertForm.organizationId || undefined,
                      description: concertForm.description || undefined,
                    });
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
                    <th>Cập nhật tổng</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ticketTypes.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">{item.zoneCode}</span></td>
                      <td>{formatMoney(item.price)}</td>
                      <td>{item.inventory?.totalQuantity ?? item.totalQuantity}</td>
                      <td>{item.inventory?.availableQuantity ?? '-'}</td>
                      <td>{item.inventory?.soldQuantity ?? item.soldQuantity}</td>
                      <td>{item.maxPerAccount}</td>
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
                        {selectedConcert?.status === 'DRAFT' && (
                          <button
                            className="icon-button"
                            onClick={() => runMutation(() => adminApi.deleteTicketType(token, item.id), 'Đã xóa loại vé.')}
                            title="Xóa loại vé"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Tạo loại vé">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!selectedConcert) return;
                void runMutation(
                  async () => {
                    await adminApi.createTicketType(token, selectedConcert.id, {
                      name: ticketTypeForm.name,
                      zoneCode: ticketTypeForm.zoneCode.trim().toUpperCase(),
                      price: Number(ticketTypeForm.price),
                      totalQuantity: Number(ticketTypeForm.totalQuantity),
                      maxPerAccount: Number(ticketTypeForm.maxPerAccount),
                      saleOpenAt: ticketTypeForm.saleOpenAt ? new Date(ticketTypeForm.saleOpenAt).toISOString() : undefined,
                      saleCloseAt: ticketTypeForm.saleCloseAt ? new Date(ticketTypeForm.saleCloseAt).toISOString() : undefined,
                    });
                    setTicketTypeForm(emptyTicketTypeForm);
                  },
                  'Đã tạo loại vé và tồn kho.'
                );
              }}
            >
              <TextInput label="Tên" required value={ticketTypeForm.name} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, name: value })} />
              <TextInput label="Mã zoneCode" required value={ticketTypeForm.zoneCode} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, zoneCode: value.toUpperCase() })} />
              <TextInput label="Giá" required type="number" value={ticketTypeForm.price} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, price: value })} />
              <TextInput label="Tổng số lượng" required type="number" value={ticketTypeForm.totalQuantity} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, totalQuantity: value })} />
              <TextInput label="Tối đa mỗi tài khoản" required type="number" value={ticketTypeForm.maxPerAccount} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, maxPerAccount: value })} />
              <TextInput label="Mở bán riêng (không bắt buộc)" type="datetime-local" value={ticketTypeForm.saleOpenAt} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, saleOpenAt: value })} />
              <TextInput label="Đóng bán riêng (không bắt buộc)" type="datetime-local" value={ticketTypeForm.saleCloseAt} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, saleCloseAt: value })} />
              {selectedConcert?.status !== 'DRAFT' && <p className="text-sm text-amber-700">Cấu hình loại vé đã khóa sau khi công khai.</p>}
              <button disabled={saving || !selectedConcert || selectedConcert.status !== 'DRAFT'} className="primary-button w-full" type="submit">
                <Ticket className="h-4 w-4" />
                Tạo loại vé
              </button>
            </form>
          </Panel>
        </div>
      );
    }

    if (activeTab === 'staff') {
      return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <Panel title="Phân công nhân viên">
            <DataTable
              headers={['Nhân viên', 'Email', 'Cổng', 'Ngày tạo']}
              rows={staffAssignments.map((item) => [
                item.staff?.fullName || item.staffId,
                item.staff?.email || '-',
                item.gateId,
                formatDate(item.createdAt),
              ])}
              actions={staffAssignments.map((item) => (
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
            <DataTable
              headers={['Loại vé', 'Số lượng', 'Doanh thu']}
              rows={Object.entries(revenue?.byTicketType || {}).map(([name, value]) => [
                name,
                value.quantity,
                formatMoney(value.revenue),
              ])}
            />
          </Panel>
        </div>
      );
    }

    return null;
  }
}

function activeTitle(tab: TabKey) {
  return tabs.find((item) => item.key === tab)?.label || 'Bảng điều khiển';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định.';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
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

function Alert({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

function Success({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <Check className="mt-0.5 h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof BarChart3 }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-cyan-700" />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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

function EmptyState({ text }: { text: string }) {
  return <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{text}</div>;
}

function DataTable({
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
