import { useEffect, useMemo, useRef, useState } from 'react';
import { LINK_GROUPS, PROFILE } from '../data';
import { ArrowRight, ChevronDown, ExternalLink, MailIcon, SearchIcon, XIcon } from '../icons';
import type { LinkGroup } from '../types';
import { Navbar } from './Navbar';
import { ScrambleText } from './ScrambleText';
import { Typewriter } from './Typewriter';

interface LearnlyHeroProps {
  onOpenContact: () => void;
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Learnly Hero: Navigation, Scramble-Headline, Typewriter-Bio,
 * Suchleiste und Akkordeon-Karten mit allen Links (reine CSS-Übergänge).
 */
export function LearnlyHero({ onOpenContact }: LearnlyHeroProps) {
  const [headlineDone, setHeadlineDone] = useState(false);
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([LINK_GROUPS[0].id]));
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" fokussiert die Suche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = normalize(query.trim());
  const filtered: LinkGroup[] = useMemo(() => {
    if (!q) return LINK_GROUPS;
    return LINK_GROUPS.map((g) => ({
      ...g,
      links: normalize(g.title).includes(q)
        ? g.links
        : g.links.filter((l) => normalize(`${l.label} ${l.description}`).includes(q)),
    })).filter((g) => g.links.length > 0);
  }, [q]);

  const resultCount = filtered.reduce((n, g) => n + g.links.length, 0);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="top" className="relative">
      <Navbar onOpenContact={onOpenContact} />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-32 text-center sm:px-6 sm:pt-40">
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          Official Link Hub
        </span>

        <ScrambleText
          as="h1"
          text={PROFILE.name}
          onComplete={() => setHeadlineDone(true)}
          className="mt-6 cursor-default bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text font-oswald text-5xl font-bold tracking-[0.12em] text-transparent sm:text-7xl md:text-8xl"
        />

        <Typewriter
          text={PROFILE.bio}
          start={headlineDone}
          className="mx-auto mt-6 min-h-[4.5rem] max-w-xl text-base leading-relaxed text-slate-300 sm:min-h-[3.5rem] sm:text-lg"
        />

        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:400ms]">
          <a
            href="#links"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40"
          >
            Alle Links
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <button
            type="button"
            onClick={onOpenContact}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10"
          >
            <MailIcon size={16} /> Kontakt
          </button>
        </div>

        {/* Suchleiste */}
        <div id="links" className="mt-16 scroll-mt-24">
          <label htmlFor="link-search" className="sr-only">
            Links durchsuchen
          </label>
          <div className="group relative mx-auto max-w-xl">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-400/40 via-blue-500/40 to-violet-500/40 opacity-0 blur transition-opacity duration-500 group-focus-within:opacity-100" />
            <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3.5 backdrop-blur-xl transition-colors duration-300 group-focus-within:border-cyan-400/50">
              <SearchIcon size={18} className="shrink-0 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
              <input
                ref={searchRef}
                id="link-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Plattform oder Kanal suchen …"
                autoComplete="off"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Suche leeren"
                >
                  <XIcon size={13} />
                </button>
              ) : (
                <kbd className="hidden shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 sm:block">
                  /
                </kbd>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500" aria-live="polite">
            {q ? `${resultCount} Treffer für „${query.trim()}“` : `${LINK_GROUPS.reduce((n, g) => n + g.links.length, 0)} Links in ${LINK_GROUPS.length} Kategorien`}
          </p>
        </div>

        {/* Akkordeon-Karten */}
        <div className="mt-8 space-y-3 text-left">
          {filtered.map((group, idx) => {
            const isOpen = q ? true : openIds.has(group.id);
            const GroupIcon = group.icon;
            const panelId = `group-panel-${group.id}`;
            return (
              <article
                key={group.id}
                className={`animate-fade-up overflow-hidden rounded-2xl border bg-slate-900/60 backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-500 ${
                  isOpen ? 'border-cyan-400/25 bg-slate-900/75 shadow-2xl shadow-blue-900/30' : 'border-white/10 hover:border-white/20'
                }`}
                style={{ animationDelay: `${500 + idx * 90}ms` }}
              >
                <h2>
                  <button
                    type="button"
                    onClick={() => toggle(group.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    disabled={!!q}
                    className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
                  >
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${group.accent} text-white shadow-lg`}>
                      <GroupIcon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-oswald text-lg tracking-wide text-white">{group.title}</span>
                      <span className="block truncate text-sm text-slate-400">{group.subtitle}</span>
                    </span>
                    <span className="hidden rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400 sm:inline">{group.links.length}</span>
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-slate-400 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${isOpen ? 'rotate-180 text-cyan-300' : ''}`}
                    />
                  </button>
                </h2>

                <div
                  id={panelId}
                  role="region"
                  aria-label={group.title}
                  className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  inert={!isOpen}
                >
                  <div className="overflow-hidden">
                    <ul className={`grid gap-2 px-4 pb-4 transition-opacity duration-500 sm:grid-cols-2 sm:px-5 sm:pb-5 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                      {group.links.map((link) => {
                        const LinkIcon = link.icon;
                        const external = !link.url.startsWith('mailto:');
                        return (
                          <li key={link.id}>
                            <a
                              href={link.url}
                              target={external ? '_blank' : undefined}
                              rel={external ? 'noopener noreferrer' : undefined}
                              className="group/link flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-cyan-400/[0.06]"
                            >
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-200 transition-colors duration-300 group-hover/link:bg-cyan-400/15 group-hover/link:text-cyan-200">
                                <LinkIcon size={18} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-sm font-medium text-white">
                                  {link.label}
                                  {link.badge && (
                                    <span className="rounded-full bg-cyan-400/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                                      {link.badge}
                                    </span>
                                  )}
                                </span>
                                <span className="block truncate text-xs text-slate-400">{link.description}</span>
                              </span>
                              <ExternalLink
                                size={15}
                                className="shrink-0 text-slate-500 transition-all duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:text-cyan-300"
                              />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-slate-400">
              Keine Treffer für „{query.trim()}“.{' '}
              <button type="button" onClick={() => setQuery('')} className="text-cyan-300 underline-offset-4 hover:underline">
                Suche zurücksetzen
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
