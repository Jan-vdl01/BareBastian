import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PlanId } from '../config/plans';
import { SESSION_EXPIRED_EVENT } from '../lib/api';
import { resetAllRemote } from '../lib/remote';
import { clearDocs, flushDocs, hydrateDocs } from '../lib/store';
import { authApi, hasActiveAccess, isAdmin, type RegisterInput, type User } from './authService';
import { profilesResource, type Profile } from './userDirectory';

interface AuthContextValue {
  user: User | null;
  profile: Profile | undefined;
  isSubscribed: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User | null>;
  register: (input: RegisterInput) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => Promise<void>;
  requestSubscription: (plan: PlanId) => Promise<User | null>;
  withdrawRequest: () => Promise<User | null>;
  cancelSubscription: () => Promise<User | null>;
  resumeSubscription: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Lädt persönliche Daten, sobald jemand angemeldet ist. */
async function prepareSession(user: User | null) {
  resetAllRemote();
  clearDocs();
  if (!user) return;
  await Promise.all([hydrateDocs().catch(() => undefined), profilesResource.refresh()]);
}

function Splash({ failed }: { failed: boolean }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#06080d] px-6 text-center">
      {failed ? (
        <div>
          <p className="font-oswald text-2xl tracking-wide text-white">Server nicht erreichbar</p>
          <p className="mt-2 text-sm text-slate-400">Bitte prüfe deine Verbindung und lade die Seite neu.</p>
          <button type="button" onClick={() => location.reload()} className="mt-5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
            Neu laden
          </button>
        </div>
      ) : (
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" aria-label="Wird geladen" />
      )}
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const profiles = profilesResource.useCached();
  const profile = user ? profiles[user.id] : undefined;

  const applyUser = useCallback(async (next: User | null) => {
    await prepareSession(next);
    setUserState(next);
  }, []);

  // Beim Start: bestehende Sitzung prüfen
  useEffect(() => {
    authApi
      .me()
      .then(applyUser)
      .then(() => setReady(true))
      .catch(() => setFailed(true));
  }, [applyUser]);

  // Abgelaufene Sitzung → abmelden
  useEffect(() => {
    const onExpired = () => {
      clearDocs();
      resetAllRemote();
      setUserState(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Abo-Status regelmäßig aktualisieren (z. B. nach Freischaltung durch den Admin)
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') authApi.me().then((u) => u && setUserState(u)).catch(() => undefined);
    }, 120000);
    return () => clearInterval(t);
  }, [user?.id]);

  const keep = useCallback(async (p: Promise<User | null>) => {
    const u = await p;
    setUserState(u);
    return u;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user && profile ? { ...user, displayName: profile.displayName } : user,
      profile,
      isSubscribed: hasActiveAccess(user),
      isAdmin: isAdmin(user),
      login: async (email, password, remember) => {
        const u = await authApi.login(email, password, remember);
        await applyUser(u);
        return u;
      },
      register: async (input) => {
        const u = await authApi.register(input);
        await applyUser(u);
        return u;
      },
      logout: async () => {
        flushDocs();
        await authApi.logout().catch(() => undefined);
        await applyUser(null);
      },
      refreshUser: () => keep(authApi.me()),
      setUser: applyUser,
      requestSubscription: (plan) => keep(authApi.requestSubscription(plan)),
      withdrawRequest: () => keep(authApi.withdrawRequest()),
      cancelSubscription: () => keep(authApi.cancelSubscription()),
      resumeSubscription: () => keep(authApi.resumeSubscription()),
    }),
    [user, profile, applyUser, keep],
  );

  if (!ready) return <Splash failed={failed} />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}
