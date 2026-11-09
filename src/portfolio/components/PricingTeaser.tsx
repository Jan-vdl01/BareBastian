import { useAuth } from '../auth/AuthContext';
import { formatEuro, PLAN_FEATURES, PLANS } from '../config/plans';
import { useInView } from '../hooks/useInView';
import { ArrowRight, CheckIcon, CrownIcon } from '../icons';

/** Hinweis auf der Startseite: Abo-Bereich & Preise. */
export function PricingTeaser() {
  const { isSubscribed } = useAuth();
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const cheapest = Math.min(...PLANS.map((p) => p.price / p.months));

  return (
    <section className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/80 via-blue-950/60 to-violet-950/60 p-7 backdrop-blur-xl transition-all duration-700 sm:p-9 ${
          inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative grid gap-8 sm:grid-cols-[1.2fr_1fr] sm:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <CrownIcon size={14} /> Abo-Bereich
            </p>
            <h2 className="mt-3 font-oswald text-3xl tracking-wide text-white sm:text-4xl">Werde VIP</h2>
            <p className="mt-2 text-slate-400">
              Premium-Inhalte & Tools – ab <span className="font-semibold text-white">{formatEuro(cheapest)}</span> im Monat.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#/preise"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5"
              >
                Preise ansehen <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href={isSubscribed ? '#/abo-bereich' : '#/login'}
                className="inline-flex items-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
              >
                {isSubscribed ? 'Zum Abo-Bereich' : 'Anmelden'}
              </a>
            </div>
          </div>
          <ul className="space-y-2.5">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm text-slate-300">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-cyan-300" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
