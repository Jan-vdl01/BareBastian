import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../auth/authService';
import { formatEuro, getPlan } from '../config/plans';
import { AlertIcon, CheckIcon, CrownIcon, DownloadIcon, LockIcon, LogoutIcon, MailIcon, TrashIcon } from '../icons';
import { errorText } from '../lib/api';
import { navigate } from '../router';
import { AdminBadge, adminInput } from './admin/AdminUI';
import { formatDate } from './libraryData';
import { ProfileAvatar } from './profile/ProfileAvatar';

const card = 'rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl';

function Notice({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role={ok ? 'status' : 'alert'} className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
      {ok ? <CheckIcon size={15} /> : <AlertIcon size={15} />} {children}
    </p>
  );
}

export function AccountPage() {
  const { user, profile, isAdmin, logout, setUser } = useAuth();
  const [verifyNote, setVerifyNote] = useState<string | null>(null);
  if (!user) return null;
  const sub = user.subscription;
  const plan = sub ? getPlan(sub.plan) : null;
  const active = !!sub && new Date(sub.renewsAt) > new Date();
  const daysLeft = sub ? Math.ceil((new Date(sub.renewsAt).getTime() - Date.now()) / 86400000) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={card}>
        <div className="flex items-center gap-4">
          <ProfileAvatar profile={profile} size={56} />
          <div className="min-w-0">
            <p className="truncate font-oswald text-2xl tracking-wide text-white">{user.displayName}</p>
            <a href="#/abo-bereich/profil" className="text-xs text-cyan-300 hover:underline">
              Öffentliches Profil ansehen
            </a>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
          </div>
        </div>
        {!user.emailVerified && (
          <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm text-amber-100">
            <p className="flex items-center gap-2">
              <MailIcon size={16} /> Bitte bestätige deine E-Mail-Adresse (Link in der Willkommens-Mail).
            </p>
            <button
              type="button"
              onClick={() =>
                authApi
                  .resendVerification()
                  .then(() => setVerifyNote('Neue Bestätigungs-E-Mail wurde gesendet.'))
                  .catch((err) => setVerifyNote(errorText(err)))
              }
              className="mt-2 text-xs text-amber-200 underline underline-offset-4"
            >
              E-Mail erneut senden
            </button>
            {verifyNote && <p className="mt-1 text-xs text-amber-200/80">{verifyNote}</p>}
          </div>
        )}
        <dl className="mt-6 divide-y divide-white/5 text-sm">
          {[
            ['Mitglied seit', formatDate(user.createdAt)],
            ['E-Mail bestätigt', user.emailVerified ? 'Ja' : 'Nein'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">{k}</dt>
              <dd className="truncate text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogoutIcon size={16} /> Abmelden
        </button>
      </section>

      {isAdmin ? (
        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-oswald text-xl tracking-wide text-white">Admin-Zugang</h2>
            <AdminBadge />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">Du brauchst kein Abo. In der Verwaltung schaltest du Abos frei, betreust Mitglieder und beantwortest Kontaktanfragen.</p>
          <a href="#/abo-bereich/verwaltung" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-900">
            Zur Verwaltung
          </a>
        </section>
      ) : (
        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-oswald text-xl tracking-wide text-white">Dein Abo</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-300'}`}>{active ? 'Aktiv' : 'Kein aktives Abo'}</span>
          </div>
          {sub && plan && (
            <>
              <div className="mt-5 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 p-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
                  <CrownIcon size={20} />
                </span>
                <div>
                  <p className="font-medium text-white">{plan.name}</p>
                  <p className="text-sm text-slate-400">
                    {formatEuro(plan.price)} {plan.months === 1 ? 'pro Monat' : `für ${plan.months} Monate`}
                  </p>
                </div>
              </div>
              <dl className="mt-4 divide-y divide-white/5 text-sm">
                <div className="flex justify-between py-3">
                  <dt className="text-slate-500">Gestartet</dt>
                  <dd className="text-slate-200">{formatDate(sub.startedAt)}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-slate-500">Zugang bis</dt>
                  <dd className="text-slate-200">
                    {formatDate(sub.renewsAt)}
                    {active && daysLeft <= 14 && <span className="ml-2 text-amber-200">(noch {daysLeft} Tage)</span>}
                  </dd>
                </div>
              </dl>
            </>
          )}
          <p className="mt-4 text-xs text-slate-500">Das Abo verlängert sich nicht automatisch – du musst nichts kündigen. Zum Verlängern einfach eine neue Anfrage stellen.</p>
          {user.pendingRequest ? (
            <a href="#/abo" className="mt-5 inline-flex rounded-xl border border-cyan-400/40 px-4 py-2.5 text-sm text-cyan-200">
              Offene Anfrage: {getPlan(user.pendingRequest.plan).name} – Details
            </a>
          ) : (
            <a href="#/abo" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white">
              <CrownIcon size={16} /> {active ? 'Abo verlängern' : 'Abo anfragen'}
            </a>
          )}
        </section>
      )}

      <ChangePassword />
      <PrivacyCard isAdmin={isAdmin} onDeleted={async () => {
        await setUser(null);
        navigate('/');
      }} />
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setMsg({ ok: false, text: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' });
    setBusy(true);
    setMsg(null);
    try {
      await authApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setMsg({ ok: true, text: 'Passwort geändert. Andere Geräte wurden abgemeldet.' });
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={card} noValidate>
      <h2 className="flex items-center gap-2 font-oswald text-xl tracking-wide text-white">
        <LockIcon size={18} /> Passwort ändern
      </h2>
      <div className="mt-5 grid gap-3">
        <label className="text-xs font-medium text-slate-300">
          Aktuelles Passwort
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={`${adminInput} mt-1.5`} />
        </label>
        <label className="text-xs font-medium text-slate-300">
          Neues Passwort (mind. 8 Zeichen)
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={`${adminInput} mt-1.5`} />
        </label>
      </div>
      {msg && <Notice ok={msg.ok}>{msg.text}</Notice>}
      <button type="submit" disabled={busy || !current || !next} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50">
        {busy ? 'Wird gespeichert …' : 'Passwort speichern'}
      </button>
    </form>
  );
}

function PrivacyCard({ isAdmin, onDeleted }: { isAdmin: boolean; onDeleted: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.deleteAccount(password);
      await onDeleted();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <section className={card}>
      <h2 className="font-oswald text-xl tracking-wide text-white">Deine Daten</h2>
      <p className="mt-2 text-sm text-slate-400">Lade alle über dich gespeicherten Daten herunter oder lösche dein Konto vollständig.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href="/api/account/export" download="meine-daten.json" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/10">
          <DownloadIcon size={16} /> Daten herunterladen
        </a>
        {!isAdmin && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 px-4 py-2.5 text-sm text-rose-200 hover:bg-rose-500/10">
            <TrashIcon size={16} /> Konto löschen
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-100">Dein Konto, Profil, alle Posts, Kommentare, Nachrichten, Uploads und persönlichen Daten werden endgültig gelöscht. Ein laufendes Abo verfällt.</p>
          <label className="mt-3 block text-xs font-medium text-rose-100">
            Zur Bestätigung dein Passwort
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${adminInput} mt-1.5`} />
          </label>
          {error && <Notice ok={false}>{error}</Notice>}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy || !password} onClick={remove} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Wird gelöscht …' : 'Endgültig löschen'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
