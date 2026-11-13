import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { formatEuro, getPlan, PLANS, type PlanId } from '../../config/plans';
import { useContent } from '../../content/ContentContext';
import { AlertIcon, ChatIcon, CheckIcon, CrownIcon, DownloadIcon, ImageIcon, MailIcon, PlayIcon, PostIcon, SearchIcon, TrashIcon, UploadIcon, UsersIcon } from '../../icons';
import { api, errorText } from '../../lib/api';
import { downloadBlob } from '../../lib/download';
import { formatDate } from '../libraryData';
import { AdminBadge, adminInput, ConfirmDialog } from './AdminUI';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatar?: string;
  role: 'member' | 'admin';
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
  disabled: boolean;
  subscription: { plan: PlanId; status: 'active' | 'canceled'; startedAt: string; renewsAt: string } | null;
  request: { id: string; plan: PlanId; createdAt: string } | null;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
  handled: number;
}

interface Stats {
  members: number;
  activeSubs: number;
  openRequests: number;
  openContact: number;
  posts: number;
  messages: number;
  storageMb: number;
}

type Filter = 'all' | 'requests' | 'active' | 'none';

const isActive = (u: AdminUser) => !!u.subscription && new Date(u.subscription.renewsAt) > new Date();

/** Verwaltung – nur für Admins (Server prüft jede Aktion zusätzlich). */
export function AdminPage() {
  const { isAdmin, user } = useAuth();
  const content = useContent();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [contact, setContact] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [grant, setGrant] = useState<AdminUser | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; label: string; run: () => Promise<void> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [u, c, s] = await Promise.all([api.get<AdminUser[]>('/admin/users'), api.get<ContactMessage[]>('/admin/contact'), api.get<Stats>('/admin/stats')]);
      setUsers(u);
      setContact(c);
      setStats(s);
    } catch (err) {
      setNotice({ ok: false, text: errorText(err) });
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setNotice({ ok: true, text: ok });
      await load();
    } catch (err) {
      setNotice({ ok: false, text: errorText(err) });
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.role !== 'admin')
      .filter((u) => (filter === 'requests' ? !!u.request : filter === 'active' ? isActive(u) : filter === 'none' ? !isActive(u) : true))
      .filter((u) => !q || `${u.displayName} ${u.email} ${u.username}`.toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.request) - Number(!!a.request));
  }, [users, filter, search]);

  if (!isAdmin) return null;

  const exportJson = () => {
    downloadBlob(new Blob([content.exportContent().json], { type: 'application/json' }), `bibliothek-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setNotice({ ok: true, text: 'Sicherung der Bibliothek wurde heruntergeladen (Dateien bleiben auf dem Server).' });
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      await content.importContent(await file.text());
      setNotice({ ok: true, text: 'Bibliothek wurde aus der Sicherung wiederhergestellt.' });
    } catch (err) {
      setNotice({ ok: false, text: errorText(err) });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const tiles = [
    { label: 'Mitglieder', value: stats?.members ?? '–', icon: UsersIcon, onClick: () => setFilter('all') },
    { label: 'Aktive Abos', value: stats?.activeSubs ?? '–', icon: CrownIcon, onClick: () => setFilter('active') },
    { label: 'Offene Abo-Anfragen', value: stats?.openRequests ?? '–', icon: AlertIcon, onClick: () => setFilter('requests'), hot: !!stats?.openRequests },
    { label: 'Kontaktanfragen', value: stats?.openContact ?? '–', icon: MailIcon, href: '#kontakt', hot: !!stats?.openContact },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 to-orange-500/5 p-6">
        <div>
          <AdminBadge />
          <h2 className="mt-3 font-oswald text-2xl tracking-wide text-white">Verwaltung</h2>
          <p className="mt-1 text-sm text-slate-400">Angemeldet als {user?.email}. Diese Seite ist nur für dich sichtbar.</p>
        </div>
        <a href="#/abo-bereich/bibliothek" className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-900">
          Bibliothek bearbeiten
        </a>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const body = (
            <>
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${t.hot ? 'bg-rose-400/20 text-rose-200' : 'bg-amber-300/15 text-amber-200'}`}>
                <Icon size={20} />
              </span>
              <span className="text-left">
                <span className="block text-2xl font-semibold text-white">{t.value}</span>
                <span className="text-sm text-slate-400">{t.label}</span>
              </span>
            </>
          );
          const cls = 'flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-300/30';
          return t.href ? (
            <a key={t.label} href={t.href} onClick={(e) => { e.preventDefault(); document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' }); }} className={cls}>{body}</a>
          ) : (
            <button key={t.label} type="button" onClick={t.onClick} className={cls}>{body}</button>
          );
        })}
      </section>

      {notice && (
        <p role="status" className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${notice.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
          {notice.ok ? <CheckIcon size={16} /> : <AlertIcon size={16} />} {notice.text}
        </p>
      )}

      {/* ---------- Mitglieder & Abos ---------- */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-oswald text-xl tracking-wide text-white">Mitglieder & Abos</h3>
          <div className="relative">
            <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name oder E-Mail suchen" aria-label="Mitglieder durchsuchen" className={`${adminInput} w-60 pl-9`} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 text-xs" role="tablist" aria-label="Filter">
          {([
            ['all', 'Alle'],
            ['requests', 'Abo-Anfragen'],
            ['active', 'Mit Abo'],
            ['none', 'Ohne Abo'],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 transition-colors ${filter === k ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Nach Zahlungseingang: „Abo freischalten“ wählen. Das Mitglied bekommt automatisch eine E-Mail. Bestehende Laufzeiten werden verlängert.</p>

        <ul className="mt-4 divide-y divide-white/5">
          {shown.map((u) => {
            const active = isActive(u);
            return (
              <li key={u.id} className={`flex flex-wrap items-center gap-3 py-3 ${u.disabled ? 'opacity-50' : ''}`}>
                <a href={`#/abo-bereich/profil?u=${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-semibold text-white">{u.displayName.charAt(0).toUpperCase()}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {u.displayName} <span className="text-xs font-normal text-slate-500">@{u.username}</span>
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {u.email} {!u.emailVerified && <span className="text-amber-300/80">· unbestätigt</span>} · seit {formatDate(u.createdAt)}
                    </span>
                  </span>
                </a>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  {u.request && (
                    <span className="rounded-full bg-rose-400/15 px-2.5 py-1 font-semibold text-rose-200">
                      Anfrage: {getPlan(u.request.plan).name} · {formatDate(u.request.createdAt)}
                    </span>
                  )}
                  {active ? (
                    <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 font-semibold text-emerald-300">
                      {getPlan(u.subscription!.plan).name} bis {formatDate(u.subscription!.renewsAt)}
                      {u.subscription!.status === 'canceled' && ' · gekündigt'}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-400">Kein Abo</span>
                  )}
                  {u.disabled && <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-rose-200">Gesperrt</span>}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setGrant(u)} className="rounded-lg bg-gradient-to-r from-amber-300 to-orange-500 px-3 py-1.5 text-xs font-semibold text-slate-900">
                    {active ? 'Verlängern' : 'Abo freischalten'}
                  </button>
                  {u.request && (
                    <button type="button" onClick={() => run(() => api.post(`/admin/requests/${u.request!.id}/dismiss`), 'Anfrage abgelehnt.')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                      Anfrage ablehnen
                    </button>
                  )}
                  {active && (
                    <button type="button" onClick={() => setConfirm({ title: 'Abo beenden', message: `Das Abo von ${u.displayName} endet sofort. Der Zugang zum Abo-Bereich wird gesperrt.`, label: 'Abo beenden', run: () => run(() => api.post(`/admin/users/${u.id}/subscription`, { action: 'end' }), 'Abo beendet.') })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                      Abo beenden
                    </button>
                  )}
                  <a href={`#/abo-bereich/chat?c=${u.id}`} aria-label={`${u.displayName} schreiben`} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5">
                    <ChatIcon size={14} />
                  </a>
                  <button type="button" onClick={() => run(() => api.post(`/admin/users/${u.id}/disable`, { disabled: !u.disabled }), u.disabled ? 'Konto entsperrt.' : 'Konto gesperrt.')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                    {u.disabled ? 'Entsperren' : 'Sperren'}
                  </button>
                  <button type="button" aria-label={`${u.displayName} löschen`} onClick={() => setConfirm({ title: 'Konto löschen', message: `Das Konto von ${u.displayName} (${u.email}) wird mit allen Posts, Nachrichten und Dateien endgültig gelöscht.`, label: 'Endgültig löschen', run: () => run(() => api.del(`/admin/users/${u.id}`), 'Konto gelöscht.') })} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-400/20 text-rose-300 hover:bg-rose-500/10">
                    <TrashIcon size={14} />
                  </button>
                </span>
              </li>
            );
          })}
          {shown.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Keine Mitglieder in dieser Ansicht.</li>}
        </ul>
      </section>

      {/* ---------- Kontaktanfragen ---------- */}
      <section id="kontakt" className="scroll-mt-24 rounded-3xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
        <h3 className="font-oswald text-xl tracking-wide text-white">Kontaktanfragen</h3>
        <ul className="mt-4 space-y-3">
          {contact.map((m) => (
            <li key={m.id} className={`rounded-2xl border p-4 ${m.handled ? 'border-white/5 bg-white/[0.02] opacity-70' : 'border-cyan-400/20 bg-cyan-400/[0.04]'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">
                  {m.name} · <a href={`mailto:${m.email}`} className="text-cyan-300 hover:underline">{m.email}</a>
                </p>
                <span className="text-xs text-slate-500">
                  {m.topic} · {new Date(m.createdAt).toLocaleString('de-DE')}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{m.message}</p>
              <div className="mt-3 flex gap-2 text-xs">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic}`)}`} className="rounded-lg bg-white/10 px-3 py-1.5 text-white hover:bg-white/15">Antworten</a>
                <button type="button" onClick={() => run(() => api.post(`/admin/contact/${m.id}/handled`, { handled: !m.handled }), m.handled ? 'Als offen markiert.' : 'Als erledigt markiert.')} className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">
                  {m.handled ? 'Wieder öffnen' : 'Erledigt'}
                </button>
                <button type="button" onClick={() => run(() => api.del(`/admin/contact/${m.id}`), 'Anfrage gelöscht.')} className="rounded-lg border border-rose-400/20 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10">
                  Löschen
                </button>
              </div>
            </li>
          ))}
          {contact.length === 0 && <li className="text-sm text-slate-500">Noch keine Nachrichten über das Kontaktformular.</li>}
        </ul>
      </section>

      {/* ---------- Bibliothek & Sicherung ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="font-oswald text-xl tracking-wide text-white">Bibliothek</h3>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Videos', value: content.videos.length, icon: PlayIcon, href: '#/abo-bereich/bibliothek?tab=videos' },
              { label: 'Fotos', value: content.photos.length, icon: ImageIcon, href: '#/abo-bereich/bibliothek?tab=fotos' },
              { label: 'Posts', value: content.posts.length, icon: PostIcon, href: '#/abo-bereich/bibliothek?tab=posts' },
            ].map((s) => (
              <a key={s.label} href={s.href} className="rounded-2xl bg-white/[0.03] p-3 hover:bg-white/[0.06]">
                <s.icon size={18} className="mx-auto text-amber-200" />
                <span className="mt-1 block text-xl font-semibold text-white">{s.value}</span>
                <span className="text-xs text-slate-400">{s.label}</span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Social Hub: {stats?.posts ?? '–'} Posts · Chat: {stats?.messages ?? '–'} Nachrichten · Speicher für Uploads: {stats?.storageMb ?? '–'} MB
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="font-oswald text-xl tracking-wide text-white">Sicherung</h3>
          <p className="mt-2 text-sm text-slate-400">Die komplette Datenbank und alle Dateien sichert der Server täglich automatisch (siehe Anleitung). Hier kannst du zusätzlich die Bibliotheks-Struktur exportieren.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={exportJson} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-50">
              <DownloadIcon size={16} /> Bibliothek exportieren
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/10">
              <UploadIcon size={16} /> Wiederherstellen
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => importJson(e.target.files?.[0])} />
          </div>
        </section>
      </div>

      {grant && <GrantDialog member={grant} onClose={() => setGrant(null)} onDone={(text) => run(async () => undefined, text)} />}
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.label} onConfirm={confirm.run} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function GrantDialog({ member, onClose, onDone }: { member: AdminUser; onClose: () => void; onDone: (text: string) => void }) {
  const [plan, setPlan] = useState<PlanId>(member.request?.plan ?? member.subscription?.plan ?? 'monthly');
  const [months, setMonths] = useState(getPlan(plan).months);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ renewsAt: string }>(`/admin/users/${member.id}/subscription`, { action: 'grant', plan, months });
      onDone(`Abo für ${member.displayName} freigeschaltet – gültig bis ${formatDate(res.renewsAt)}.`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Abo freischalten" className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0f18] p-6 shadow-2xl">
        <h3 className="font-oswald text-xl tracking-wide text-white">Abo für {member.displayName}</h3>
        <p className="mt-1 text-sm text-slate-400">{member.email}</p>
        <div className="mt-5 grid gap-2">
          {PLANS.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm ${plan === p.id ? 'border-amber-300/60 bg-amber-300/10 text-white' : 'border-white/10 text-slate-300'}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="plan" checked={plan === p.id} onChange={() => { setPlan(p.id); setMonths(p.months); }} className="accent-amber-300" />
                {p.name}
              </span>
              <span>{formatEuro(p.price)}</span>
            </label>
          ))}
        </div>
        <label className="mt-4 block text-xs font-medium text-slate-300">
          Laufzeit in Monaten
          <input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))} className={`${adminInput} mt-1.5`} />
        </label>
        {member.subscription && isActive(member) && <p className="mt-2 text-xs text-slate-500">Wird an die laufende Zeit (bis {formatDate(member.subscription.renewsAt)}) angehängt.</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Abbrechen</button>
          <button type="button" disabled={busy} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60">
            <CheckIcon size={16} /> {busy ? 'Wird freigeschaltet …' : 'Freischalten'}
          </button>
        </div>
      </div>
    </div>
  );
}

