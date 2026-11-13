import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { authApi, type PublicConfig } from '../auth/authService';
import { formatEuro, getPlan, PLAN_FEATURES, PLANS, type PlanId } from '../config/plans';
import { PROFILE } from '../data';
import { ArrowLeft, CheckIcon, ClockIcon, CrownIcon, ExternalLink, LockIcon, LogoutIcon } from '../icons';
import { errorText } from '../lib/api';
import { navigate } from '../router';
import { formatDate } from '../dashboard/libraryData';

/** Paywall: Nur mit aktivem Abo geht es weiter in den Abo-Bereich. */
export function SubscribePage({ query }: { query: URLSearchParams }) {
  const { user, requestSubscription, withdrawRequest, refreshUser, logout } = useAuth();
  const requested = query.get('plan');
  const [selected, setSelected] = useState<PlanId>(PLANS.some((p) => p.id === requested) ? (requested as PlanId) : 'quarterly');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const pending = user?.pendingRequest;
  const expired = user?.subscription && new Date(user.subscription.renewsAt) <= new Date();

  useEffect(() => {
    authApi.config().then(setConfig).catch(() => undefined);
  }, []);

  // Während eine Anfrage offen ist, regelmäßig prüfen, ob das Abo freigeschaltet wurde
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => document.visibilityState === 'visible' && refreshUser(), 30000);
    return () => clearInterval(t);
  }, [pending, refreshUser]);

  const handleRequest = async () => {
    if (!consent) return setError('Bitte bestätige den Hinweis zum Widerrufsrecht.');
    setBusy(true);
    setError(null);
    try {
      await requestSubscription(selected);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="animate-fade-in relative min-h-dvh overflow-hidden bg-[#06080d] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.25),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.15),transparent_55%)]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <a href="#/preise" className="group inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" /> Zu den Preisen
          </a>
          {user && (
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <LogoutIcon size={16} /> Abmelden
            </button>
          )}
        </div>

        <div className="mt-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            <LockIcon size={14} /> Nur für Abonnenten
          </span>
          <h1 className="mt-5 font-oswald text-4xl tracking-wide text-white sm:text-5xl">Werde Teil von {PROFILE.name}</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            {user ? `Hallo ${user.displayName}! ` : ''}Mit einem Abo schaltest du den Abo-Bereich frei: Premium-Videos, Fotos, Posts und den Chaturbate-Bio-Designer.
          </p>
        </div>

        {pending && (
          <section className="mx-auto mt-10 max-w-xl rounded-3xl border border-cyan-400/30 bg-cyan-400/[0.06] p-6 backdrop-blur-xl sm:p-8" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200">
                <ClockIcon size={20} />
              </span>
              <div>
                <p className="font-oswald text-xl tracking-wide text-white">Anfrage gesendet</p>
                <p className="text-sm text-slate-400">
                  {getPlan(pending.plan).name} · {formatEuro(getPlan(pending.plan).price)} · am {formatDate(pending.createdAt)}
                </p>
              </div>
            </div>
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-300">{config?.payment.info ?? 'Du erhältst die Zahlungsinformationen per E-Mail.'}</p>
            {config?.payment.links[pending.plan] && (
              <a href={config.payment.links[pending.plan]} target="_blank" rel="noopener noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white">
                Jetzt bezahlen <ExternalLink size={16} />
              </a>
            )}
            <p className="mt-4 text-xs text-slate-500">Sobald die Zahlung eingegangen ist, wird dein Abo freigeschaltet und du bekommst eine E-Mail. Diese Seite aktualisiert sich automatisch.</p>
            <button type="button" onClick={() => withdrawRequest().catch(() => undefined)} className="mt-4 text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline">
              Anfrage zurückziehen / anderes Paket wählen
            </button>
          </section>
        )}

        {expired && !pending && (
          <p className="mx-auto mt-8 max-w-xl rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-center text-sm text-amber-100">
            Dein Abo ist am {formatDate(user!.subscription!.renewsAt)} abgelaufen. Wähle ein Paket, um es zu verlängern.
          </p>
        )}

        {!pending && (
        <>
        <div className="mt-12 grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Abo-Paket wählen">
          {PLANS.map((plan) => {
            const active = plan.id === selected;
            const perMonth = plan.price / plan.months;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(plan.id)}
                className={`relative rounded-3xl border p-6 text-left backdrop-blur-xl transition-all duration-300 ${
                  active
                    ? 'border-cyan-400/60 bg-gradient-to-b from-cyan-400/10 to-blue-600/10 shadow-2xl shadow-blue-900/40 md:-translate-y-2'
                    : 'border-white/10 bg-slate-900/50 hover:border-white/25'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                    {plan.highlight}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-oswald text-xl tracking-wide text-white">{plan.name}</span>
                  <span className={`grid h-6 w-6 place-items-center rounded-full border transition-colors ${active ? 'border-cyan-300 bg-cyan-400 text-slate-900' : 'border-white/25'}`}>
                    {active && <CheckIcon size={14} strokeWidth={3} />}
                  </span>
                </div>
                <p className="mt-5 text-4xl font-semibold text-white">{formatEuro(plan.price)}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {plan.months === 1 ? 'pro Monat' : `für ${plan.months} Monate · ${formatEuro(perMonth)}/Monat`}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl sm:p-8">
          <ul className="space-y-3">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <CheckIcon size={14} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {user ? (
            <>
              <label className="mt-6 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-slate-400">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400" />
                Ich stimme ausdrücklich zu, dass der Zugang zu den digitalen Inhalten vor Ablauf der Widerrufsfrist freigeschaltet wird. Mir ist bekannt, dass ich dadurch mein Widerrufsrecht verliere.
              </label>
              {error && (
                <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleRequest}
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <CrownIcon size={18} />}
                {busy ? 'Wird gesendet …' : `Abo anfragen – ${formatEuro(getPlan(selected).price)}`}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">Keine automatische Verlängerung. Die Zahlungsinformationen bekommst du nach der Anfrage.</p>
            </>
          ) : (
            <a
              href={`#/login?mode=register&next=${encodeURIComponent(`/abo?plan=${selected}`)}`}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30"
            >
              <LockIcon size={16} /> Konto erstellen oder anmelden
            </a>
          )}
        </div>
        </>
        )}
      </div>
    </main>
  );
}
