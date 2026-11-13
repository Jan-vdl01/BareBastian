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
  request: { id: string; plan: PlanId; createdAt: string; code?: string | null; percent?: number | null; price?: number | null } | null;
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
                      Anfrage: {getPlan(u.request.plan).name} · {formatEuro(u.request.price ?? getPlan(u.request.plan).price)}
                      {u.request.code ? ` · Code ${u.request.code} (−${u.request.percent} %)` : ''} · {formatDate(u.request.createdAt)}
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

      <CodesCard onNotice={setNotice} />

      <SettingsCard onNotice={setNotice} />

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


interface SiteSettings {
  mailFrom: string;
  notifyEmail: string;
  paymentInfo: string;
  paymentLinks: Partial<Record<PlanId, string>>;
}

/** Zahlungstext, Bezahl-Links und E-Mail-Adressen (nur in der Webhosting-Version direkt hier änderbar). */
function SettingsCard({ onNotice }: { onNotice: (n: { ok: boolean; text: string }) => void }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<SiteSettings>('/admin/settings')
      .then(setSettings)
      .catch(() => setSettings(null)); // VPS-Version: Einstellungen stehen in der .env-Datei
  }, []);
  if (!settings) return null;
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setSettings((s) => (s ? { ...s, [k]: v } : s));

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/admin/settings', settings);
      onNotice({ ok: true, text: 'Einstellungen gespeichert.' });
    } catch (err) {
      onNotice({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };
  const testMail = async () => {
    try {
      const r = await api.post<{ to: string }>('/admin/settings/test-mail');
      onNotice({ ok: true, text: `Test-E-Mail an ${r.to} gesendet. Schau auch im Spam-Ordner nach.` });
    } catch (err) {
      onNotice({ ok: false, text: errorText(err) });
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
      <h3 className="font-oswald text-xl tracking-wide text-white">Einstellungen</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block text-xs font-medium text-slate-300 lg:col-span-2">
          Zahlungstext (sehen Mitglieder nach einer Abo-Anfrage, auch per E-Mail)
          <textarea rows={3} value={settings.paymentInfo} onChange={(e) => set('paymentInfo', e.target.value)} className={`${adminInput} mt-1.5 resize-y`} />
        </label>
        {PLANS.map((p) => (
          <label key={p.id} className="block text-xs font-medium text-slate-300">
            Bezahl-Link „{p.name}“ (optional)
            <input type="url" placeholder="https://…" value={settings.paymentLinks[p.id] ?? ''} onChange={(e) => set('paymentLinks', { ...settings.paymentLinks, [p.id]: e.target.value })} className={`${adminInput} mt-1.5`} />
          </label>
        ))}
        <label className="block text-xs font-medium text-slate-300">
          Absender-Adresse für E-Mails
          <input type="email" value={settings.mailFrom} onChange={(e) => set('mailFrom', e.target.value)} className={`${adminInput} mt-1.5`} />
        </label>
        <label className="block text-xs font-medium text-slate-300">
          Benachrichtigungen an
          <input type="email" value={settings.notifyEmail} onChange={(e) => set('notifyEmail', e.target.value)} className={`${adminInput} mt-1.5`} />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60">
          <CheckIcon size={16} /> {busy ? 'Wird gespeichert …' : 'Speichern'}
        </button>
        <button type="button" onClick={testMail} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/10">
          <MailIcon size={16} /> Test-E-Mail senden
        </button>
      </div>
    </section>
  );
}

interface DiscountCode {
  id: string;
  code: string;
  percent: number;
  months: number | null;
  maxUses: number | null;
  used: number;
  expiresAt: string | null;
  active: boolean;
  note: string;
  createdAt: string;
}

const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

/** Rabattcodes: Prozent-Rabatt auf ein Abo oder kostenloser Zugang (100 %), z. B. für Testkonten. */
function CodesCard({ onNotice }: { onNotice: (n: { ok: boolean; text: string }) => void }) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [kind, setKind] = useState<'percent' | 'free'>('percent');
  const [form, setForm] = useState({ code: '', percent: 20, months: 1, maxUses: '', expiresAt: '', note: '' });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(() => api.get<DiscountCode[]>('/admin/codes').then(setCodes).catch(() => undefined), []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const c = await api.post<DiscountCode>('/admin/codes', {
        code: form.code,
        percent: kind === 'free' ? 100 : form.percent,
        months: kind === 'free' ? form.months : null,
        maxUses: form.maxUses === '' ? null : Number(form.maxUses),
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        note: form.note,
      });
      onNotice({ ok: true, text: `Code ${c.code} wurde erstellt.` });
      // Felder leeren, damit Begrenzungen nicht versehentlich für den nächsten Code gelten
      setForm((f) => ({ ...f, code: '', note: '', maxUses: '', expiresAt: '' }));
      await load();
    } catch (err) {
      onNotice({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn: () => Promise<unknown>, text: string) => {
    try {
      await fn();
      onNotice({ ok: true, text });
      await load();
    } catch (err) {
      onNotice({ ok: false, text: errorText(err) });
    }
  };
  const status = (c: DiscountCode) => {
    if (!c.active) return { text: 'Pausiert', cls: 'bg-white/5 text-slate-400' };
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { text: 'Abgelaufen', cls: 'bg-rose-500/15 text-rose-200' };
    if (c.maxUses !== null && c.used >= c.maxUses) return { text: 'Aufgebraucht', cls: 'bg-amber-400/15 text-amber-200' };
    return { text: 'Aktiv', cls: 'bg-emerald-400/15 text-emerald-300' };
  };
  const label = 'block text-xs font-medium text-slate-300';

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
      <h3 className="font-oswald text-xl tracking-wide text-white">Rabatt- & Zugangscodes</h3>
      <p className="mt-1 text-xs text-slate-500">Mitglieder geben den Code bei der Registrierung oder bei der Abo-Auswahl ein. Ein Zugangscode schaltet das Abo sofort kostenlos frei – praktisch für Testkonten oder Geschenke.</p>

      <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs" role="tablist" aria-label="Art des Codes">
        {([
          ['percent', 'Rabatt in %'],
          ['free', 'Kostenloser Zugang'],
        ] as const).map(([k, text]) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-1.5 transition-colors ${kind === k ? 'bg-white/10 font-semibold text-white' : 'text-slate-400'}`}>
            {text}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className={`${label} lg:col-span-2`}>
          Code
          <span className="mt-1.5 flex gap-2">
            <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="z. B. SOMMER20" maxLength={30} className={`${adminInput} uppercase tracking-wider`} />
            <button type="button" onClick={() => set('code', randomCode())} className="shrink-0 rounded-xl border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5">
              Zufällig
            </button>
          </span>
        </label>
        {kind === 'percent' ? (
          <label className={label}>
            Rabatt in %
            <input type="number" min={1} max={99} value={form.percent} onChange={(e) => set('percent', Math.max(1, Math.min(99, Number(e.target.value) || 1)))} className={`${adminInput} mt-1.5`} />
          </label>
        ) : (
          <label className={label}>
            Zugang für Monate
            <input type="number" min={1} max={120} value={form.months} onChange={(e) => set('months', Math.max(1, Math.min(120, Number(e.target.value) || 1)))} className={`${adminInput} mt-1.5`} />
          </label>
        )}
        <label className={label}>
          Max. Einlösungen
          <input type="number" min={1} value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} placeholder="unbegrenzt" className={`${adminInput} mt-1.5`} />
        </label>
        <label className={label}>
          Gültig bis
          <input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} className={`${adminInput} mt-1.5`} />
        </label>
        <label className={label}>
          Notiz (nur für dich)
          <input value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={200} placeholder="z. B. Testkonto" className={`${adminInput} mt-1.5`} />
        </label>
      </div>
      <button type="button" disabled={busy || form.code.length < 3} onClick={create} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50">
        <CheckIcon size={16} /> {busy ? 'Wird erstellt …' : 'Code erstellen'}
      </button>

      <ul className="mt-5 divide-y divide-white/5">
        {codes.map((c) => {
          const st = status(c);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <button
                type="button"
                title="Code kopieren"
                onClick={() => navigator.clipboard?.writeText(c.code).then(() => onNotice({ ok: true, text: `Code ${c.code} kopiert.` }))}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-sm font-semibold tracking-wider text-white hover:bg-white/10"
              >
                {c.code}
              </button>
              <span className="min-w-0 flex-1 text-slate-300">
                {c.percent >= 100 ? `Kostenloser Zugang · ${c.months} ${c.months === 1 ? 'Monat' : 'Monate'}` : `${c.percent} % Rabatt`}
                <span className="block text-xs text-slate-500">
                  {c.used}
                  {c.maxUses !== null ? ` / ${c.maxUses}` : ''} eingelöst
                  {c.expiresAt ? ` · gültig bis ${formatDate(c.expiresAt)}` : ''}
                  {c.note ? ` · ${c.note}` : ''}
                </span>
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.text}</span>
              <button type="button" onClick={() => act(() => api.post(`/admin/codes/${c.id}/active`, { active: !c.active }), c.active ? 'Code pausiert.' : 'Code aktiviert.')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                {c.active ? 'Pausieren' : 'Aktivieren'}
              </button>
              <button type="button" aria-label={`Code ${c.code} löschen`} onClick={() => act(() => api.del(`/admin/codes/${c.id}`), 'Code gelöscht.')} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-400/20 text-rose-300 hover:bg-rose-500/10">
                <TrashIcon size={14} />
              </button>
            </li>
          );
        })}
        {codes.length === 0 && <li className="py-4 text-sm text-slate-500">Noch keine Codes erstellt.</li>}
      </ul>
    </section>
  );
}
