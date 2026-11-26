import { Router } from 'express';
import { getPlan, PLANS } from '../src/portfolio/config/plans';
import { all, now, one, run, tx } from './db';
import { badRequest, h, HttpError, newId, notFound, rateLimit } from './security';
import { requireAdmin, type SubRow } from './users';

/**
 * Rabattcodes: prozentualer Rabatt auf ein Abo oder (bei 100 %) kostenloser Zugang für eine feste Zeit.
 */
export interface CodeRow {
  id: string;
  code: string;
  percent: number;
  months: number | null;
  max_uses: number | null;
  used: number;
  expires_at: string | null;
  active: number;
  note: string;
  created_at: string;
}

export const normalizeCode = (v: unknown) => String(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
export const discounted = (price: number, percent: number) => Math.round(price * (100 - percent)) / 100;

/** Prüft einen Code für ein Mitglied. Wirft eine verständliche Fehlermeldung, wenn er nicht gilt. */
export function validCode(raw: unknown, userId?: string): CodeRow {
  const code = normalizeCode(raw);
  const row = code ? one<CodeRow>('SELECT * FROM discount_codes WHERE code = ?', code) : undefined;
  if (!row || !row.active) throw badRequest('Dieser Code ist ungültig.');
  if (row.expires_at && row.expires_at < now()) throw badRequest('Dieser Code ist abgelaufen.');
  const usedByMe = userId ? !!one('SELECT 1 FROM code_redemptions WHERE code_id = ? AND user_id = ?', row.id, userId) : false;
  if (usedByMe && row.percent >= 100) throw badRequest('Du hast diesen Code bereits eingelöst.');
  if (!usedByMe && row.max_uses !== null && row.used >= row.max_uses) throw badRequest('Dieser Code wurde schon zu oft eingelöst.');
  return row;
}

/** Einlösung vermerken (pro Mitglied nur einmal gezählt). */
export function redeem(code: CodeRow, userId: string) {
  const res = run('INSERT OR IGNORE INTO code_redemptions (code_id, user_id, at) VALUES (?, ?, ?)', code.id, userId, now());
  if (res.changes) run('UPDATE discount_codes SET used = used + 1 WHERE id = ?', code.id);
}

/** Kostenlosen Zugang gewähren bzw. verlängern. Liefert das neue Ablaufdatum. */
export function grantAccess(userId: string, planId: string, months: number): string {
  const existing = one<SubRow>('SELECT * FROM subscriptions WHERE user_id = ?', userId);
  const end = existing && new Date(existing.renews_at) > new Date() ? new Date(existing.renews_at) : new Date();
  end.setMonth(end.getMonth() + months);
  tx(() => {
    run(
      'INSERT INTO subscriptions (user_id, plan, status, started_at, renews_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, status = excluded.status, renews_at = excluded.renews_at, updated_at = excluded.updated_at',
      userId,
      planId,
      'active',
      existing?.started_at ?? now(),
      end.toISOString(),
      now(),
    );
    run("UPDATE sub_requests SET status = 'done' WHERE user_id = ? AND status = 'open'", userId);
  });
  return end.toISOString();
}

export const codeInfo = (c: CodeRow) => ({
  code: c.code,
  percent: c.percent,
  free: c.percent >= 100,
  months: c.months,
  prices: Object.fromEntries(PLANS.map((p) => [p.id, discounted(p.price, c.percent)])),
});

export const codesRouter = Router();

/** Code prüfen (auch vor der Anmeldung möglich; begrenzt gegen Ausprobieren). */
codesRouter.post(
  '/codes/check',
  rateLimit('codes', 20, 15 * 60 * 1000, 'Zu viele Versuche. Bitte warte ein paar Minuten.', true),
  h((req, res) => {
    res.json(codeInfo(validCode(req.body?.code, req.user?.id)));
  }),
);

/* ---------- Verwaltung ---------- */

const adminCodes = Router();
adminCodes.use(requireAdmin);

const clientCode = (c: CodeRow) => ({ id: c.id, code: c.code, percent: c.percent, months: c.months, maxUses: c.max_uses, used: c.used, expiresAt: c.expires_at, active: !!c.active, note: c.note, createdAt: c.created_at });

adminCodes.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(all<CodeRow>('SELECT * FROM discount_codes ORDER BY created_at DESC').map(clientCode));
});

adminCodes.post(
  '/',
  h((req, res) => {
    const b = req.body ?? {};
    const code = normalizeCode(b.code);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw badRequest('Der Code braucht 3–30 Zeichen: Buchstaben, Zahlen, Bindestrich oder Unterstrich.');
    const percent = Math.round(Number(b.percent));
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) throw badRequest('Der Rabatt muss zwischen 1 und 100 % liegen.');
    const months = percent >= 100 ? Math.round(Number(b.months)) : null;
    if (months !== null && (!Number.isFinite(months) || months < 1 || months > 120)) throw badRequest('Bitte die Laufzeit des kostenlosen Zugangs angeben (1–120 Monate).');
    const maxUses = b.maxUses === null || b.maxUses === '' || b.maxUses === undefined ? null : Math.round(Number(b.maxUses));
    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) throw badRequest('Die Anzahl der Einlösungen muss mindestens 1 sein.');
    const expiresAt = b.expiresAt ? new Date(String(b.expiresAt)) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw badRequest('Das Ablaufdatum ist ungültig.');
    if (one('SELECT 1 FROM discount_codes WHERE code = ?', code)) throw new HttpError(409, 'Diesen Code gibt es schon.');
    const id = newId('dc');
    run('INSERT INTO discount_codes (id, code, percent, months, max_uses, used, expires_at, active, note, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?, ?)', id, code, percent, months, maxUses, expiresAt ? expiresAt.toISOString() : null, String(b.note ?? '').trim().slice(0, 200), now());
    res.status(201).json(clientCode(one<CodeRow>('SELECT * FROM discount_codes WHERE id = ?', id)!));
  }),
);

adminCodes.post('/:id/active', (req, res) => {
  const r = run('UPDATE discount_codes SET active = ? WHERE id = ?', req.body?.active === false ? 0 : 1, String(req.params.id));
  if (!r.changes) return res.status(404).json({ error: 'Code nicht gefunden.' });
  res.json({ ok: true });
});

adminCodes.delete(
  '/:id',
  h((req, res) => {
    if (!run('DELETE FROM discount_codes WHERE id = ?', String(req.params.id)).changes) throw notFound('Code nicht gefunden.');
    res.json({ ok: true });
  }),
);

export { adminCodes, getPlan };
