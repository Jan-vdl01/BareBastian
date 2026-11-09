import { getPlan, type PlanId } from '../config/plans';

/**
 * ⚠️ DEMO-AUTHENTIFIZIERUNG
 * Alles hier läuft nur im Browser (localStorage) und bietet KEINEN echten Schutz.
 * Für den Live-Betrieb `demoAuthService` durch eine Implementierung ersetzen,
 * die mit einem Server spricht (Login, Sessions, Zahlungsanbieter, geschützte Medien).
 * Die übrige App nutzt ausschließlich das `AuthService`-Interface.
 */

export type SubscriptionStatus = 'active' | 'canceled';

export interface Subscription {
  plan: PlanId;
  status: SubscriptionStatus;
  startedAt: string;
  /** Ende des bezahlten Zeitraums (bei Kündigung: Zugriff bis dahin) */
  renewsAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  provider: 'password' | 'google' | 'github';
  subscription: Subscription | null;
}

export interface AuthService {
  current(): User | null;
  login(email: string, password: string, remember: boolean): Promise<User>;
  loginWithProvider(provider: 'google' | 'github'): Promise<User>;
  logout(): Promise<void>;
  subscribe(plan: PlanId): Promise<User>;
  cancelSubscription(): Promise<User>;
  resumeSubscription(): Promise<User>;
}

export function hasActiveAccess(user: User | null, now = new Date()): boolean {
  const sub = user?.subscription;
  if (!sub) return false;
  return new Date(sub.renewsAt) > now; // auch nach Kündigung bis Laufzeitende
}

const KEY = 'bb_demo_user';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function read(): User | null {
  try {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function write(user: User | null, remember = localStorage.getItem(KEY) !== null) {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  if (user) (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(user));
}

function newUser(email: string, provider: User['provider']): User {
  const name = email.split('@')[0].replace(/[._-]+/g, ' ');
  return {
    id: `demo-${Math.random().toString(36).slice(2, 10)}`,
    email,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    createdAt: new Date().toISOString(),
    provider,
    subscription: null,
  };
}

function requireUser(): User {
  const u = read();
  if (!u) throw new Error('Nicht angemeldet.');
  return u;
}

export const demoAuthService: AuthService = {
  current: read,

  async login(email, password, remember) {
    await delay(700);
    if (password.length < 6) throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.');
    const existing = read();
    const user = existing && existing.email === email ? existing : newUser(email, 'password');
    write(user, remember);
    return user;
  },

  async loginWithProvider(provider) {
    await delay(600);
    const user = newUser(`demo.${provider}@example.com`, provider);
    write(user, true);
    return user;
  },

  async logout() {
    write(null);
  },

  async subscribe(planId) {
    await delay(900);
    const user = requireUser();
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + getPlan(planId).months);
    const updated: User = {
      ...user,
      subscription: { plan: planId, status: 'active', startedAt: start.toISOString(), renewsAt: end.toISOString() },
    };
    write(updated);
    return updated;
  },

  async cancelSubscription() {
    await delay(400);
    const user = requireUser();
    if (!user.subscription) return user;
    const updated: User = { ...user, subscription: { ...user.subscription, status: 'canceled' } };
    write(updated);
    return updated;
  },

  async resumeSubscription() {
    await delay(400);
    const user = requireUser();
    if (!user.subscription) return user;
    const updated: User = { ...user, subscription: { ...user.subscription, status: 'active' } };
    write(updated);
    return updated;
  },
};
