import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { PROFILE } from '../data';
import { ArrowLeft, ChartIcon, ChatIcon, UsersIcon, XIcon, CrownIcon, HomeIcon, LibraryIcon, LogoutIcon, Shield, UserIcon, WandIcon, type IconComponent } from '../icons';
import { navigate } from '../router';
import { AdminBadge } from './admin/AdminUI';
import { useUnreadCount } from './chat/chatStore';
import { ProfileAvatar, ProfileName } from './profile/ProfileAvatar';

export interface DashboardNavItem {
  path: string;
  label: string;
  short: string;
  icon: IconComponent;
  adminOnly?: boolean;
  /** In der mobilen Tab-Leiste direkt sichtbar (Rest unter „Mehr“) */
  mobile?: boolean;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { path: '/abo-bereich', label: 'Übersicht', short: 'Start', icon: HomeIcon, mobile: true },
  { path: '/abo-bereich/social', label: 'Social Hub', short: 'Social', icon: UsersIcon, mobile: true },
  { path: '/abo-bereich/bibliothek', label: 'Bibliothek', short: 'Bibliothek', icon: LibraryIcon, mobile: true },
  { path: '/abo-bereich/chat', label: 'Nachrichten', short: 'Chat', icon: ChatIcon, mobile: true },
  { path: '/abo-bereich/bio-designer', label: 'Bio-Designer', short: 'Bio', icon: WandIcon },
  { path: '/abo-bereich/finanzen', label: 'Finanzen', short: 'Finanzen', icon: ChartIcon },
  { path: '/abo-bereich/profil', label: 'Mein Profil', short: 'Profil', icon: UserIcon, mobile: true },
  { path: '/abo-bereich/verwaltung', label: 'Verwaltung', short: 'Admin', icon: Shield, adminOnly: true },
];

interface DashboardLayoutProps {
  path: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Rahmen für alle Seiten im Abo-Bereich: Sidebar (Desktop), Tab-Leiste (Mobil), Kopfzeile. */
export function DashboardLayout({ path, title, subtitle, actions, children }: DashboardLayoutProps) {
  const { user, profile, isAdmin, logout } = useAuth();
  const unread = useUnreadCount(user?.id);
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  if (!user) return null;

  // Admin-Einträge werden für Nicht-Admins gar nicht erst gerendert.
  const nav = DASHBOARD_NAV.filter((item) => !item.adminOnly || isAdmin);
  const isActive = (p: string) => (p === '/abo-bereich' ? path === p : path === p || path.startsWith(`${p}/`)) || (p === '/abo-bereich/profil' && path === '/abo-bereich/konto');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const Badge = ({ item, compact = false }: { item: DashboardNavItem; compact?: boolean }) =>
    item.path === '/abo-bereich/chat' && unread > 0 ? (
      <span
        className={`grid place-items-center rounded-full bg-cyan-400 font-bold text-slate-900 ${compact ? 'absolute -right-2 -top-1 h-4 min-w-4 px-1 text-[10px]' : 'ml-auto h-5 min-w-5 px-1.5 text-[11px]'}`}
        aria-label={`${unread} ungelesen`}
      >
        {unread > 99 ? '99+' : unread}
      </span>
    ) : null;

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
          {nav.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <a
                key={item.path}
                href={`#${item.path}`}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ${
                  active ? 'bg-white/[0.07] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                } ${item.adminOnly ? 'mt-3 border-t border-white/5 pt-3.5' : ''}`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b ${item.adminOnly ? 'from-amber-300 to-orange-500' : 'from-cyan-300 to-blue-500'} transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
                />
                <Icon size={18} className={active ? (item.adminOnly ? 'text-amber-200' : 'text-cyan-300') : 'transition-colors group-hover:text-cyan-200'} />
                {item.label}
                <Badge item={item} />
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
          <a href="#/abo-bereich/profil" className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]">
            <ProfileAvatar profile={profile} size={36} />
            <div className="min-w-0">
              <ProfileName profile={profile} className="text-sm font-medium text-white" />
              <p className="truncate text-xs text-slate-500">@{profile?.username}</p>
            </div>
          </a>
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
              {isAdmin && <AdminBadge className="hidden sm:inline-flex" />}
              <a
                href="#/abo-bereich/profil"
                aria-label="Mein Profil"
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-1 transition-colors hover:border-cyan-400/40 hover:bg-white/[0.07] sm:pr-4"
              >
                <ProfileAvatar profile={profile} size={34} />
                <span className="hidden max-w-[10rem] text-sm font-medium text-white sm:block">
                  <ProfileName profile={profile} />
                </span>
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      {/* Mobile Tab-Leiste */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#080b12]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Abo-Bereich">
        <ul className="grid grid-cols-6">
          {nav.filter((item) => item.mobile).map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <a
                  href={`#${item.path}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${active ? 'text-cyan-300' : 'text-slate-500'}`}
                >
                  <span className="relative">
                    <Icon size={20} className={`transition-transform duration-300 ${active ? '-translate-y-0.5' : ''}`} />
                    <Badge item={item} compact />
                  </span>
                  {item.short}
                </a>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              aria-expanded={more}
              className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${more || nav.some((n) => !n.mobile && isActive(n.path)) ? 'text-cyan-300' : 'text-slate-500'}`}
            >
              <span className="grid h-5 place-items-center text-lg leading-none">⋯</span>
              Mehr
            </button>
          </li>
        </ul>
      </nav>
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Weitere Bereiche">
          <button type="button" tabIndex={-1} aria-label="Schließen" className="absolute inset-0 bg-black/60" onClick={() => setMore(false)} />
          <div className="animate-fade-up absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-[#0b0f18] p-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="font-oswald text-lg text-white">Weitere Bereiche</p>
              <button type="button" onClick={() => setMore(false)} aria-label="Schließen" className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-slate-300">
                <XIcon size={14} />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {nav.filter((n) => !n.mobile).map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <a href={`#${item.path}`} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${isActive(item.path) ? 'border-cyan-400/40 bg-cyan-400/10 text-white' : 'border-white/10 text-slate-200'}`}>
                      <Icon size={18} className={item.adminOnly ? 'text-amber-200' : 'text-cyan-300'} />
                      {item.label}
                    </a>
                  </li>
                );
              })}
              <li>
                <a href="#/abo-bereich/konto" className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                  <UserIcon size={18} className="text-cyan-300" /> Konto & Abo
                </a>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
