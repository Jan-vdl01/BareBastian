import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatEuro, PLANS } from '../config/plans';
import { LINK_GROUPS, PROFILE } from '../data';
import { defaultTheme, projectFromStarter, STARTERS } from '../dashboard/bio-builder/modules';
import { renderBio } from '../dashboard/bio-builder/renderChaturbate';
import { ScaledPreview } from '../dashboard/bio-builder/ScaledPreview';
import { getTheme, THEMES } from '../dashboard/bio-builder/themes';
import { useInView } from '../hooks/useInView';
import { ArrowRight, ChartIcon, ChatIcon, CheckIcon, CrownIcon, ExternalLink, GemIcon, HeartIcon, LibraryIcon, LockIcon, PlayIcon, SendIcon, UsersIcon, WandIcon, type IconComponent } from '../icons';
import { Navbar } from './Navbar';
import { ScrambleText } from './ScrambleText';
import { Typewriter } from './Typewriter';

/**
 * Startseite: stellt die Werkzeuge und Inhalte des Abo-Bereichs vor (Verkaufsseite).
 * Die Bio-Vorschauen sind echt – sie werden mit demselben Renderer erzeugt wie im Bio-Designer.
 */

const sampleCache = new Map<string, string>();
function sampleBio(themeId: string): string {
  if (!sampleCache.has(themeId)) {
    const starter = STARTERS.find((s) => s.id === 'studio') ?? STARTERS[0];
    sampleCache.set(themeId, renderBio(projectFromStarter(starter, 'Dein Name', defaultTheme(themeId))));
  }
  return sampleCache.get(themeId)!;
}

/** Blendet Inhalte beim Scrollen sanft ein. */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.12 });
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out motion-reduce:transition-none ${inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}>
      {children}
    </div>
  );
}

function Eyebrow({ icon: Icon, children, tone = 'text-cyan-300' }: { icon: IconComponent; children: ReactNode; tone?: string }) {
  return (
    <p className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${tone}`}>
      <Icon size={15} /> {children}
    </p>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-slate-300">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <CheckIcon size={12} strokeWidth={3} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

/** Fensterrahmen für Produkt-Vorschauen. */
function Frame({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f18] shadow-2xl shadow-black/50 ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 truncate text-xs text-slate-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------- Vorschau: Bio-Designer (echte Themes zum Durchklicken) ---------- */

const DEMO_THEMES = ['neon', 'midnight-gold', 'cyber', 'sakura', 'comic', 'vaporwave', 'minimal', 'galaxy'];

function BioDemo() {
  const [themeId, setThemeId] = useState(DEMO_THEMES[0]);
  const html = useMemo(() => sampleBio(themeId), [themeId]);
  const theme = getTheme(themeId);
  return (
    <div>
      <Frame title={`Bio-Designer · Theme „${theme.name}“`}>
        <ScaledPreview html={html} height={380} title={`Beispiel-Bio im Theme ${theme.name}`} />
      </Frame>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Theme wählen">
        {DEMO_THEMES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={themeId === id}
            onClick={() => setThemeId(id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${themeId === id ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-white' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white'}`}
          >
            {getTheme(id).name}
          </button>
        ))}
        <span className="self-center pl-1 text-xs text-slate-500">+ {THEMES.length - DEMO_THEMES.length} weitere</span>
      </div>
    </div>
  );
}

/* ---------- Vorschau: Finanz-Tool ---------- */

const EARNINGS = [0, 38, 38, 92, 140, 140, 205, 251, 251, 330, 372, 441, 441, 520, 598, 640, 640, 735, 812, 860, 951, 951, 1040, 1128, 1190, 1190, 1302, 1396];

function FinanceDemo() {
  const w = 520;
  const h = 170;
  const max = 1400;
  const x = (i: number) => (i / (EARNINGS.length - 1)) * w;
  const y = (v: number) => h - (v / max) * h;
  const line = EARNINGS.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <Frame title="Finanzen · Letzte 4 Wochen">
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Verdienst', '1.396 $', '+18 %'],
            ['Tokens / Std.', '612', '+7 %'],
            ['Bester Tag', 'Samstag', '21 Uhr'],
          ].map(([k, v, d]) => (
            <div key={k} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <p className="text-[11px] text-slate-500">{k}</p>
              <p className="mt-1 text-lg font-semibold text-white">{v}</p>
              <p className="text-[11px] text-emerald-300">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-medium text-slate-300">Gesamteinnahmen im Verlauf</p>
        <svg viewBox={`0 0 ${w} ${h + 6}`} className="mt-2 w-full" role="img" aria-label="Beispiel: Die Einnahmen steigen innerhalb von vier Wochen auf 1.396 Dollar.">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={0} x2={w} y1={h * t} y2={h * t} stroke="rgba(255,255,255,.07)" strokeWidth={1} />
          ))}
          <path d={`${line} L${w},${h} L0,${h} Z`} fill="#3987e5" opacity={0.14} />
          <path d={line} fill="none" stroke="#3987e5" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={w - 3} cy={y(EARNINGS[EARNINGS.length - 1])} r={4.5} fill="#3987e5" stroke="#0b0f18" strokeWidth={2} />
        </svg>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
          {['Private Show', 'Ticket-Show', 'Lovense', 'Fuck-Machine'].map((t) => (
            <span key={t} className="rounded-full bg-white/[0.05] px-2.5 py-1">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ---------- Vorschau: Social Hub & Chat ---------- */

function CommunityDemo() {
  return (
    <div className="grid gap-4 sm:grid-cols-[1.25fr_1fr]">
      <Frame title="Social Hub">
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white">B</span>
              <div>
                <p className="text-sm font-semibold text-white">{PROFILE.name}</p>
                <p className="text-[11px] text-slate-500">vor 2 Std.</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-gradient-to-br from-fuchsia-600 via-violet-600 to-blue-600 px-4 py-6 text-center font-oswald text-xl tracking-wide text-white">Heute Abend ab 21 Uhr live!</div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-rose-300">
                <HeartIcon size={14} /> 48
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ChatIcon size={14} /> 12
              </span>
              <span className="text-sky-300">#livestream</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-200">Was wollt ihr als Nächstes sehen?</p>
            {[
              ['Behind the Scenes', 62],
              ['Q&A', 38],
            ].map(([label, pct]) => (
              <div key={label} className="relative mt-2 overflow-hidden rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200">
                <span className="absolute inset-y-0 left-0 bg-sky-500/25" style={{ width: `${pct}%` }} />
                <span className="relative flex justify-between">
                  <span>{label}</span>
                  <span>{pct} %</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Frame>
      <Frame title="Nachrichten">
        <div className="flex h-full flex-col gap-2.5 p-4 text-sm">
          <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-2 text-slate-200">Hey! Danke fürs Abo 🙌</p>
          <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-white">Gerne! Das Bio-Tool ist mega.</p>
          <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-2 text-slate-200">Freut mich! Zeig gern dein Ergebnis.</p>
          <div className="mt-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-500">
            <span className="flex-1">Nachricht schreiben …</span>
            <SendIcon size={14} className="text-cyan-300" />
          </div>
        </div>
      </Frame>
    </div>
  );
}

/* ---------- Vorschau: Bibliothek ---------- */

function LibraryDemo() {
  const tiles = [
    { hue: 200, label: 'Studio-Tour', meta: '08:42', video: true },
    { hue: 280, label: 'Live-Highlights', meta: '22:15', video: true },
    { hue: 20, label: 'Herbst-Shooting', meta: '12 Fotos' },
    { hue: 330, label: 'Exklusiv: Session', meta: '18:40', video: true },
    { hue: 150, label: 'Hamburg Nights', meta: '9 Fotos' },
    { hue: 240, label: 'Q&A', meta: '14:03', video: true },
  ];
  return (
    <Frame title="Bibliothek · Videos & Fotos">
      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="relative aspect-video overflow-hidden rounded-xl" style={{ background: `radial-gradient(circle at 25% 20%, hsl(${t.hue} 90% 65% / .55), transparent 55%), radial-gradient(circle at 80% 85%, hsl(${(t.hue + 50) % 360} 85% 55% / .5), transparent 55%), linear-gradient(135deg, hsl(${t.hue} 45% 14%), hsl(${(t.hue + 30) % 360} 50% 8%))` }}>
            {t.video && (
              <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
                <PlayIcon size={14} />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-6 text-[11px] text-white">
              <span className="truncate font-medium">{t.label}</span>
              <span className="shrink-0 text-white/70">{t.meta}</span>
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ---------- Abschnitt mit Text + Vorschau ---------- */

function Feature({ id, flip = false, eyebrow, icon, tone, title, text, bullets, children }: { id: string; flip?: boolean; eyebrow: string; icon: IconComponent; tone: string; title: string; text: string; bullets: string[]; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <Reveal className={flip ? 'lg:order-2' : ''}>
          <Eyebrow icon={icon} tone={tone}>
            {eyebrow}
          </Eyebrow>
          <h2 className="mt-3 font-oswald text-3xl leading-tight tracking-wide text-white sm:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">{text}</p>
          <Bullets items={bullets} />
        </Reveal>
        <Reveal delay={120} className={flip ? 'lg:order-1' : ''}>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

export function LandingPage({ onOpenContact }: { onOpenContact: () => void }) {
  const { user, isSubscribed } = useAuth();
  const [headlineDone, setHeadlineDone] = useState(false);
  const cheapest = Math.min(...PLANS.map((p) => p.price / p.months));
  const cta = isSubscribed ? { href: '#/abo-bereich', label: 'Zum Abo-Bereich' } : user ? { href: '#/abo', label: 'Abo wählen' } : { href: '#/login?mode=register', label: 'Jetzt starten' };

  const CtaButton = ({ className = '' }: { className?: string }) => (
    <a href={cta.href} className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40 ${className}`}>
      {cta.label}
      <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
    </a>
  );

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section id="top" className="relative">
        <Navbar onOpenContact={onOpenContact} />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-32 sm:px-6 sm:pt-40 lg:grid-cols-[1.05fr_1fr]">
          <div className="text-center lg:text-left">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              Die Creator-Toolbox von {PROFILE.name}
            </span>
            <ScrambleText
              as="h1"
              text="Mehr aus deinem Stream."
              onComplete={() => setHeadlineDone(true)}
              className="mt-6 cursor-default bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text font-oswald text-5xl font-bold leading-[1.05] tracking-wide text-transparent sm:text-6xl lg:text-7xl"
            />
            <Typewriter
              text="Gestalte deine Chaturbate-Bio in Minuten, behalte deine Einnahmen im Blick und werde Teil der Community – alles in einem Abo-Bereich."
              start={headlineDone}
              className="mx-auto mt-6 min-h-[6rem] max-w-xl text-base leading-relaxed text-slate-300 sm:min-h-[4.5rem] sm:text-lg lg:mx-0"
            />
            <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:400ms] lg:justify-start">
              <CtaButton />
              <a href="#funktionen" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10">
                Funktionen ansehen
              </a>
            </div>
            <ul className="animate-fade-up mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400 [animation-delay:600ms] lg:justify-start">
              {[`${THEMES.length} Bio-Themes`, 'Chaturbate-kompatibel', `ab ${formatEuro(cheapest)} / Monat`, 'Keine automatische Verlängerung'].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <CheckIcon size={14} className="text-emerald-300" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up relative [animation-delay:300ms]">
            <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-fuchsia-500/20 blur-3xl" />
            <Frame title="Deine Bio – fertig zum Einfügen" className="relative lg:rotate-1">
              <ScaledPreview html={sampleBio('neon')} height={420} title="Beispiel einer fertigen Chaturbate-Bio" />
            </Frame>
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-white/10 bg-[#0b0f18]/95 px-4 py-3 shadow-xl backdrop-blur sm:block">
              <p className="text-[11px] text-slate-500">Verdienst diesen Monat</p>
              <p className="text-lg font-semibold text-white">
                1.396 $ <span className="text-xs font-medium text-emerald-300">+18 %</span>
              </p>
            </div>
          </div>
        </div>

        {/* Kurzüberblick */}
        <div id="funktionen" className="mx-auto grid max-w-6xl scroll-mt-24 gap-3 px-4 pb-6 pt-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {(
            [
              [WandIcon, 'Bio-Designer', 'Profil-Designs als Baukasten', '#bio-designer', 'from-fuchsia-500 to-violet-600'],
              [ChartIcon, 'Finanz-Tool', 'Einnahmen pro Stream auswerten', '#finanzen', 'from-sky-500 to-blue-600'],
              [UsersIcon, 'Social Hub & Chat', 'Posten, folgen, schreiben', '#community', 'from-emerald-400 to-teal-600'],
              [LibraryIcon, 'Bibliothek', 'Exklusive Videos & Fotos', '#bibliothek', 'from-amber-300 to-orange-500'],
            ] as const
          ).map(([Icon, title, sub, href, grad], i) => (
            <Reveal key={title} delay={i * 80}>
              <a href={href} className="group flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/25">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white`}>
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-white">{title}</span>
                  <span className="block text-sm text-slate-400">{sub}</span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Funktionen ---------- */}
      <Feature
        id="bio-designer"
        eyebrow="Chaturbate-Bio-Designer"
        icon={WandIcon}
        tone="text-fuchsia-300"
        title="Eine Bio, die nach Profi aussieht – ohne eine Zeile Code"
        text="Stell deine Bio aus Modulen zusammen: Kopfbereich, Tip-Menü, Wunschliste, Zeitplan, Regeln und mehr. Das Tool erzeugt daraus genau den HTML-Einzeiler, den Chaturbate akzeptiert."
        bullets={[
          `${THEMES.length} fertige Themes – von Neon über Gold bis Comic. Klick dich rechts durch.`,
          'Jede Box einzeln gestalten: Farben, Schrift, Größe, Rahmen.',
          'Eingebaute Prüfung: nur erlaubte Befehle, keine bösen Überraschungen beim Einfügen.',
          'Mehrere Profile speichern, Versionen wiederherstellen, mit einem Klick kopieren.',
        ]}
      >
        <BioDemo />
      </Feature>

      <Feature
        id="finanzen"
        flip
        eyebrow="Finanz-Tool"
        icon={ChartIcon}
        tone="text-sky-300"
        title="Sieh endlich, was sich wirklich lohnt"
        text="Trag nach jedem Stream Tokens, Länge, Kategorie und Toys ein. Das Dashboard zeigt dir, an welchen Tagen, zu welcher Uhrzeit und mit welchem Setup du am meisten verdienst."
        bullets={[
          'Verdienst, Tokens pro Stunde, bester Wochentag und beste Startzeit auf einen Blick.',
          'Auswertung nach Kategorie und Toy, z. B. Lovense oder Fuck-Machine.',
          'Monatsziel mit Fortschritt und Hochrechnung.',
          'Export als PDF-Bericht oder CSV – deine Daten gehören dir.',
        ]}
      >
        <FinanceDemo />
      </Feature>

      <Feature
        id="community"
        eyebrow="Social Hub & Nachrichten"
        icon={UsersIcon}
        tone="text-emerald-300"
        title="Eine Community nur für Mitglieder"
        text="Poste Updates mit Bildern, Umfragen und eigenem Design, folge anderen und schreib direkt mit mir oder anderen Mitgliedern – ohne Algorithmus, ohne Werbung."
        bullets={[
          'Feed mit den Leuten, denen du folgst, plus Entdecken-Bereich mit Trends.',
          'Gestaltete Posts: Hintergründe, Schriftarten, Umfragen, bis zu 4 Bilder.',
          'Direktnachrichten mit Lesebestätigung.',
          'Eigenes Profil mit Bild, Bio und Interessen.',
        ]}
      >
        <CommunityDemo />
      </Feature>

      <Feature
        id="bibliothek"
        flip
        eyebrow="Bibliothek"
        icon={LibraryIcon}
        tone="text-amber-300"
        title="Exklusive Videos, Fotos und Updates"
        text="Im Abo-Bereich findest du Inhalte, die es sonst nirgends gibt – geordnet nach Kategorien und Alben, in voller Qualität und ohne Umwege über andere Plattformen."
        bullets={['Videos direkt im Browser ansehen, „Weiter ansehen“ inklusive.', 'Fotoalben in voller Auflösung.', 'Persönliche Posts und Ankündigungen zuerst für Abonnenten.', 'Geschützt: nur mit aktivem Abo abrufbar.']}
      >
        <LibraryDemo />
      </Feature>

      {/* ---------- So funktioniert's ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Reveal className="text-center">
          <Eyebrow icon={CrownIcon}>In 3 Schritten dabei</Eyebrow>
          <h2 className="mt-3 font-oswald text-3xl tracking-wide text-white sm:text-4xl">So startest du</h2>
        </Reveal>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {(
            [
              [LockIcon, 'Konto erstellen', 'Kostenlos registrieren – nur E-Mail, Name und Passwort.'],
              [GemIcon, 'Paket wählen oder Code einlösen', 'Wähle deine Laufzeit. Mit einem Rabatt- oder Zugangscode sparst du oder startest sofort.'],
              [WandIcon, 'Loslegen', 'Bio gestalten, Streams eintragen, Community entdecken – alles ist sofort freigeschaltet.'],
            ] as const
          ).map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 100}>
              <li className="relative h-full rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
                <span className="absolute right-5 top-4 font-oswald text-5xl text-white/[0.06]">{i + 1}</span>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-sans text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- Preise ---------- */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-slate-900/85 via-blue-950/60 to-violet-950/60 p-7 backdrop-blur-xl sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative text-center">
              <Eyebrow icon={CrownIcon}>Ein Abo – alles drin</Eyebrow>
              <h2 className="mt-3 font-oswald text-3xl tracking-wide text-white sm:text-4xl">Wähle deine Laufzeit</h2>
              <p className="mx-auto mt-2 max-w-xl text-slate-400">Alle Pakete enthalten sämtliche Funktionen. Keine automatische Verlängerung, keine versteckten Kosten.</p>
            </div>
            <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <a key={p.id} href={user ? `#/abo?plan=${p.id}` : `#/login?mode=register&next=${encodeURIComponent(`/abo?plan=${p.id}`)}`} className={`relative rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 ${p.highlight ? 'border-cyan-400/50 bg-cyan-400/[0.07]' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                  {p.highlight && <span className="absolute -top-2.5 left-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">{p.highlight}</span>}
                  <span className="font-oswald text-lg tracking-wide text-white">{p.name}</span>
                  <span className="mt-2 block text-3xl font-semibold text-white">{formatEuro(p.price)}</span>
                  <span className="mt-1 block text-sm text-slate-400">{p.months === 1 ? 'pro Monat' : `${formatEuro(p.price / p.months)} / Monat`}</span>
                </a>
              ))}
            </div>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <CtaButton />
              <a href="#/preise" className="text-sm font-medium text-cyan-300 underline-offset-4 hover:underline">
                Alle Details zu den Preisen
              </a>
            </div>
            <p className="relative mt-4 text-center text-xs text-slate-500">Du hast einen Rabatt- oder Zugangscode? Gib ihn einfach bei der Registrierung ein.</p>
          </div>
        </Reveal>
      </section>

      {/* ---------- Kanäle ---------- */}
      <section id="links" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6">
        <Reveal className="text-center">
          <Eyebrow icon={ExternalLink}>Mehr von {PROFILE.name}</Eyebrow>
          <h2 className="mt-3 font-oswald text-3xl tracking-wide text-white sm:text-4xl">Meine Kanäle</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {LINK_GROUPS.map((g, gi) => (
            <Reveal key={g.id} delay={gi * 60}>
              <div className="h-full rounded-3xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${g.accent} text-white`}>
                    <g.icon size={18} />
                  </span>
                  <div>
                    <h3 className="font-sans text-base font-semibold text-white">{g.title}</h3>
                    <p className="text-xs text-slate-500">{g.subtitle}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.id}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.06]">
                        <l.icon size={17} className="shrink-0 text-slate-400 group-hover:text-white" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-200 group-hover:text-white">{l.label}</span>
                          <span className="block truncate text-xs text-slate-500">{l.description}</span>
                        </span>
                        <ExternalLink size={14} className="shrink-0 text-slate-600 group-hover:text-cyan-300" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
