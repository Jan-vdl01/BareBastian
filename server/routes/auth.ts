import { Router } from 'express';
import { z } from 'zod';
import { getPlan, PLANS } from '../../src/portfolio/config/plans';
import { config, mailEnabled } from '../config';
import { all, now, one, parseJson, run } from '../db';
import { deleteFilesOf } from '../files';
import { notifyAdmin, sendMail } from '../mail';
import { badRequest, EMAIL_RE, h, hashPassword, HttpError, parseCookies, rateLimit, verifyPassword } from '../security';
import {
  clientUser,
  consumeToken,
  COOKIE,
  createOneTimeToken,
  createSession,
  createUser,
  CREATOR_ID,
  deleteUserData,
  destroyAllSessions,
  destroySession,
  getProfile,
  requireLogin,
  type UserRow,
} from '../users';

export const authRouter = Router();

const authLimit = rateLimit('auth', 12, 15 * 60 * 1000);
const mailLimit = rateLimit('mail', 5, 60 * 60 * 1000, 'Zu viele E-Mails angefordert. Bitte versuche es später erneut.');

const PASSWORD_MIN = 8;
const checkPassword = (pw: unknown) => {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) throw badRequest(`Das Passwort muss mindestens ${PASSWORD_MIN} Zeichen lang sein.`);
  if (pw.length > 200) throw badRequest('Das Passwort ist zu lang.');
  return pw;
};
const cleanEmail = (e: unknown) => {
  const email = String(e ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) throw badRequest('Bitte gib eine gültige E-Mail-Adresse ein.');
  return email;
};

async function sendVerification(user: UserRow) {
  const token = createOneTimeToken(user.id, 'verify', 72);
  await sendMail({
    to: user.email,
    subject: `E-Mail-Adresse bestätigen – ${config.siteName}`,
    title: 'Bitte bestätige deine E-Mail-Adresse',
    lines: ['Willkommen! Bitte bestätige deine E-Mail-Adresse, damit wir dich bei Passwort-Problemen und zu deinem Abo erreichen können.', 'Der Link ist 72 Stunden gültig.'],
    button: { label: 'E-Mail bestätigen', url: `${config.baseUrl}/#/email-bestaetigen?token=${token}` },
  });
}

/* ---------- Öffentliche Einstellungen ---------- */

authRouter.get('/config', (_req, res) => {
  res.json({
    siteName: config.siteName,
    mailEnabled: mailEnabled(),
    payment: { info: config.payment.info, links: config.payment.links },
    plans: PLANS.map((p) => p.id),
  });
});

/* ---------- Sitzung ---------- */

authRouter.get('/auth/me', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: req.user ? clientUser(req.user) : null });
});

authRouter.post(
  '/auth/register',
  authLimit,
  h(async (req, res) => {
    const body = req.body ?? {};
    const email = cleanEmail(body.email);
    const password = checkPassword(body.password);
    const displayName = String(body.displayName ?? '').trim().slice(0, 40);
    if (displayName.length < 2) throw badRequest('Bitte gib einen Anzeigenamen mit mindestens 2 Zeichen an.');
    if (body.ageConfirmed !== true) throw badRequest('Du musst mindestens 18 Jahre alt sein.');
    if (body.termsAccepted !== true) throw badRequest('Bitte akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.');
    if (one('SELECT 1 FROM users WHERE email = ?', email)) throw new HttpError(409, 'Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.');

    const user = createUser({ email, passwordHash: await hashPassword(password), displayName });
    createSession(res, user.id, true);
    sendVerification(user).catch(() => undefined);
    notifyAdmin('Neues Mitglied', [`${displayName} hat sich registriert.`]).catch(() => undefined);
    res.status(201).json({ user: clientUser(user) });
  }),
);

authRouter.post(
  '/auth/login',
  authLimit,
  h(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const user = one<UserRow>('SELECT * FROM users WHERE email = ?', email);
    // Gleiche Meldung für unbekannte E-Mail und falsches Passwort
    if (!user || !(await verifyPassword(password, user.password_hash))) throw new HttpError(401, 'E-Mail oder Passwort ist falsch.');
    if (user.disabled) throw new HttpError(403, 'Dieses Konto wurde gesperrt. Bitte kontaktiere den Support.');
    createSession(res, user.id, req.body?.remember !== false);
    res.json({ user: clientUser(user) });
  }),
);

authRouter.post('/auth/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

/* ---------- Passwort vergessen ---------- */

authRouter.post(
  '/auth/forgot',
  mailLimit,
  h(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const user = EMAIL_RE.test(email) ? one<UserRow>('SELECT * FROM users WHERE email = ?', email) : undefined;
    if (user && !user.disabled) {
      const token = createOneTimeToken(user.id, 'reset', 2);
      await sendMail({
        to: user.email,
        subject: `Passwort zurücksetzen – ${config.siteName}`,
        title: 'Neues Passwort festlegen',
        lines: ['Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf den Button, um ein neues Passwort festzulegen.', 'Der Link ist 2 Stunden gültig. Wenn du das nicht warst, kannst du diese E-Mail ignorieren.'],
        button: { label: 'Passwort zurücksetzen', url: `${config.baseUrl}/#/passwort-reset?token=${token}` },
      });
    }
    // Immer gleiche Antwort – verrät nicht, ob ein Konto existiert
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/auth/reset',
  authLimit,
  h(async (req, res) => {
    const password = checkPassword(req.body?.password);
    const userId = consumeToken(String(req.body?.token ?? ''), 'reset');
    if (!userId) throw badRequest('Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.');
    run('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?', await hashPassword(password), userId);
    destroyAllSessions(userId);
    const user = one<UserRow>('SELECT * FROM users WHERE id = ?', userId)!;
    createSession(res, userId, true);
    res.json({ user: clientUser(user) });
  }),
);

authRouter.post('/auth/verify', (req, res) => {
  const userId = consumeToken(String(req.body?.token ?? ''), 'verify');
  if (!userId) return res.status(400).json({ error: 'Der Bestätigungslink ist ungültig oder abgelaufen.' });
  run('UPDATE users SET email_verified = 1 WHERE id = ?', userId);
  res.json({ ok: true });
});

authRouter.post(
  '/auth/resend-verification',
  requireLogin,
  mailLimit,
  h(async (req, res) => {
    if (!req.user!.email_verified) await sendVerification(req.user!);
    res.json({ ok: true });
  }),
);

/* ---------- Konto ---------- */

authRouter.post(
  '/account/password',
  requireLogin,
  authLimit,
  h(async (req, res) => {
    if (!(await verifyPassword(String(req.body?.current ?? ''), req.user!.password_hash))) throw badRequest('Das aktuelle Passwort ist falsch.');
    const next = checkPassword(req.body?.next);
    run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(next), req.user!.id);
    destroyAllSessions(req.user!.id, parseCookies(req.headers.cookie)[COOKIE]);
    res.json({ ok: true });
  }),
);

authRouter.delete(
  '/account',
  requireLogin,
  authLimit,
  h(async (req, res) => {
    const user = req.user!;
    if (user.id === CREATOR_ID) throw badRequest('Das Creator-Konto kann nicht gelöscht werden.');
    if (!(await verifyPassword(String(req.body?.password ?? ''), user.password_hash))) throw badRequest('Das Passwort ist falsch.');
    deleteFilesOf(user.id);
    deleteUserData(user.id);
    destroySession(req, res);
    res.json({ ok: true });
  }),
);

/** Datenauskunft (DSGVO Art. 15/20): alle gespeicherten Daten als JSON. */
authRouter.get('/account/export', requireLogin, (req, res) => {
  const id = req.user!.id;
  const data = {
    exportedAt: now(),
    account: clientUser(req.user!),
    profile: getProfile(id),
    posts: all('SELECT id, text, design, images, poll, tags, visibility, created_at, edited_at FROM posts WHERE author_id = ?', id).map((p) => ({
      ...(p as Record<string, unknown>),
      design: parseJson((p as { design: string }).design, {}),
      images: parseJson((p as { images: string }).images, []),
    })),
    comments: all('SELECT post_id, text, created_at FROM post_comments WHERE author_id = ?', id),
    likes: all('SELECT post_id FROM post_likes WHERE user_id = ?', id),
    following: all('SELECT followee_id, created_at FROM follows WHERE follower_id = ?', id),
    messages: all('SELECT from_id, to_id, text, at, read_at FROM messages WHERE from_id = ? OR to_id = ?', id, id),
    documents: Object.fromEntries(all<{ key: string; value: string }>('SELECT key, value FROM user_docs WHERE user_id = ?', id).map((d) => [d.key, parseJson(d.value, null)])),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="meine-daten.json"');
  res.json(data);
});

/* ---------- Abo ---------- */

const planSchema = z.object({ plan: z.enum(['monthly', 'quarterly', 'yearly']) });

authRouter.post(
  '/subscription/request',
  requireLogin,
  h(async (req, res) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Bitte wähle ein Paket.');
    const user = req.user!;
    run("UPDATE sub_requests SET status = 'replaced' WHERE user_id = ? AND status = 'open'", user.id);
    run('INSERT INTO sub_requests (id, user_id, plan, status, created_at) VALUES (?, ?, ?, ?, ?)', `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, user.id, parsed.data.plan, 'open', now());
    const plan = getPlan(parsed.data.plan);
    const name = getProfile(user.id)?.displayName ?? user.email;
    notifyAdmin('Neue Abo-Anfrage', [`${name} (${user.email}) möchte das Paket „${plan.name}“ (${plan.price.toFixed(2)} €).`, 'Nach Zahlungseingang in der Verwaltung unter „Mitglieder & Abos“ freischalten.'], user.email).catch(() => undefined);
    sendMail({
      to: user.email,
      subject: `Deine Abo-Anfrage – ${config.siteName}`,
      title: 'Danke für deine Abo-Anfrage!',
      lines: [`Paket: ${plan.name} – ${plan.price.toFixed(2).replace('.', ',')} €`, config.payment.info],
      button: config.payment.links[plan.id] ? { label: 'Jetzt bezahlen', url: config.payment.links[plan.id] } : undefined,
    }).catch(() => undefined);
    res.json({ user: clientUser(user) });
  }),
);

authRouter.delete('/subscription/request', requireLogin, (req, res) => {
  run("UPDATE sub_requests SET status = 'withdrawn' WHERE user_id = ? AND status = 'open'", req.user!.id);
  res.json({ user: clientUser(req.user!) });
});

authRouter.post('/subscription/:action', requireLogin, (req, res) => {
  const status = req.params.action === 'cancel' ? 'canceled' : req.params.action === 'resume' ? 'active' : null;
  if (!status) return res.status(404).json({ error: 'Unbekannte Aktion.' });
  run('UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?', status, now(), req.user!.id);
  if (status === 'canceled') {
    const name = getProfile(req.user!.id)?.displayName ?? req.user!.email;
    notifyAdmin('Abo gekündigt', [`${name} (${req.user!.email}) hat das Abo gekündigt.`]).catch(() => undefined);
  }
  res.json({ user: clientUser(req.user!) });
});
