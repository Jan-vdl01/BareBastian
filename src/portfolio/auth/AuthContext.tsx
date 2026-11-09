import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PlanId } from '../config/plans';
import { demoAuthService, hasActiveAccess, type AuthService, type User } from './authService';

interface AuthContextValue {
  user: User | null;
  isSubscribed: boolean;
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
      user,
      isSubscribed: hasActiveAccess(user),
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
    [user, service, wrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}
