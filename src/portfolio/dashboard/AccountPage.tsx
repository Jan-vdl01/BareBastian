import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatEuro, getPlan } from '../config/plans';
import { CrownIcon, LogoutIcon } from '../icons';
import { navigate } from '../router';
import { ADMIN_EMAIL } from '../config/admin';
import { AdminBadge } from './admin/AdminUI';
import { ProfileAvatar } from './profile/ProfileAvatar';
import { formatDate } from './libraryData';

export function AccountPage() {
  const { user, profile, isAdmin, cancelSubscription, resumeSubscription, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const sub = user.subscription;
  const plan = sub ? getPlan(sub.plan) : null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const providerLabel = { password: 'E-Mail & Passwort', google: 'Google', github: 'GitHub' }[user.provider];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <ProfileAvatar profile={profile} size={56} />
          <div className="min-w-0">
            <p className="truncate font-oswald text-2xl tracking-wide text-white">{user.displayName}</p>
            <a href="#/abo-bereich/profil" className="text-xs text-cyan-300 hover:underline">Öffentliches Profil ansehen</a>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
          </div>
        </div>
        <dl className="mt-6 divide-y divide-white/5 text-sm">
          {[
            ['Mitglied seit', formatDate(user.createdAt)],
            ['Anmeldung über', providerLabel],
            ['Konto-ID', user.id],
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
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Du bist als Admin angemeldet ({ADMIN_EMAIL}). Du brauchst kein Abo und kannst Videos, Fotos und Posts in der Bibliothek verwalten.
          </p>
          <a href="#/abo-bereich/verwaltung" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-900">
            Zur Verwaltung
          </a>
          <p className="mt-5 text-xs text-slate-500">Admin-Passwort ändern: siehe src/portfolio/config/admin.ts</p>
        </section>
      ) : sub && plan ? (
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-oswald text-xl tracking-wide text-white">Dein Abo</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                sub.status === 'active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'
              }`}
            >
              {sub.status === 'active' ? 'Aktiv' : 'Gekündigt'}
            </span>
          </div>
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 p-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white"><CrownIcon size={20} /></span>
            <div>
              <p className="font-medium text-white">{plan.name}</p>
              <p className="text-sm text-slate-400">{formatEuro(plan.price)} {plan.months === 1 ? 'pro Monat' : `alle ${plan.months} Monate`}</p>
            </div>
          </div>
          <dl className="mt-4 divide-y divide-white/5 text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-slate-500">Gestartet</dt>
              <dd className="text-slate-200">{formatDate(sub.startedAt)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-slate-500">{sub.status === 'active' ? 'Verlängert sich am' : 'Zugang bis'}</dt>
              <dd className="text-slate-200">{formatDate(sub.renewsAt)}</dd>
            </div>
          </dl>
  
          {sub.status === 'active' ? (
            confirming ? (
              <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
                <p className="text-sm text-rose-100">Wirklich kündigen? Du behältst den Zugang bis {formatDate(sub.renewsAt)}.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy} onClick={() => run(cancelSubscription)} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    Ja, kündigen
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="mt-6 text-sm text-slate-400 underline-offset-4 hover:text-rose-200 hover:underline">
                Abo kündigen
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(resumeSubscription)}
              className="mt-6 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              Abo fortsetzen
            </button>
          )}
          <p className="mt-6 text-xs text-slate-500">Demo-Modus: Abo-Daten werden nur in diesem Browser gespeichert.</p>
        </section>
      ) : null}
    </div>
  );
}
