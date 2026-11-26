import type { ReactNode } from 'react';
import { CREATOR_INFO } from '../../data/content';
import type { LegalModalType } from '../../types';
import { LINK_GROUPS, NAV_ITEMS, PROFILE, SOCIAL_ICONS } from '../data';
import { ArrowRight, MailIcon } from '../icons';
import { useInView } from '../hooks/useInView';

interface SplitFooterProps {
  onOpenContact: () => void;
  onOpenLegal: (type: Exclude<LegalModalType, 'none'>) => void;
}

/** Text-Link mit animierter Unterstreichung (wächst beim Hover von links). */
function UnderlineLink({ href, children, onClick, external }: { href?: string; children: ReactNode; onClick?: () => void; external?: boolean }) {
  const cls =
    "relative inline-block text-sm text-slate-400 transition-colors duration-300 hover:text-white after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-gradient-to-r after:from-cyan-300 after:to-blue-500 after:transition-transform after:duration-300 after:ease-out hover:after:origin-left hover:after:scale-x-100 focus-visible:after:scale-x-100";
  if (!href) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    );
  }
  return (
    <a href={href} className={cls} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
      {children}
    </a>
  );
}

const SOCIAL_HOVER: Record<string, string> = {
  instagram: 'hover:bg-gradient-to-br hover:from-amber-400 hover:via-pink-500 hover:to-purple-600 hover:border-transparent',
  x: 'hover:bg-white hover:text-black hover:border-white',
  telegram: 'hover:bg-[#229ED9] hover:border-[#229ED9]',
  mail: 'hover:bg-cyan-500 hover:border-cyan-500',
};

/**
 * Geteilter Footer: heller oberer Bereich, dunkler unterer Bereich,
 * dazwischen eine blaue Gradient-CTA-Karte. Einblendung per Scroll-Trigger.
 */
export function SplitFooter({ onOpenContact, onOpenLegal }: SplitFooterProps) {
  const top = useInView<HTMLDivElement>({ threshold: 0.2 });
  const bottom = useInView<HTMLDivElement>({ threshold: 0.1 });

  const reveal = (visible: boolean, delay = 0) => ({
    className: `transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`,
    style: { transitionDelay: visible ? `${delay}ms` : '0ms' },
  });

  const platformLinks = LINK_GROUPS.slice(1).flatMap((g) => g.links.slice(0, 2));

  return (
    <footer id="footer" className="relative z-10 scroll-mt-16">
      {/* Heller Bereich */}
      <div className="bg-gradient-to-b from-slate-50 to-slate-200 pb-44 pt-20 text-slate-900">
        <div ref={top.ref} className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-end">
          <div {...reveal(top.inView)}>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">Stay connected</p>
            <h2 className="mt-3 font-oswald text-4xl leading-tight tracking-wide sm:text-5xl">
              Lass uns in Verbindung bleiben.
            </h2>
          </div>
          <p {...reveal(top.inView, 120)} className={`${reveal(top.inView, 120).className} text-slate-600 md:text-right`}>
            Neue Releases, Live-Termine und exklusive Drops – zuerst auf meinen Kanälen.
          </p>
        </div>
      </div>

      {/* Dunkler Bereich */}
      <div className="flow-root bg-[#05070b] pb-10 text-slate-300">
        <div ref={bottom.ref} className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* CTA-Karte – überlappt die Trennlinie */}
          <div {...reveal(bottom.inView)} className={`${reveal(bottom.inView).className} -mt-32`}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-8 shadow-2xl shadow-blue-900/40 sm:p-12">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-lg">
                  <h3 className="font-oswald text-3xl tracking-wide text-white sm:text-4xl">Anfrage, Idee oder Kooperation?</h3>
                  <p className="mt-3 text-blue-100">Ich freue mich über deine Nachricht und melde mich so schnell wie möglich.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onOpenContact}
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <MailIcon size={16} /> Kontakt aufnehmen
                    <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                  <a
                    href="#links"
                    className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Alle Links
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Spalten */}
          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div {...reveal(bottom.inView, 100)}>
              <a href="#top" className="inline-flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-oswald text-lg font-bold text-white">B</span>
                <span className="font-oswald text-lg tracking-[0.18em] text-white">{PROFILE.name}</span>
              </a>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">{CREATOR_INFO.tagline}</p>
              <ul className="mt-6 flex gap-3" aria-label="Social Media">
                {SOCIAL_ICONS.map((s) => {
                  const Icon = s.icon;
                  const external = !s.url.startsWith('mailto:');
                  return (
                    <li key={s.id}>
                      <a
                        href={s.url}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        aria-label={s.label}
                        className={`grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:text-white hover:shadow-lg hover:shadow-blue-500/20 ${SOCIAL_HOVER[s.id] ?? ''}`}
                      >
                        <Icon size={18} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            <nav {...reveal(bottom.inView, 180)} aria-label="Footer-Navigation">
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">Navigation</h4>
              <ul className="mt-4 space-y-3">
                {NAV_ITEMS.map((n) => (
                  <li key={n.href}>
                    <UnderlineLink href={n.href}>{n.label}</UnderlineLink>
                  </li>
                ))}
                <li>
                  <UnderlineLink onClick={onOpenContact}>Kontakt</UnderlineLink>
                </li>
                <li>
                  <UnderlineLink href="#/login">Anmelden</UnderlineLink>
                </li>
              </ul>
            </nav>

            <div {...reveal(bottom.inView, 260)}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">Plattformen</h4>
              <ul className="mt-4 space-y-3">
                {platformLinks.map((l) => (
                  <li key={l.id}>
                    <UnderlineLink href={l.url} external>
                      {l.label}
                    </UnderlineLink>
                  </li>
                ))}
              </ul>
            </div>

            <div {...reveal(bottom.inView, 340)}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">Rechtliches</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <UnderlineLink onClick={() => onOpenLegal('impressum')}>Impressum</UnderlineLink>
                </li>
                <li>
                  <UnderlineLink onClick={() => onOpenLegal('privacy')}>Datenschutz</UnderlineLink>
                </li>
                <li>
                  <UnderlineLink onClick={() => onOpenLegal('terms')}>Nutzungsbedingungen</UnderlineLink>
                </li>
                <li>
                  <UnderlineLink href={`mailto:${PROFILE.email}`}>{PROFILE.email}</UnderlineLink>
                </li>
              </ul>
            </div>
          </div>

          <div
            {...reveal(bottom.inView, 420)}
            className={`${reveal(bottom.inView, 420).className} mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row`}
          >
            <p>
              © {new Date().getFullYear()} {PROFILE.name}. Alle Rechte vorbehalten.
            </p>
            <p>Nur für Erwachsene (18+) · Made in Hamburg</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
