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
  LogOut,
  MailCheck,
  RefreshCw,
  Shield,
  Ticket,
  Users,
} from 'lucide-react';
import {
  AuthSession,
  Concert,
  RevenueSummary,
  StaffUser,
  StaffAssignment,
  TicketType,
  WhitelistConfig,
  adminApi,
  formatMoney,
} from '../lib/api';
import { ArtistBioTab, SponsorEmailTab, VipSyncTab } from '../components/integration-tabs';
import CheckinWorkspace from '../components/checkin-workspace';

type TabKey = 'overview' | 'concerts' | 'tickets' | 'staff' | 'whitelist' | 'sponsors' | 'ai-bio' | 'vip-sync' | 'revenue';

const SESSION_KEY = 'ticketbox_admin_session';

const tabs: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'concerts', label: 'Concerts', icon: CalendarClock },
  { key: 'tickets', label: 'Ticket Types', icon: Ticket },
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'whitelist', label: 'Whitelist', icon: MailCheck },
  { key: 'sponsors', label: 'Email nhãn hàng', icon: Building2 },
  { key: 'ai-bio', label: 'AI Artist Bio', icon: BrainCircuit },
  { key: 'vip-sync', label: 'VIP Sync', icon: RefreshCw },
  { key: 'revenue', label: 'Revenue', icon: ClipboardList },
];

const emptyConcertForm = {
  eventCode: '',
  name: '',
  venue: '',
  startAt: '',
  saleOpenAt: '',
  description: '',
  svgSeatingMap: '',
  organizationId: '',
};

const emptyTicketTypeForm = {
  name: 'VIP',
  price: '1000000',
  totalQuantity: '100',
  maxPerAccount: '4',
  saleOpenAt: '',
  saleCloseAt: '',
};

const emptyWhitelistForm = {
  mailboxAddress: 'vip-import@ticketbox.local',
  allowedSenderEmail: 'sponsor@example.com',
  subjectKeyword: 'VIP CSV',
  concertId: '',
  organizationId: '',
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
  const [whitelistConfigs, setWhitelistConfigs] = useState<WhitelistConfig[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [loginForm, setLoginForm] = useState({ email: 'organizer@example.com', password: 'Password123!' });
  const [concertForm, setConcertForm] = useState(emptyConcertForm);
  const [concertFormError, setConcertFormError] = useState<string | null>(null);
  const [ticketTypeForm, setTicketTypeForm] = useState(emptyTicketTypeForm);
  const [staffForm, setStaffForm] = useState({ staffId: '', gateId: 'GATE-A' });
  const [staffUserForm, setStaffUserForm] = useState(emptyStaffUserForm);
  const [whitelistForm, setWhitelistForm] = useState(emptyWhitelistForm);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState('Cancelled by organizer');

  const token = session?.accessToken || '';
  const selectedConcert = useMemo(
    () => concerts.find((concert) => concert.id === selectedConcertId) || concerts[0] || null,
    [concerts, selectedConcertId]
  );
  const isOrganizer = session?.user.role === 'ORGANIZER';

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      adminApi.me(parsed.accessToken)
        .then((user) => setSession({ ...parsed, user }))
        .catch(() => {
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
        });
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
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
      const [concertList, whitelistList, staffList] = await Promise.all([
        adminApi.listConcerts(token),
        adminApi.listWhitelistConfigs(token),
        adminApi.listStaff(token),
      ]);
      setConcerts(concertList);
      setWhitelistConfigs(whitelistList);
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
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setNotice(`Signed in as ${nextSession.user.role}`);
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
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setConcerts([]);
    setSelectedConcertId('');
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
                  <h1 className="text-2xl font-bold">TicketBox Admin</h1>
                  <p className="text-sm text-slate-400">Operations console</p>
                </div>
              </div>
              <div className="max-w-xl">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Operations Portal</p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight">Quản trị sự kiện và vận hành cổng soát vé.</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
              <Metric label="Roles" value="3" />
              <Metric label="Port" value="3002" />
              <Metric label="API" value="3000" />
            </div>
          </section>

          <section className="flex items-center justify-center p-8">
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Sign in</h2>
                <p className="mt-1 text-sm text-slate-500">Dùng tài khoản organizer hoặc nhân viên soát vé.</p>
              </div>
              <Field label="Email">
                <input
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  className="input"
                  type="email"
                />
              </Field>
              <Field label="Password">
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
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  if (session.user.role === 'CHECKIN_STAFF') {
    return <CheckinWorkspace session={session} onLogout={() => void handleLogout()} />;
  }

  if (!isOrganizer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-slate-500">Tài khoản này không có quyền sử dụng cổng vận hành.</p>
          <button onClick={handleLogout} className="secondary-button mt-6 w-full" type="button">
            <LogOut className="h-4 w-4" />
            Sign out
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
                <p className="text-xs text-slate-500">Admin console</p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{session.user.role}</p>
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
                <button onClick={() => void loadAll()} className="icon-button" title="Refresh" type="button">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button onClick={handleLogout} className="secondary-button" type="button">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-5">
            {error && <Alert message={error} />}
            {notice && <Success message={notice} />}
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading admin data...</div>
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
            <Stat label="Concerts" value={concerts.length} icon={CalendarClock} />
            <Stat label="Ticket types" value={ticketTypes.length} icon={Ticket} />
            <Stat label="Tickets sold" value={revenue?.ticketsSold || 0} icon={BadgeCheck} />
            <Stat label="Revenue" value={formatMoney(revenue?.totalRevenue || 0)} icon={BarChart3} />
          </div>
          <Panel title="Current concert">
            {selectedConcert ? (
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-5">
                <Info label="Name" value={selectedConcert.name} />
                <Info label="Event code" value={selectedConcert.eventCode} />
                <Info label="Status" value={selectedConcert.status} />
                <Info label="Venue" value={selectedConcert.venue} />
                <Info label="Start" value={formatDate(selectedConcert.startAt)} />
              </div>
            ) : (
              <EmptyState text="No concert available." />
            )}
          </Panel>
          <Panel title="Inventory snapshot">
            <DataTable
              headers={['Type', 'Price', 'Total', 'Available', 'Sold', 'Limit']}
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
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Panel title="Concerts">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Event code</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Venue</th>
                    <th>Start</th>
                    <th>Actions</th>
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
                            Select
                          </button>
                          <button
                            onClick={() => runMutation(() => adminApi.publishConcert(token, concert.id), 'Concert published.')}
                            className="small-button"
                            type="button"
                          >
                            Publish
                          </button>
                          <button
                            onClick={() => runMutation(() => adminApi.cancelConcert(token, concert.id, cancelReason), 'Concert cancelled.')}
                            className="danger-small-button"
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Create concert">
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
                    await adminApi.createConcert(token, {
                      ...concertForm,
                      eventCode,
                      organizationId: concertForm.organizationId || undefined,
                      svgSeatingMap: concertForm.svgSeatingMap || undefined,
                      description: concertForm.description || undefined,
                    });
                    setConcertForm(emptyConcertForm);
                  },
                  'Concert created.'
                );
              }}
            >
              <Field label="Event code">
                <input
                  aria-invalid={Boolean(concertFormError)}
                  className={`input uppercase ${concertFormError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                  onChange={(event) => {
                    setConcertForm({ ...concertForm, eventCode: event.target.value.toUpperCase() });
                    if (concertFormError) setConcertFormError(null);
                  }}
                  placeholder="SKYTOUR-2026-HN"
                  value={concertForm.eventCode}
                />
                {concertFormError && <span className="text-xs font-medium text-rose-700">{concertFormError}</span>}
              </Field>
              <TextInput label="Name" value={concertForm.name} onChange={(value) => setConcertForm({ ...concertForm, name: value })} />
              <TextInput label="Venue" value={concertForm.venue} onChange={(value) => setConcertForm({ ...concertForm, venue: value })} />
              <TextInput label="Start at" type="datetime-local" value={concertForm.startAt} onChange={(value) => setConcertForm({ ...concertForm, startAt: value })} />
              <TextInput label="Sale open" type="datetime-local" value={concertForm.saleOpenAt} onChange={(value) => setConcertForm({ ...concertForm, saleOpenAt: value })} />
              <TextInput label="Description" value={concertForm.description} onChange={(value) => setConcertForm({ ...concertForm, description: value })} />
              <button disabled={saving} className="primary-button w-full" type="submit">
                <Check className="h-4 w-4" />
                Create concert
              </button>
            </form>
          </Panel>
        </div>
      );
    }

    if (activeTab === 'tickets') {
      return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <Panel title="Ticket type and inventory">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Available</th>
                    <th>Sold</th>
                    <th>Max/user</th>
                    <th>Update total</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketTypes.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
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
                                'Inventory updated.'
                              )
                            }
                            className="small-button"
                            type="button"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Create ticket type">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!selectedConcert) return;
                void runMutation(
                  () =>
                    adminApi.createTicketType(token, selectedConcert.id, {
                      name: ticketTypeForm.name,
                      price: Number(ticketTypeForm.price),
                      totalQuantity: Number(ticketTypeForm.totalQuantity),
                      maxPerAccount: Number(ticketTypeForm.maxPerAccount),
                      saleOpenAt: ticketTypeForm.saleOpenAt || undefined,
                      saleCloseAt: ticketTypeForm.saleCloseAt || undefined,
                    }),
                  'Ticket type created.'
                );
              }}
            >
              <TextInput label="Name" value={ticketTypeForm.name} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, name: value })} />
              <TextInput label="Price" type="number" value={ticketTypeForm.price} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, price: value })} />
              <TextInput label="Total quantity" type="number" value={ticketTypeForm.totalQuantity} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, totalQuantity: value })} />
              <TextInput label="Max per user" type="number" value={ticketTypeForm.maxPerAccount} onChange={(value) => setTicketTypeForm({ ...ticketTypeForm, maxPerAccount: value })} />
              <button disabled={saving || !selectedConcert} className="primary-button w-full" type="submit">
                <Ticket className="h-4 w-4" />
                Create type
              </button>
            </form>
          </Panel>
        </div>
      );
    }

    if (activeTab === 'staff') {
      return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <Panel title="Staff assignments">
            <DataTable
              headers={['Staff', 'Email', 'Gate', 'Created']}
              rows={staffAssignments.map((item) => [
                item.staff?.fullName || item.staffId,
                item.staff?.email || '-',
                item.gateId,
                formatDate(item.createdAt),
              ])}
              actions={staffAssignments.map((item) => (
                <button
                  key={item.id}
                  onClick={() => runMutation(() => adminApi.deleteStaffAssignment(token, item.id), 'Assignment removed.')}
                  className="danger-small-button"
                  type="button"
                >
                  Remove
                </button>
              ))}
            />
          </Panel>
          <div className="space-y-5">
            <Panel title="Create staff">
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
                    'Staff account created.'
                  );
                }}
              >
                <TextInput label="Email" type="email" value={staffUserForm.email} onChange={(value) => setStaffUserForm({ ...staffUserForm, email: value })} />
                <TextInput label="Full name" value={staffUserForm.fullName} onChange={(value) => setStaffUserForm({ ...staffUserForm, fullName: value })} />
                <TextInput label="Phone" value={staffUserForm.phone} onChange={(value) => setStaffUserForm({ ...staffUserForm, phone: value })} />
                <TextInput label="Password" type="password" value={staffUserForm.password} onChange={(value) => setStaffUserForm({ ...staffUserForm, password: value })} />
                <button disabled={saving} className="primary-button w-full" type="submit">
                  <Users className="h-4 w-4" />
                  Create staff
                </button>
              </form>
            </Panel>

            <Panel title="Assign staff">
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedConcert) return;
                  void runMutation(
                    () => adminApi.createStaffAssignment(token, selectedConcert.id, staffForm.staffId, staffForm.gateId),
                    'Staff assigned.'
                  );
                }}
              >
                {staffUsers.length > 0 ? (
                  <Field label="Staff">
                    <select value={staffForm.staffId} onChange={(event) => setStaffForm({ ...staffForm, staffId: event.target.value })} className="select w-full">
                      <option value="">Select staff</option>
                      {staffUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName} - {user.email}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <TextInput label="Staff ID" value={staffForm.staffId} onChange={(value) => setStaffForm({ ...staffForm, staffId: value })} />
                )}
                <TextInput label="Gate ID" value={staffForm.gateId} onChange={(value) => setStaffForm({ ...staffForm, gateId: value })} />
                <button disabled={saving || !selectedConcert} className="primary-button w-full" type="submit">
                  <Users className="h-4 w-4" />
                  Assign
                </button>
              </form>
            </Panel>
          </div>
        </div>
      );
    }

    if (activeTab === 'whitelist') {
      return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Panel title="Whitelist email configs">
            <DataTable
              headers={['Mailbox', 'Sender', 'Keyword', 'Scope', 'Status']}
              rows={whitelistConfigs.map((item) => [
                item.mailboxAddress,
                item.allowedSenderEmail,
                item.subjectKeyword,
                item.concert?.name || item.organization?.name || item.organizationId,
                item.status,
              ])}
              actions={whitelistConfigs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => runMutation(() => adminApi.deleteWhitelistConfig(token, item.id), 'Whitelist config removed.')}
                  className="danger-small-button"
                  type="button"
                >
                  Delete
                </button>
              ))}
            />
          </Panel>
          <Panel title="Create whitelist">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void runMutation(
                  () =>
                    adminApi.createWhitelistConfig(token, {
                      mailboxAddress: whitelistForm.mailboxAddress,
                      allowedSenderEmail: whitelistForm.allowedSenderEmail,
                      subjectKeyword: whitelistForm.subjectKeyword,
                      concertId: whitelistForm.concertId || selectedConcert?.id || undefined,
                      organizationId: whitelistForm.organizationId || session!.user.organizationId || undefined,
                    }),
                  'Whitelist config created.'
                );
              }}
            >
              <TextInput label="Mailbox" value={whitelistForm.mailboxAddress} onChange={(value) => setWhitelistForm({ ...whitelistForm, mailboxAddress: value })} />
              <TextInput label="Allowed sender" value={whitelistForm.allowedSenderEmail} onChange={(value) => setWhitelistForm({ ...whitelistForm, allowedSenderEmail: value })} />
              <TextInput label="Subject keyword" value={whitelistForm.subjectKeyword} onChange={(value) => setWhitelistForm({ ...whitelistForm, subjectKeyword: value })} />
              <button disabled={saving} className="primary-button w-full" type="submit">
                <MailCheck className="h-4 w-4" />
                Create config
              </button>
            </form>
          </Panel>
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
            <Stat label="Paid orders" value={revenue?.paidOrders || 0} icon={ClipboardList} />
            <Stat label="Tickets sold" value={revenue?.ticketsSold || 0} icon={BadgeCheck} />
            <Stat label="Revenue" value={formatMoney(revenue?.totalRevenue || 0)} icon={BarChart3} />
          </div>
          <Panel title="Revenue by ticket type">
            <DataTable
              headers={['Ticket type', 'Quantity', 'Revenue']}
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
  return tabs.find((item) => item.key === tab)?.label || 'Dashboard';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error.';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 p-3">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-slate-400">{label}</div>
    </div>
  );
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="input" type={type} />
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
      {status}
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
    return <EmptyState text="No records." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
            {actions && <th>Actions</th>}
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
