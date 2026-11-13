import type { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { all, db, now, one, parseJson, run, tx } from './db';
import { forbidden, HttpError, newId, newToken, parseCookies, sha256 } from './security';

export const CREATOR_ID = 'creator';
export const COOKIE = 'bb_sid';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'member' | 'admin';
  created_at: string;
  email_verified: number;
  disabled: number;
  last_login_at: string | null;
}

export interface SubRow {
  user_id: string;
  plan: string;
  status: 'active' | 'canceled';
  started_at: string;
  renews_at: string;
}

export interface ProfileData {
  displayName: string;
  avatar?: string;
  cover?: string;
  bio: string;
  location: string;
  website: string;
  pronouns: string;
  interests: string[];
  socials: { instagram?: string; x?: string; telegram?: string };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserRow;
  }
}

/* ---------- Abo ---------- */

export const getSubscription = (userId: string) => one<SubRow>('SELECT * FROM subscriptions WHERE user_id = ?', userId);

export function hasAccess(user: UserRow | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const sub = getSubscription(user.id);
  return !!sub && new Date(sub.renews_at) > new Date();
}

/* ---------- Profile ---------- */

export const emptyProfile = (displayName: string): ProfileData => ({
  displayName,
  bio: '',
  location: '',
  website: '',
  pronouns: '',
  interests: [],
  socials: {},
});

export function uniqueUsername(base: string): string {
  let clean = base.toLowerCase().normalize('NFKD').replace(/[^a-z0-9_.]/g, '').slice(0, 16);
  if (clean.length < 3) clean = `${clean}mitglied`.slice(0, 16);
  let name = clean;
  for (let i = 2; one('SELECT 1 FROM profiles WHERE username = ?', name); i++) name = `${clean}${i}`;
  return name;
}

interface ProfileRow {
  user_id: string;
  username: string;
  data: string;
  role: string;
  created_at: string;
}

const toProfile = (r: ProfileRow) => ({
  ...emptyProfile('Mitglied'),
  ...parseJson<Partial<ProfileData>>(r.data, {}),
  id: r.user_id,
  username: r.username,
  joinedAt: r.created_at,
  role: r.role as 'member' | 'admin',
});
export type Profile = ReturnType<typeof toProfile>;

const PROFILE_SQL = 'SELECT p.user_id, p.username, p.data, u.role, u.created_at FROM profiles p JOIN users u ON u.id = p.user_id';

export function listProfiles(): Record<string, Profile> {
  const rows = all<ProfileRow>(`${PROFILE_SQL} WHERE u.disabled = 0`);
  return Object.fromEntries(rows.map((r) => [r.user_id, toProfile(r)]));
}

export function getProfile(userId: string): Profile | undefined {
  const r = one<ProfileRow>(`${PROFILE_SQL} WHERE p.user_id = ?`, userId);
  return r ? toProfile(r) : undefined;
}

/* ---------- Benutzer anlegen ---------- */

export function createUser(opts: { id?: string; email: string; passwordHash: string; role?: 'member' | 'admin'; displayName: string; username?: string; profile?: Partial<ProfileData>; verified?: boolean }) {
  const id = opts.id ?? newId('u');
  const t = now();
  tx(() => {
    run(
      'INSERT INTO users (id, email, password_hash, role, created_at, email_verified, age_confirmed_at, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      opts.email.toLowerCase(),
      opts.passwordHash,
      opts.role ?? 'member',
      t,
      opts.verified ? 1 : 0,
      t,
      t,
    );
    run('INSERT INTO profiles (user_id, username, data) VALUES (?, ?, ?)', id, opts.username ?? uniqueUsername(opts.displayName || opts.email.split('@')[0]), JSON.stringify({ ...emptyProfile(opts.displayName), ...opts.profile }));
    // Neue Mitglieder folgen anfangs dem Creator
    if (id !== CREATOR_ID && one('SELECT 1 FROM users WHERE id = ?', CREATOR_ID)) run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', id, CREATOR_ID, t);
  });
  return one<UserRow>('SELECT * FROM users WHERE id = ?', id)!;
}

/* ---------- Sitzungen ---------- */

export function createSession(res: Response, userId: string, remember: boolean) {
  const token = newToken();
  const days = remember ? config.sessionDays : 1;
  const expires = new Date(Date.now() + days * 86400000);
  run('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, remember) VALUES (?, ?, ?, ?, ?)', sha256(token), userId, now(), expires.toISOString(), remember ? 1 : 0);
  run('UPDATE users SET last_login_at = ? WHERE id = ?', now(), userId);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    // „Secure“ nur über HTTPS – so funktioniert die Seite auch, solange das Zertifikat noch fehlt
    secure: res.req.secure,
    sameSite: 'lax',
    path: '/',
    ...(remember ? { expires } : {}),
  });
}

export function destroySession(req: Request, res: Response) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', sha256(token));
  res.clearCookie(COOKIE, { path: '/' });
}

export const destroyAllSessions = (userId: string, exceptToken?: string) =>
  exceptToken ? run('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', userId, sha256(exceptToken)) : run('DELETE FROM sessions WHERE user_id = ?', userId);

/** Liest das Sitzungs-Cookie und hängt den Benutzer an die Anfrage. */
export function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) {
    const hash = sha256(token);
    const s = one<{ user_id: string; expires_at: string; remember: number }>('SELECT user_id, expires_at, remember FROM sessions WHERE token_hash = ?', hash);
    if (s && new Date(s.expires_at) > new Date()) {
      const user = one<UserRow>('SELECT * FROM users WHERE id = ?', s.user_id);
      if (user && !user.disabled) {
        req.user = user;
        // Sitzung verlängern, wenn sie zur Hälfte abgelaufen ist
        const days = s.remember ? config.sessionDays : 1;
        if (new Date(s.expires_at).getTime() - Date.now() < (days * 86400000) / 2) {
          run('UPDATE sessions SET expires_at = ? WHERE token_hash = ?', new Date(Date.now() + days * 86400000).toISOString(), hash);
        }
      }
    } else if (s) {
      run('DELETE FROM sessions WHERE token_hash = ?', hash);
    }
  }
  next();
}

export function requireLogin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Bitte melde dich an.'));
  next();
}

export function requireAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Bitte melde dich an.'));
  if (!hasAccess(req.user)) return next(forbidden('Dafür brauchst du ein aktives Abo.'));
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return next(forbidden());
  next();
}

/* ---------- Einmal-Tokens (Passwort-Reset, E-Mail-Bestätigung) ---------- */

export function createOneTimeToken(userId: string, kind: 'reset' | 'verify', hours: number) {
  const token = newToken();
  run('DELETE FROM tokens WHERE user_id = ? AND kind = ?', userId, kind);
  run('INSERT INTO tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)', sha256(token), userId, kind, new Date(Date.now() + hours * 3600000).toISOString());
  return token;
}

export function consumeToken(token: string, kind: 'reset' | 'verify'): string | null {
  const hash = sha256(token);
  const row = one<{ user_id: string; expires_at: string }>('SELECT user_id, expires_at FROM tokens WHERE token_hash = ? AND kind = ?', hash, kind);
  if (!row) return null;
  run('DELETE FROM tokens WHERE token_hash = ?', hash);
  return new Date(row.expires_at) > new Date() ? row.user_id : null;
}

/* ---------- Darstellung für die Oberfläche ---------- */

export function clientUser(user: UserRow) {
  const sub = getSubscription(user.id);
  const request = one<{ plan: string; created_at: string }>("SELECT plan, created_at FROM sub_requests WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1", user.id);
  const profile = getProfile(user.id);
  return {
    id: user.id,
    email: user.email,
    displayName: profile?.displayName ?? 'Mitglied',
    createdAt: user.created_at,
    provider: 'password' as const,
    role: user.role,
    emailVerified: !!user.email_verified,
    subscription: sub ? { plan: sub.plan, status: sub.status, startedAt: sub.started_at, renewsAt: sub.renews_at } : null,
    pendingRequest: request ? { plan: request.plan, createdAt: request.created_at } : null,
  };
}

/** Löscht ein Konto mit allen Daten (Dateien werden separat entfernt). */
export function deleteUserData(userId: string) {
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}
