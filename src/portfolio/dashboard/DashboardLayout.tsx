import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { PROFILE } from '../data';
import { ArrowLeft, CrownIcon, HomeIcon, LibraryIcon, LogoutIcon, UserIcon, WandIcon, type IconComponent } from '../icons';
import { navigate } from '../router';

export interface DashboardNavItem {
  path: string;
  label: string;
  short: string;
  icon: IconComponent;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { path: '/abo-bereich', label: 'Übersicht', short: 'Start', icon: HomeIcon },
  { path: '/abo-bereich/bibliothek', label: 'Bibliothek', short: 'Bibliothek', icon: LibraryIcon },
  { path: '/abo-bereich/bio-designer', label: 'Bio-Designer', short: 'Bio-Designer', icon: WandIcon },
  { path: '/abo-bereich/profil', label: 'Profil & Abo', short: 'Profil', icon: UserIcon },
];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

interface DashboardLayoutProps {
  path: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Rahmen für alle Dashboard-Seiten: Sidebar (Desktop), Tab-Leiste (Mobil), Kopfzeile. */
export function DashboardLayout({ path, title, subtitle, actions, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="animate-fade-in min-h-dvh bg-[#06080d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.1),transparent_50%)]" />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-[#080b12]/90 p-4 backdrop-blur-xl lg:flex">
        <a href="#/" className="flex items-center gap-2.5 px-2 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-oswald text-lg font-bold text-white">B</span>
          <span className="font-oswald text-lg tracking-[0.18em] text-white">{PROFILE.name}</span>
        </a>
        <p className="mt-1 inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
          <CrownIcon size={12} /> Abo-Bereich · VIP
        </p>

        <nav className="mt-6 flex-1 space-y-1" aria-label="Abo-Bereich">
          {DASHBOARD_NAV.map((item) => {
            const active = path === item.path;
            const Icon = item.icon;
            return (
              <a
                key={item.path}
                href={`#${item.path}`}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ${
                  active ? 'bg-white/[0.07] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-cyan-300 to-blue-500 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
                />
                <Icon size={18} className={active ? 'text-cyan-300' : 'transition-colors group-hover:text-cyan-200'} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/5 pt-4">
          <a href="#/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white">
            <ArrowLeft size={18} /> Zur Startseite
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogoutIcon size={18} /> Abmelden
          </button>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <Avatar name={user.displayName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.displayName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Inhalt */}
      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-[#06080d]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <h1 className="truncate font-oswald text-2xl tracking-wide text-white sm:text-3xl">{title}</h1>
              {subtitle && <p className="truncate text-sm text-slate-400">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {actions}
              <a href="#/abo-bereich/profil" className="lg:hidden" aria-label="Profil">
                <Avatar name={user.displayName} />
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      {/* Mobile Tab-Leiste */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#080b12]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Abo-Bereich"
      >
        <ul className="grid grid-cols-4">
          {DASHBOARD_NAV.map((item) => {
            const active = path === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <a
                  href={`#${item.path}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${active ? 'text-cyan-300' : 'text-slate-500'}`}
                >
                  <Icon size={20} className={`transition-transform duration-300 ${active ? '-translate-y-0.5' : ''}`} />
                  {item.short}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
