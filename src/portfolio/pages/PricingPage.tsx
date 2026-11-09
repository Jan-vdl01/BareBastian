import { useAuth } from '../auth/AuthContext';
import { formatEuro, PLANS } from '../config/plans';
import { useInView } from '../hooks/useInView';
import { CheckIcon, CrownIcon, XIcon } from '../icons';

const COMPARISON: { feature: string; free: boolean; vip: boolean }[] = [
  { feature: 'Link-Hub mit allen Social-Links', free: true, vip: true },
  { feature: 'FAQ & Kontaktformular', free: true, vip: true },
  { feature: 'Premium-Videos in HD streamen', free: false, vip: true },
  { feature: 'Exklusive Fotoalben', free: false, vip: true },
  { feature: 'VIP-Posts & Updates', free: false, vip: true },
  { feature: 'Modularer Chaturbate-Bio-Baukasten', free: false, vip: true },
  { feature: '„Weiter ansehen“ auf allen Geräten*', free: false, vip: true },
];

const BILLING_FAQ = [
  { q: 'Kann ich jederzeit kündigen?', a: 'Ja. Du kündigst mit einem Klick im Abo-Bereich unter „Profil & Abo“. Bis zum Ende des bezahlten Zeitraums behältst du vollen Zugriff.' },
  { q: 'Verlängert sich mein Abo automatisch?', a: 'Ja, am Ende der Laufzeit verlängert sich das Abo um den gewählten Zeitraum – außer du hast vorher gekündigt.' },
  { q: 'Welche Zahlungsarten gibt es?', a: 'Die Zahlungsabwicklung wird gerade eingerichtet. Bis dahin läuft der Abo-Bereich im Demo-Modus, es wird nichts berechnet.' },
  { q: 'Erscheint der Name auf meiner Abrechnung?', a: 'Die genaue Bezeichnung auf der Abrechnung hängt vom Zahlungsanbieter ab und wird hier ergänzt, sobald er feststeht.' },
];

/** Öffentliche Preisseite für das Abo-Modell. */
export function PricingPage() {
  const { user, isSubscribed } = useAuth();
  const cards = useInView<HTMLDivElement>({ threshold: 0.1 });
  const table = useInView<HTMLDivElement>({ threshold: 0.1 });
  const cheapest = Math.min(...PLANS.map((p) => p.price / p.months));

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <div className="animate-fade-up text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
          <CrownIcon size={14} /> Abo-Bereich · VIP
        </span>
        <h1 className="mt-6 font-oswald text-5xl tracking-wide text-white sm:text-6xl">Preise</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Ein Abo, voller Zugriff: Premium-Videos, Fotos, exklusive Posts und der Chaturbate-Bio-Designer. Schon ab {formatEuro(cheapest)} pro Monat.
        </p>
      </div>

      {/* Pakete */}
      <div ref={cards.ref} className="mt-14 grid gap-5 md:grid-cols-3">
        {PLANS.map((plan, i) => {
          const featured = plan.id === 'quarterly';
          const perMonth = plan.price / plan.months;
          const saving = Math.round((1 - perMonth / PLANS[0].price) * 100);
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-7 backdrop-blur-xl transition-all duration-700 ${
                featured ? 'border-cyan-400/50 bg-gradient-to-b from-cyan-400/10 to-blue-600/10 shadow-2xl shadow-blue-900/40 md:-translate-y-3' : 'border-white/10 bg-slate-900/55'
              } ${cards.inView ? 'opacity-100' : 'translate-y-8 opacity-0'}`}
              style={{ transitionDelay: cards.inView ? `${i * 120}ms` : '0ms' }}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                  {plan.highlight}
                </span>
              )}
              <h2 className="font-oswald text-2xl tracking-wide text-white">{plan.name}</h2>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-semibold text-white">{formatEuro(perMonth)}</span>
                <span className="text-sm text-slate-400">/ Monat</span>
              </p>
              <p className="mt-2 min-h-5 text-sm text-slate-400">
                {plan.months === 1 ? 'monatlich kündbar' : `${formatEuro(plan.price)} alle ${plan.months} Monate`}
                {saving > 0 && <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">−{saving} %</span>}
              </p>
              <ul className="mt-7 flex-1 space-y-3 text-sm text-slate-300">
                {COMPARISON.filter((c) => c.vip && !c.free).map((c) => (
                  <li key={c.feature} className="flex gap-2.5">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-cyan-300" /> {c.feature.replace('*', '')}
                  </li>
                ))}
              </ul>
              <a
                href={isSubscribed ? '#/abo-bereich' : `#/abo?plan=${plan.id}`}
                className={`mt-8 block rounded-xl px-5 py-3.5 text-center text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                  featured
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl'
                    : 'border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {isSubscribed ? 'Zum Abo-Bereich' : user ? 'Paket wählen' : 'Paket wählen & anmelden'}
              </a>
            </article>
          );
        })}
      </div>

      {/* Vergleich */}
      <div ref={table.ref} className={`mt-24 transition-all duration-700 ${table.inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <h2 className="text-center font-oswald text-3xl tracking-wide text-white sm:text-4xl">Kostenlos vs. Abo</h2>
        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/55 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th scope="col" className="px-5 py-4 font-medium text-slate-400">Funktion</th>
                <th scope="col" className="w-24 px-3 py-4 text-center font-medium text-slate-400">Kostenlos</th>
                <th scope="col" className="w-24 bg-cyan-400/5 px-3 py-4 text-center font-semibold text-cyan-200">Abo</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-white/5 last:border-0">
                  <th scope="row" className="px-5 py-3.5 text-left font-normal text-slate-200">{row.feature}</th>
                  {[row.free, row.vip].map((ok, i) => (
                    <td key={i} className={`px-3 py-3.5 ${i === 1 ? 'bg-cyan-400/5' : ''}`}>
                      <span className={`mx-auto grid h-6 w-6 place-items-center rounded-full ${ok ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-600'}`}>
                        {ok ? <CheckIcon size={14} /> : <XIcon size={12} />}
                        <span className="sr-only">{ok ? 'enthalten' : 'nicht enthalten'}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-3 max-w-3xl text-xs text-slate-500">* Im Demo-Modus wird der Fortschritt pro Browser gespeichert.</p>
      </div>

      {/* Abrechnungs-FAQ */}
      <div className="mx-auto mt-24 max-w-4xl">
        <h2 className="text-center font-oswald text-3xl tracking-wide text-white sm:text-4xl">Fragen zur Abrechnung</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {BILLING_FAQ.map((f) => (
            <div key={f.q} className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 backdrop-blur-xl">
              <h3 className="font-sans text-base font-semibold text-white">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-xl rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-center text-xs text-amber-100/80">
        Demo-Modus: Preise sind vorläufig, es wird noch nichts berechnet. Alle Preise inkl. MwSt.
      </p>
    </section>
  );
}
