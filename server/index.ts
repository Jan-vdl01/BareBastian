/**
 * BAREBASTIAN – Webserver
 * Liefert die Website aus und stellt die API bereit (Login, Abos, Social Hub, Chat, Bibliothek, Uploads).
 * Daten: SQLite-Datenbank + Upload-Ordner unter DATA_DIR.
 */
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { config, isProduction, mailEnabled } from './config';
import { one, run } from './db';
import { filesRouter } from './files';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { communityRouter } from './routes/community';
import { hashPassword, HttpError, rateLimit, requireAppHeader } from './security';
import { createUser, CREATOR_ID, loadUser, type UserRow } from './users';

/* ---------- Kommandozeile: Passwörter setzen ---------- */

async function cli(args: string[]) {
  const [cmd, a, b] = args;
  if (cmd === 'set-password') {
    if (!a || !b || b.length < 8) throw new Error('Verwendung: node server.cjs set-password <email> <neues-passwort (mind. 8 Zeichen)>');
    const res = run('UPDATE users SET password_hash = ?, disabled = 0 WHERE email = ?', await hashPassword(b), a.toLowerCase());
    run('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)', a.toLowerCase());
    console.log(res.changes ? `Passwort für ${a} wurde geändert.` : `Kein Konto mit der E-Mail ${a} gefunden.`);
    return true;
  }
  return false;
}

/* ---------- Admin-Konto beim ersten Start anlegen ---------- */

async function ensureAdmin() {
  if (one<UserRow>('SELECT * FROM users WHERE id = ?', CREATOR_ID)) return;
  if (!config.adminEmail || config.adminPassword.length < 8) {
    console.warn('⚠️  Noch kein Admin-Konto: Bitte ADMIN_EMAIL und ADMIN_PASSWORD (mind. 8 Zeichen) in der .env setzen und neu starten.');
    return;
  }
  createUser({
    id: CREATOR_ID,
    email: config.adminEmail,
    passwordHash: await hashPassword(config.adminPassword),
    role: 'admin',
    displayName: 'BAREBASTIAN',
    username: 'barebastian',
    verified: true,
    profile: {
      bio: 'Content Creator aus Hamburg. Exklusive Inhalte, Live-Streams und persönliche Nachrichten.',
      location: 'Hamburg',
      interests: ['Content Creation', 'Live-Streams', 'Gym', 'Gaming'],
      socials: { instagram: 'bare.bastian', x: 'Bare_Bastian', telegram: 'Bare_Bastian' },
    },
  });
  console.log(`✔ Admin-Konto ${config.adminEmail} wurde angelegt. Bitte ADMIN_PASSWORD jetzt aus der .env entfernen.`);
}

/* ---------- App ---------- */

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // hinter nginx

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          mediaSrc: ["'self'", 'blob:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: isProduction ? { maxAge: 31536000 } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      crossOriginOpenerPolicy: false,
      originAgentCluster: false,
    }),
  );

  /* API */
  const api = express.Router();
  api.use(rateLimit('api', 600, 60 * 1000, 'Zu viele Anfragen. Bitte kurz warten.'));
  api.use(requireAppHeader);
  api.use(loadUser);
  api.use('/files', filesRouter); // roher Upload – vor dem JSON-Parser
  api.use(express.json({ limit: '8mb' }));
  api.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  api.use(authRouter);
  api.use(communityRouter);
  api.use('/admin', adminRouter);
  api.use((_req, res) => res.status(404).json({ error: 'Unbekannte Adresse.' }));
  api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    const status = (err as { status?: number; type?: string }).status;
    if (status === 413) return res.status(413).json({ error: 'Die Anfrage ist zu groß.' });
    if (status === 400 && (err as { type?: string }).type === 'entity.parse.failed') return res.status(400).json({ error: 'Ungültige Daten.' });
    console.error('[Fehler]', err);
    res.status(500).json({ error: 'Interner Fehler. Bitte versuche es später erneut.' });
  });
  app.use('/api', api);

  /* Website */
  const indexFile = path.join(config.publicDir, 'index.html');
  app.use(
    express.static(config.publicDir, {
      index: false,
      setHeaders(res, file) {
        if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.get('*', (_req, res) => {
    if (!fs.existsSync(indexFile)) return res.status(503).send('Die Website wurde noch nicht gebaut (index.html fehlt).');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });

  return app;
}

async function main() {
  process.on('unhandledRejection', (err) => console.error('[Fehler] Unbehandelt:', err));
  if (await cli(process.argv.slice(2))) return;
  await ensureAdmin();
  run('DELETE FROM sessions WHERE expires_at < ?', new Date().toISOString());
  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(`✔ ${config.siteName} läuft auf http://${config.host}:${config.port} (öffentlich: ${config.baseUrl})`);
    console.log(`  Daten: ${config.dataDir} · E-Mail-Versand: ${mailEnabled() ? 'aktiv' : 'nicht eingerichtet (Mails werden nur geloggt)'}`);
  });
  // Große Video-Uploads über langsame Leitungen dürfen bis zu 6 Stunden dauern (Standard wären 5 Minuten)
  server.requestTimeout = 6 * 60 * 60 * 1000;
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? `✘ Port ${config.port} ist bereits belegt. Bitte in der .env einen anderen PORT setzen (und in der nginx-Konfiguration anpassen).` : err);
    process.exit(1);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
