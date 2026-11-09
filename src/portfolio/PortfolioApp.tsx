import { useCallback, useEffect, useState } from 'react';
import { LegalModal } from '../components/LegalModal';
import type { LegalModalType } from '../types';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { FaqAccordion } from './components/FaqAccordion';
import { InfoDrawer } from './components/InfoDrawer';
import { LearnlyHero } from './components/LearnlyHero';
import { LoginPage } from './components/LoginPage';
import { ParticleBackground } from './components/ParticleBackground';
import { SplitFooter } from './components/SplitFooter';
import { BioGeneratorPage } from './dashboard/BioGeneratorPage';
import { DashboardHome } from './dashboard/DashboardHome';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { LibraryPage } from './dashboard/LibraryPage';
import { ProfilePage } from './dashboard/ProfilePage';
import { MailIcon, XIcon } from './icons';
import { SubscribePage } from './pages/SubscribePage';
import { navigate, useHashRoute, type HashRoute } from './router';

const DASHBOARD_PAGES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Übersicht', subtitle: 'Dein Abonnenten-Bereich' },
  '/dashboard/bibliothek': { title: 'Bibliothek', subtitle: 'Videos, Fotos & Posts' },
  '/dashboard/bio-generator': { title: 'Chaturbate-Bio-Generator', subtitle: 'Bio, Tip-Menü & Wunschliste mit Regel-Check' },
  '/dashboard/profil': { title: 'Profil & Abo', subtitle: 'Konto und Mitgliedschaft verwalten' },
};

/**
 * Zugangsregeln:
 * - /dashboard/*  → nur angemeldet UND mit aktivem Abo
 * - /login        → wer schon angemeldet ist, wird weitergeleitet
 * - /abo          → öffentlich sichtbar; Abonnenten landen direkt im Dashboard
 */
function resolveRedirect({ path, query }: HashRoute, loggedIn: boolean, subscribed: boolean): string | null {
  if (path.startsWith('/dashboard')) {
    if (!loggedIn) return `/login?next=${encodeURIComponent(path)}`;
    if (!subscribed) return '/abo';
    if (!DASHBOARD_PAGES[path]) return '/dashboard';
  }
  if (path === '/login' && loggedIn) {
    const next = query.get('next');
    const target = next && next.startsWith('/') ? next : '/dashboard';
    return target.startsWith('/dashboard') && !subscribed ? '/abo' : target;
  }
  if (path === '/abo' && subscribed) return '/dashboard';
  return null;
}

function Router() {
  const route = useHashRoute();
  const { user, isSubscribed } = useAuth();
  const redirect = resolveRedirect(route, !!user, isSubscribed);

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect]);

  // Beim Seitenwechsel (außer Startseite-Anker) nach oben scrollen
  useEffect(() => {
    if (route.path !== '/') window.scrollTo(0, 0);
  }, [route.path]);

  if (redirect) return null;

  if (route.path === '/login') return <LoginPage />;
  if (route.path === '/abo') return <SubscribePage />;

  const page = DASHBOARD_PAGES[route.path];
  if (page) {
    return (
      <DashboardLayout path={route.path} title={page.title} subtitle={page.subtitle}>
        {route.path === '/dashboard' && <DashboardHome />}
        {route.path === '/dashboard/bibliothek' && <LibraryPage query={route.query} />}
        {route.path === '/dashboard/bio-generator' && <BioGeneratorPage />}
        {route.path === '/dashboard/profil' && <ProfilePage />}
      </DashboardLayout>
    );
  }

  return <HomePage />;
}

function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [legal, setLegal] = useState<LegalModalType>('none');

  // Anker (#links, #faq …) nach Rückkehr auf die Startseite ansteuern
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id || id.startsWith('/')) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

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

/** Wurzelkomponente: Link-Hub, Login, Paywall und Abonnenten-Dashboard (Hash-Routing). */
export default function PortfolioApp() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
