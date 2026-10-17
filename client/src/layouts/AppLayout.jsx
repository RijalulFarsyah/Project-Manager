import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  CheckSquare,
  Users,
  GitBranch,
  ClipboardList,
  BarChart2,
  Network,
  Flag,
  Settings,
  LogOut,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/projects/new', icon: Plus, label: 'Proyek Baru', exact: false, showWhen: (u) => !!u },
  { to: '/projects', icon: Briefcase, label: 'Semua Proyek', exact: false, showWhen: (u) => !!u },
];

function PageLink({ to, icon: Icon, label, exact, showWhen }) {
  const location = useLocation();
  const match =
    exact ? location.pathname === to : location.pathname.startsWith(to);
  const active = match;

  if (showWhen && !showWhen(useAuth?.() || null)) return null;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-text-primary hover:bg-border/70'
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span>{label}</span>
    </Link>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const m = sessionStorage.getItem('proman_msg');
    if (m) {
      try {
        const parsed = JSON.parse(m);
        setMsg(parsed);
        sessionStorage.removeItem('proman_msg');
      } catch {
        sessionStorage.removeItem('proman_msg');
      }
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-border bg-surface">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-4">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-card px-2 py-2 transition-colors hover:bg-border/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white text-sm font-bold">
                P
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">ProMan</p>
                <p className="text-[11px] text-text-secondary">Project Manager</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV.map((n) => (
              <PageLink key={n.to} {...n} />
            ))}
          </nav>

          <div className="border-t border-border p-4">
            {user && (
              <div className="mb-3 flex items-center gap-3 rounded-card bg-border/40 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {user.username}
                  </p>
                  <p className="text-[11px] text-text-secondary">Administrator</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border/70 hover:text-text-primary"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-border/60 md:hidden"
              aria-label="Menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <PageTitle />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Notify msg={msg} onClose={() => setMsg(null)} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-bg p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PageTitle() {
  const location = useLocation();
  const pairs = [
    { path: '/', label: 'Dashboard' },
    { path: '/projects', label: 'Semua Proyek' },
    { path: '/projects/new', label: 'Proyek Baru' },
    { path: /^\/projects\/[^/]+$/, label: 'Overview Proyek' },
    { path: /^\/projects\/[^/]+\/calendar$/, label: 'Kalender Kerja' },
    { path: /^\/projects\/[^/]+\/tasks$/, label: 'Daftar Tugas' },
    { path: /^\/projects\/[^/]+\/tasks\/new$/, label: 'Tugas Baru' },
    { path: /^\/projects\/[^/]+\/tasks\/[^/]+$/, label: 'Detail Tugas' },
    { path: /^\/projects\/[^/]+\/team$/, label: 'Tim & Cuti' },
    { path: /^\/projects\/[^/]+\/team\/new$/, label: 'Anggota Baru' },
    { path: /^\/projects\/[^/]+\/gantt$/, label: 'Gantt Chart' },
    { path: /^\/projects\/[^/]+\/pert$/, label: 'PERT Chart' },
    { path: /^\/projects\/[^/]+\/critical$/, label: 'Jalur Kritis' },
    { path: /^\/projects\/[^/]+\/settings$/, label: 'Pengaturan Proyek' },
  ];

  let label = 'ProMan';
  for (const p of pairs) {
    if (typeof p.path === 'string') {
      if (location.pathname === p.path) label = p.label;
    } else if (p.path.test(location.pathname)) {
      label = p.label;
    }
  }

  return (
    <div>
      <h1 className="truncate text-lg font-semibold text-text-primary">{label}</h1>
      <p className="truncate text-sm text-text-secondary">
        {location.pathname === '/' && 'Selamat datang, '}
        {location.pathname === '/' && (useAuth?.()?.user?.username || '')}
      </p>
    </div>
  );
}

function Notify({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div
      className={`pointer-events-auto relative max-w-md rounded-card border border-border bg-surface p-4 shadow-md ${
        msg.type === 'error' ? 'border-danger/30' : 'border-success/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {msg.type === 'error' ? (
          <X className="mt-0.5 h-5 w-5 text-danger" />
        ) : (
          <CheckSquare className="mt-0.5 h-5 w-5 text-success" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">{msg.title}</p>
          {msg.description && (
            <p className="mt-1 text-sm text-text-secondary">{msg.description}</p>
          )}
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-text-secondary hover:bg-border">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
