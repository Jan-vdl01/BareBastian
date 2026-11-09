import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { NAV_ITEMS, PROFILE } from '../data';
import { LockIcon } from '../icons';

interface NavbarProps {
  onOpenContact: () => void;
}

/** Fixierte Navigation mit Glas-Effekt beim Scrollen und CSS-animiertem Burger-Menü. */
export function Navbar({ onOpenContact }: NavbarProps) {
  const { user, isSubscribed } = useAuth();
  const account = user ? (isSubscribed ? { href: '#/dashboard', label: 'Dashboard' } : { href: '#/abo', label: 'Abo abschließen' }) : { href: '#/login', label: 'Anmelden' };
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const openContact = () => {
    setOpen(false);
    onOpenContact();
  };

  const bar = 'absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300 ease-out';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled || open ? 'border-b border-white/10 bg-[#07090e]/70 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Hauptnavigation">
        <a href="#top" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-oswald text-lg font-bold text-white shadow-lg shadow-blue-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
            B
          </span>
          <span className="font-oswald text-lg tracking-[0.18em] text-white">{PROFILE.name}</span>
        </a>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={openContact}
            className="rounded-full px-4 py-2 text-sm text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-white"
          >
            Kontakt
          </button>
          <a
            href={account.href}
            className="ml-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-100 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            <LockIcon size={15} /> {account.label}
          </a>
        </div>

        {/* Burger */}
        <button
          type="button"
          className="relative grid h-10 w-10 place-items-center rounded-xl text-white transition-colors hover:bg-white/10 md:hidden"
          aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="relative block h-4 w-5">
            <span className={`${bar} ${open ? 'top-[7px] rotate-45' : 'top-0'}`} />
            <span className={`${bar} top-[7px] ${open ? 'scale-x-0 opacity-0' : 'opacity-100'}`} />
            <span className={`${bar} ${open ? 'top-[7px] -rotate-45' : 'top-[14px]'}`} />
          </span>
        </button>
      </nav>

      {/* Mobile-Panel: reiner CSS-Übergang über grid-template-rows */}
      <div
        id="mobile-menu"
        className={`grid transition-[grid-template-rows,opacity] duration-400 ease-out md:hidden ${
          open ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
        inert={!open}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 px-4 pb-5 pt-2">
            {NAV_ITEMS.map((item, i) => (
              <li
                key={item.href}
                className={`transition-all duration-500 ${open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                style={{ transitionDelay: open ? `${80 + i * 60}ms` : '0ms' }}
              >
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li
              className={`transition-all duration-500 ${open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
              style={{ transitionDelay: open ? `${80 + NAV_ITEMS.length * 60}ms` : '0ms' }}
            >
              <button
                type="button"
                onClick={openContact}
                className="block w-full rounded-xl px-4 py-3 text-left text-base text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                Kontakt
              </button>
            </li>
            <li
              className={`pt-2 transition-all duration-500 ${open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
              style={{ transitionDelay: open ? `${80 + (NAV_ITEMS.length + 1) * 60}ms` : '0ms' }}
            >
              <a
                href={account.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-slate-900"
              >
                <LockIcon size={16} /> {account.label}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
