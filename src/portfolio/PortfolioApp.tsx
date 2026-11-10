import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LegalModal } from '../components/LegalModal';
import type { LegalModalType } from '../types';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { FaqAccordion } from './components/FaqAccordion';
import { InfoDrawer } from './components/InfoDrawer';
import { LearnlyHero } from './components/LearnlyHero';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { PricingTeaser } from './components/PricingTeaser';
import { ParticleBackground } from './components/ParticleBackground';
import { SplitFooter } from './components/SplitFooter';
import { BioBuilderPage } from './dashboard/bio-builder/BioBuilderPage';
import { BioHubPage } from './dashboard/bio-builder/BioHubPage';
import { DashboardHome } from './dashboard/DashboardHome';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { LibraryPage } from './dashboard/LibraryPage';
import { AccountPage } from './dashboard/AccountPage';
import { AdminPage } from './dashboard/admin/AdminPage';
import { ChatPage } from './dashboard/chat/ChatPage';
import { ProfilePage } from './dashboard/profile/ProfilePage';
import { ContentProvider } from './content/ContentContext';
import { FinanceDashboard, FinanceSettingsPage, FinanceStreams } from './dashboard/finance/FinancePages';
import { FinanceReport } from './dashboard/finance/FinanceReport';
import { SocialPage } from './dashboard/social/SocialPage';
import { MailIcon, XIcon } from './icons';
import { PricingPage } from './pages/PricingPage';
import { SubscribePage } from './pages/SubscribePage';
import { navigate, useHashRoute, type HashRoute } from './router';

const DASHBOARD_PAGES: Record<string, { title: string; subtitle: string; adminOnly?: boolean; bare?: boolean }> = {
  '/abo-bereich': { title: 'Abo-Bereich', subtitle: 'Deine Premium-Inhalte & Werkzeuge' },
  '/abo-bereich/social': { title: 'Social Hub', subtitle: 'Posts von Leuten, denen du folgst – und neue Entdeckungen' },
  '/abo-bereich/bibliothek': { title: 'Bibliothek', subtitle: 'Videos, Fotos & Posts' },
  '/abo-bereich/chat': { title: 'Nachrichten', subtitle: 'Schreib mit anderen Mitgliedern und mit BAREBASTIAN' },
  '/abo-bereich/bio-designer': { title: 'Chaturbate-Bio-Designer', subtitle: 'Deine Profile & die Theme-Galerie' },
  '/abo-bereich/bio-designer/edit': { title: 'Bio-Designer', subtitle: 'Baue deine Bio aus Modulen – Chaturbate-kompatibel als Einzeiler' },
  '/abo-bereich/finanzen': { title: 'Finanzen', subtitle: 'Einnahmen pro Stream auswerten' },
  '/abo-bereich/finanzen/streams': { title: 'Finanzen · Streams', subtitle: 'Alle Einträge ansehen, bearbeiten & löschen' },
  '/abo-bereich/finanzen/bericht': { title: 'Finanzbericht', subtitle: '', bare: true },
  '/abo-bereich/finanzen/einstellungen': { title: 'Finanzen · Einstellungen', subtitle: 'Token-Wert, Währung, Kategorien & Toys' },
  '/abo-bereich/profil': { title: 'Profil', subtitle: 'Wie dich andere Mitglieder sehen' },
  '/abo-bereich/konto': { title: 'Konto & Abo', subtitle: 'Konto und Mitgliedschaft verwalten' },
  '/abo-bereich/verwaltung': { title: 'Verwaltung', subtitle: 'Inhalte veröffentlichen & Mitglieder', adminOnly: true },
};

/**
 * Zugangsregeln:
 * - /abo-bereich/*  → nur angemeldet UND mit aktivem Abo (Admin immer)
 * - /abo-bereich/verwaltung → nur Admin
 * - /login        → wer schon angemeldet ist, wird weitergeleitet
 * - /abo          → öffentlich sichtbar; Abonnenten landen direkt im Abo-Bereich
 * - /preise       → öffentliche Preisseite
 */
function resolveRedirect({ path, query }: HashRoute, loggedIn: boolean, subscribed: boolean, admin: boolean): string | null {
  if (path.startsWith('/abo-bereich')) {
    if (!loggedIn) return `/login?next=${encodeURIComponent(path)}`;
    if (!subscribed) return '/abo';
    if (!DASHBOARD_PAGES[path]) return '/abo-bereich';
    if (DASHBOARD_PAGES[path].adminOnly && !admin) return '/abo-bereich';
  }
  if (path === '/login' && loggedIn) {
    const next = query.get('next');
    const target = next && next.startsWith('/') ? next : '/abo-bereich';
    return target.startsWith('/abo-bereich') && !subscribed ? '/abo' : target;
  }
  if (path === '/abo' && subscribed) return '/abo-bereich';
  return null;
}

function Router() {
  const route = useHashRoute();
  const { user, isSubscribed, isAdmin } = useAuth();
  const redirect = resolveRedirect(route, !!user, isSubscribed, isAdmin);

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect]);

  // Beim Seitenwechsel (außer Startseite-Anker) nach oben scrollen
  useEffect(() => {
    if (route.path !== '/') window.scrollTo(0, 0);
  }, [route.path]);

  if (redirect) return null;

  if (route.path === '/login') return <LoginPage />;
  if (route.path === '/abo') return <SubscribePage query={route.query} />;
  if (route.path === '/preise') {
    return (
      <PublicShell>
        {(openContact) => (
          <>
            <Navbar onOpenContact={openContact} />
            <main>
              <PricingPage />
            </main>
          </>
        )}
      </PublicShell>
    );
  }

  const page = DASHBOARD_PAGES[route.path];
  if (page?.bare && route.path === '/abo-bereich/finanzen/bericht') return <FinanceReport query={route.query} />;
  if (page) {
    return (
      <DashboardLayout path={route.path} title={page.title} subtitle={page.subtitle}>
        {route.path === '/abo-bereich' && <DashboardHome />}
        {route.path === '/abo-bereich/bibliothek' && <LibraryPage query={route.query} />}
        {route.path === '/abo-bereich/bio-designer' && <BioHubPage />}
        {route.path === '/abo-bereich/bio-designer/edit' && <BioBuilderPage projectId={route.query.get('p')} />}
        {route.path === '/abo-bereich/chat' && <ChatPage query={route.query} />}
        {route.path === '/abo-bereich/social' && <SocialPage query={route.query} />}
        {route.path === '/abo-bereich/finanzen' && <FinanceDashboard />}
        {route.path === '/abo-bereich/finanzen/streams' && <FinanceStreams />}
        {route.path === '/abo-bereich/finanzen/einstellungen' && <FinanceSettingsPage />}
        {route.path === '/abo-bereich/profil' && <ProfilePage query={route.query} />}
        {route.path === '/abo-bereich/konto' && <AccountPage />}
        {route.path === '/abo-bereich/verwaltung' && isAdmin && <AdminPage />}
      </DashboardLayout>
    );
  }

  return (
    <PublicShell>
      {(openContact) => (
        <main>
          <LearnlyHero onOpenContact={openContact} />
          <PricingTeaser />
          <FaqAccordion />
        </main>
      )}
    </PublicShell>
  );
}

/** Gemeinsamer Rahmen der öffentlichen Seiten: Partikel, Footer, Kontakt-Drawer, Impressum. */
function PublicShell({ children }: { children: (openContact: () => void) => ReactNode }) {
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
        {children(openDrawer)}
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

/** Wurzelkomponente: Link-Hub, Login, Paywall und Abo-Bereich (Hash-Routing). */
export default function PortfolioApp() {
  return (
    <AuthProvider>
      <ContentProvider>
        <Router />
      </ContentProvider>
    </AuthProvider>
  );
}
