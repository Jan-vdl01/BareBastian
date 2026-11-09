import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PlanId } from '../config/plans';
import { demoAuthService, hasActiveAccess, isAdmin, type AuthService, type User } from './authService';
import { useProfile, type Profile } from './userDirectory';

interface AuthContextValue {
  user: User | null;
  profile: Profile | undefined;
  isSubscribed: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  loginWithProvider: (provider: 'google' | 'github') => Promise<User>;
  logout: () => Promise<void>;
  subscribe: (plan: PlanId) => Promise<User>;
  cancelSubscription: () => Promise<User>;
  resumeSubscription: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, service = demoAuthService }: { children: ReactNode; service?: AuthService }) {
  const [user, setUser] = useState<User | null>(() => service.current());
  const profile = useProfile(user?.id);

  // Profil- oder Abo-Änderungen (auch aus anderen Tabs) übernehmen
  useEffect(() => {
    const refresh = () => setUser(service.current());
    window.addEventListener('bb:store', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bb:store', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [service]);

  const wrap = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<User>) =>
      async (...args: A) => {
        const u = await fn(...args);
        setUser(u);
        return u;
      },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user && profile ? { ...user, displayName: profile.displayName } : user,
      profile,
      isSubscribed: hasActiveAccess(user),
      isAdmin: isAdmin(user),
      login: wrap(service.login),
      loginWithProvider: wrap(service.loginWithProvider),
      subscribe: wrap(service.subscribe),
      cancelSubscription: wrap(service.cancelSubscription),
      resumeSubscription: wrap(service.resumeSubscription),
      logout: async () => {
        await service.logout();
        setUser(null);
      },
    }),
    [user, profile, service, wrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}
