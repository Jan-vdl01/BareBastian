import { useId, useState } from 'react';
import { FAQ_ITEMS } from '../data';
import { useInView } from '../hooks/useInView';

/** Plus-Symbol, dessen vertikaler Balken beim Öffnen wegrotiert → Minus. */
function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-500 ${
        open ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200' : 'border-white/15 bg-white/5 text-slate-300'
      }`}
      aria-hidden="true"
    >
      <span className="absolute h-0.5 w-3.5 rounded-full bg-current" />
      <span
        className={`absolute h-3.5 w-0.5 rounded-full bg-current transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${
          open ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
        }`}
      />
    </span>
  );
}

/**
 * Glasmorphism-FAQ: dunkle, unscharfe Glas-Karten, grid-basiertes Auf-/Zuklappen,
 * nur ein Element gleichzeitig geöffnet.
 */
export function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);
  const { ref, inView } = useInView<HTMLDivElement>();
  const uid = useId();

  return (
    <section id="faq" className="relative scroll-mt-16 py-24">
      {/* leicht abgedunkelter Hintergrund mit weichen Kanten */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/45 to-transparent" />

      <div ref={ref} className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className={`text-center transition-all duration-700 ${inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">FAQ</p>
          <h2 className="mt-3 font-oswald text-4xl tracking-wide text-white sm:text-5xl">Häufige Fragen</h2>
          <p className="mx-auto mt-4 max-w-md text-slate-400">Alles Wichtige auf einen Blick – noch Fragen? Schreib mir einfach.</p>
        </div>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const open = openId === item.id;
            const btnId = `${uid}-q-${item.id}`;
            const panelId = `${uid}-a-${item.id}`;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border backdrop-blur-xl transition-all duration-700 ${
                  open
                    ? 'border-white/20 bg-slate-900/55 shadow-[0_8px_40px_-12px_rgba(34,211,238,0.25)]'
                    : 'border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-slate-900/45'
                } ${inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
                style={{ transitionDelay: inView ? `${150 + i * 70}ms` : '0ms' }}
              >
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  >
                    <span className={`text-base font-medium transition-colors duration-300 sm:text-lg ${open ? 'text-white' : 'text-slate-200'}`}>
                      {item.question}
                    </span>
                    <PlusMinus open={open} />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                  inert={!open}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-6 leading-relaxed text-slate-400 sm:px-6">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
