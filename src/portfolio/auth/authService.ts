import { ADMIN_EMAIL, ADMIN_PASSWORD_SHA256, CREATOR_ID } from '../config/admin';
import { getPlan, type PlanId } from '../config/plans';
import { readJSON, writeJSON } from '../lib/localStore';
import { sha256 } from '../lib/sha256';
import { createAccount, ensureCreatorProfile, findAccountByEmail, getProfile, type Role } from './userDirectory';

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
  role: Role;
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

export const isAdmin = (user: User | null) => user?.role === 'admin';

export function hasActiveAccess(user: User | null, now = new Date()): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const sub = user.subscription;
  return !!sub && new Date(sub.renewsAt) > now; // auch nach Kündigung bis Laufzeitende
}

const SESSION_KEY = 'bb_session';
const SUBS_KEY = 'bb_subscriptions';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Session {
  userId: string;
  email: string;
  provider: User['provider'];
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null, remember = true) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  if (session) (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
}

const readSubs = () => readJSON<Record<string, Subscription>>(SUBS_KEY, {});

function buildUser(session: Session): User | null {
  const profile = getProfile(session.userId);
  if (!profile) return null;
  return {
    id: profile.id,
    email: session.email,
    displayName: profile.displayName,
    createdAt: profile.joinedAt,
    provider: session.provider,
    role: profile.role,
    subscription: readSubs()[profile.id] ?? null,
  };
}

function requireUser(): User {
  const s = readSession();
  const u = s && buildUser(s);
  if (!u) throw new Error('Nicht angemeldet.');
  return u;
}

function updateSubscription(userId: string, fn: (sub: Subscription | undefined) => Subscription | undefined) {
  const subs = readSubs();
  const next = fn(subs[userId]);
  if (next) subs[userId] = next;
  else delete subs[userId];
  writeJSON(SUBS_KEY, subs);
}

export const demoAuthService: AuthService = {
  current() {
    const s = readSession();
    return s ? buildUser(s) : null;
  },

  async login(rawEmail, password, remember) {
    await delay(600);
    const email = rawEmail.trim().toLowerCase();
    const hash = await sha256(password);

    if (email === ADMIN_EMAIL.toLowerCase()) {
      if (hash !== ADMIN_PASSWORD_SHA256) throw new Error('E-Mail oder Passwort ist falsch.');
      ensureCreatorProfile();
      const session: Session = { userId: CREATOR_ID, email, provider: 'password' };
      writeSession(session, remember);
      return buildUser(session)!;
    }

    if (password.length < 6) throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.');
    const account = findAccountByEmail(email);
    let userId: string;
    if (account) {
      if (account.passwordHash && account.passwordHash !== hash) throw new Error('E-Mail oder Passwort ist falsch.');
      userId = account.id;
    } else {
      userId = createAccount(email, hash, 'password').id; // erster Login = Registrierung
    }
    const session: Session = { userId, email, provider: 'password' };
    writeSession(session, remember);
    return buildUser(session)!;
  },

  async loginWithProvider(provider) {
    await delay(500);
    const email = `demo.${provider}@example.com`;
    const account = findAccountByEmail(email);
    const userId = account?.id ?? createAccount(email, null, provider).id;
    const session: Session = { userId, email, provider };
    writeSession(session, true);
    return buildUser(session)!;
  },

  async logout() {
    writeSession(null);
  },

  async subscribe(planId) {
    await delay(800);
    const user = requireUser();
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + getPlan(planId).months);
    updateSubscription(user.id, () => ({ plan: planId, status: 'active', startedAt: start.toISOString(), renewsAt: end.toISOString() }));
    return requireUser();
  },

  async cancelSubscription() {
    await delay(300);
    const user = requireUser();
    updateSubscription(user.id, (s) => (s ? { ...s, status: 'canceled' } : s));
    return requireUser();
  },

  async resumeSubscription() {
    await delay(300);
    const user = requireUser();
    updateSubscription(user.id, (s) => (s ? { ...s, status: 'active' } : s));
    return requireUser();
  },
};
