import type { PlanId } from '../config/plans';
import { api } from '../lib/api';
import type { Role } from './userDirectory';

/**
 * Anmeldung & Abo über den Server.
 * Die Sitzung liegt in einem httpOnly-Cookie; Passwörter werden nur auf dem Server (scrypt) geprüft.
 */
export type SubscriptionStatus = 'active' | 'canceled';

export interface Subscription {
  plan: PlanId;
  status: SubscriptionStatus;
  startedAt: string;
  /** Ende des bezahlten Zeitraums */
  renewsAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  provider: 'password';
  role: Role;
  emailVerified: boolean;
  subscription: Subscription | null;
  /** Offene Abo-Anfrage (wartet auf Zahlung/Freischaltung) */
  pendingRequest: { plan: PlanId; createdAt: string } | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
}

export interface PublicConfig {
  siteName: string;
  mailEnabled: boolean;
  payment: { info: string; links: Partial<Record<PlanId, string>> };
}

export const isAdmin = (user: User | null) => user?.role === 'admin';

export function hasActiveAccess(user: User | null, now = new Date()): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const sub = user.subscription;
  return !!sub && new Date(sub.renewsAt) > now; // auch nach Kündigung bis Laufzeitende
}

type UserResponse = { user: User | null };
const userOf = (r: UserResponse) => r.user;

export const authApi = {
  me: () =>
    api.get<UserResponse & { setup?: boolean }>('/auth/me').then((r) => {
      // Frische Installation (PHP-Version): zuerst die Einrichtung öffnen
      if (r.setup) window.location.replace('/einrichtung.php');
      return r.user;
    }),
  config: () => api.get<PublicConfig>('/config'),
  login: (email: string, password: string, remember: boolean) => api.post<UserResponse>('/auth/login', { email, password, remember }).then(userOf),
  register: (input: RegisterInput) => api.post<UserResponse>('/auth/register', input).then(userOf),
  logout: () => api.post('/auth/logout'),
  forgot: (email: string) => api.post('/auth/forgot', { email }),
  reset: (token: string, password: string) => api.post<UserResponse>('/auth/reset', { token, password }).then(userOf),
  verify: (token: string) => api.post('/auth/verify', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
  changePassword: (current: string, next: string) => api.post('/account/password', { current, next }),
  deleteAccount: (password: string) => api.del('/account', { password }),
  requestSubscription: (plan: PlanId) => api.post<UserResponse>('/subscription/request', { plan }).then(userOf),
  withdrawRequest: () => api.del<UserResponse>('/subscription/request').then(userOf),
  cancelSubscription: () => api.post<UserResponse>('/subscription/cancel').then(userOf),
  resumeSubscription: () => api.post<UserResponse>('/subscription/resume').then(userOf),
};
