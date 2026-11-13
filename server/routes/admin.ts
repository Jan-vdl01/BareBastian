import { Router } from 'express';
import { getPlan } from '../../src/portfolio/config/plans';
import { config } from '../config';
import { all, now, one, run, tx } from '../db';
import { deleteFilesOf } from '../files';
import { sendMail } from '../mail';
import { badRequest, h, notFound } from '../security';
import { CREATOR_ID, deleteUserData, destroyAllSessions, getProfile, requireAdmin, type SubRow, type UserRow } from '../users';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/users', (_req, res) => {
  const users = all<UserRow>('SELECT * FROM users ORDER BY created_at DESC');
  const subs = new Map(all<SubRow>('SELECT * FROM subscriptions').map((s) => [s.user_id, s]));
  const reqs = new Map(all<{ user_id: string; plan: string; created_at: string; id: string; code: string | null; percent: number | null; price: number | null }>("SELECT * FROM sub_requests WHERE status = 'open'").map((r) => [r.user_id, r]));
  res.setHeader('Cache-Control', 'no-store');
  res.json(
    users.map((u) => {
      const p = getProfile(u.id);
      const s = subs.get(u.id);
      const r = reqs.get(u.id);
      return {
        id: u.id,
        email: u.email,
        displayName: p?.displayName ?? '–',
        username: p?.username ?? '',
        avatar: p?.avatar,
        role: u.role,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
        emailVerified: !!u.email_verified,
        disabled: !!u.disabled,
        subscription: s ? { plan: s.plan, status: s.status, startedAt: s.started_at, renewsAt: s.renews_at } : null,
        request: r ? { id: r.id, plan: r.plan, createdAt: r.created_at, code: r.code, percent: r.percent, price: r.price } : null,
      };
    }),
  );
});

const targetUser = (id: string) => {
  const u = one<UserRow>('SELECT * FROM users WHERE id = ?', id);
  if (!u) throw notFound('Mitglied nicht gefunden.');
  return u;
};

/** Abo freischalten / verlängern (nach Zahlungseingang) oder sofort beenden. */
adminRouter.post(
  '/users/:id/subscription',
  h(async (req, res) => {
    const user = targetUser(String(req.params.id));
    const action = req.body?.action;
    if (action === 'end') {
      run('DELETE FROM subscriptions WHERE user_id = ?', user.id);
      return res.json({ ok: true });
    }
    if (action !== 'grant') throw badRequest('Unbekannte Aktion.');
    const plan = getPlan(req.body?.plan);
    const months = Math.max(1, Math.min(36, Number(req.body?.months) || plan.months));
    const existing = one<SubRow>('SELECT * FROM subscriptions WHERE user_id = ?', user.id);
    const base = existing && new Date(existing.renews_at) > new Date() ? new Date(existing.renews_at) : new Date();
    const end = new Date(base);
    end.setMonth(end.getMonth() + months);
    tx(() => {
      run(
        'INSERT INTO subscriptions (user_id, plan, status, started_at, renews_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, status = excluded.status, renews_at = excluded.renews_at, updated_at = excluded.updated_at',
        user.id,
        plan.id,
        'active',
        existing?.started_at ?? now(),
        end.toISOString(),
        now(),
      );
      run("UPDATE sub_requests SET status = 'done' WHERE user_id = ? AND status = 'open'", user.id);
    });
    sendMail({
      to: user.email,
      subject: `Dein Abo ist aktiv – ${config.siteName}`,
      title: 'Dein Abo ist freigeschaltet 🎉',
      lines: [`Paket: ${plan.name}`, `Dein Zugang gilt bis ${end.toLocaleDateString('de-DE')}. Viel Spaß im Abo-Bereich!`],
      button: { label: 'Zum Abo-Bereich', url: `${config.baseUrl}/#/abo-bereich` },
    }).catch(() => undefined);
    res.json({ ok: true, renewsAt: end.toISOString() });
  }),
);

adminRouter.post('/requests/:id/dismiss', (req, res) => {
  run("UPDATE sub_requests SET status = 'dismissed' WHERE id = ?", String(req.params.id));
  res.json({ ok: true });
});

adminRouter.post('/users/:id/disable', (req, res) => {
  const user = targetUser(String(req.params.id));
  if (user.id === CREATOR_ID || user.role === 'admin') return res.status(400).json({ error: 'Admins können nicht gesperrt werden.' });
  const disabled = req.body?.disabled === true;
  run('UPDATE users SET disabled = ? WHERE id = ?', disabled ? 1 : 0, user.id);
  if (disabled) destroyAllSessions(user.id);
  res.json({ ok: true });
});

adminRouter.delete('/users/:id', (req, res) => {
  const user = targetUser(String(req.params.id));
  if (user.id === CREATOR_ID || user.role === 'admin') return res.status(400).json({ error: 'Admins können nicht gelöscht werden.' });
  deleteFilesOf(user.id);
  deleteUserData(user.id);
  res.json({ ok: true });
});

/* ---------- Kontaktanfragen ---------- */

adminRouter.get('/contact', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(all('SELECT id, name, email, topic, message, created_at AS createdAt, handled FROM contact_messages ORDER BY created_at DESC LIMIT 200'));
});

adminRouter.post('/contact/:id/handled', (req, res) => {
  run('UPDATE contact_messages SET handled = ? WHERE id = ?', req.body?.handled === false ? 0 : 1, String(req.params.id));
  res.json({ ok: true });
});

adminRouter.delete('/contact/:id', (req, res) => {
  run('DELETE FROM contact_messages WHERE id = ?', String(req.params.id));
  res.json({ ok: true });
});

/** Kennzahlen für die Verwaltung */
adminRouter.get('/stats', (_req, res) => {
  const count = (sql: string, ...p: string[]) => one<{ n: number }>(sql, ...p)?.n ?? 0;
  res.json({
    members: count("SELECT COUNT(*) n FROM users WHERE role = 'member'"),
    activeSubs: count('SELECT COUNT(*) n FROM subscriptions WHERE renews_at > ?', now()),
    openRequests: count("SELECT COUNT(*) n FROM sub_requests WHERE status = 'open'"),
    openContact: count('SELECT COUNT(*) n FROM contact_messages WHERE handled = 0'),
    posts: count('SELECT COUNT(*) n FROM posts'),
    messages: count('SELECT COUNT(*) n FROM messages'),
    storageMb: Math.round(((one<{ n: number }>('SELECT COALESCE(SUM(size), 0) n FROM files')?.n ?? 0) / 1024 / 1024) * 10) / 10,
  });
});
