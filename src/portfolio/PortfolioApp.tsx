import { useCallback, useEffect, useState } from 'react';
import { LegalModal } from '../components/LegalModal';
import type { LegalModalType } from '../types';
import { FaqAccordion } from './components/FaqAccordion';
import { InfoDrawer } from './components/InfoDrawer';
import { LearnlyHero } from './components/LearnlyHero';
import { LoginPage } from './components/LoginPage';
import { ParticleBackground } from './components/ParticleBackground';
import { SplitFooter } from './components/SplitFooter';
import { MailIcon, XIcon } from './icons';

type Route = 'home' | 'login';

const routeFromHash = (): Route => (window.location.hash.startsWith('#/login') ? 'login' : 'home');

/** Wurzelkomponente der Portfolio-/Link-Hub-Seite mit minimalem Hash-Routing. */
export default function PortfolioApp() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [legal, setLegal] = useState<LegalModalType>('none');

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Nach Rückkehr von der Login-Seite zu einem Anker (#links, #faq …) scrollen
  useEffect(() => {
    if (route !== 'home') return;
    const id = window.location.hash.slice(1);
    if (!id || id.startsWith('/')) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  }, [route]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (route === 'login') return <LoginPage />;

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <ParticleBackground />

      <div className="relative z-10">
        <main>
          <LearnlyHero onOpenContact={openDrawer} />
          <FaqAccordion />
        </main>
        <SplitFooter onOpenContact={openDrawer} onOpenLegal={setLegal} />
      </div>

      {/* Schwebender Drawer-Toggle */}
      <button
        type="button"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label={drawerOpen ? 'Info-Drawer schließen' : 'Info-Drawer öffnen'}
        aria-expanded={drawerOpen}
        className={`fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-blue-600/40 transition-all duration-500 hover:scale-110 active:scale-95 ${
          drawerOpen ? 'max-md:pointer-events-none max-md:scale-0 max-md:opacity-0 md:rotate-90' : ''
        }`}
      >
        <span className="relative h-6 w-6">
          <MailIcon size={24} className={`absolute inset-0 transition-all duration-300 ${drawerOpen ? 'scale-50 opacity-0' : 'opacity-100'}`} />
          <XIcon size={24} className={`absolute inset-0 transition-all duration-300 ${drawerOpen ? 'opacity-100' : 'scale-50 opacity-0'}`} />
        </span>
      </button>

      <InfoDrawer open={drawerOpen} onClose={closeDrawer} />
      <LegalModal type={legal} onClose={() => setLegal('none')} onSwitchType={setLegal} />
    </div>
  );
}
