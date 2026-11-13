import path from 'node:path';
import dotenv from 'dotenv';

// .env im aktuellen Ordner oder neben dem App-Ordner (/opt/barebastian/.env) laden
dotenv.config({ path: [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')], quiet: true });

/** Alle Einstellungen kommen aus Umgebungsvariablen bzw. der Datei `.env` (siehe `.env.example`). */
const env = (key: string, fallback = '') => (process.env[key] ?? fallback).trim();
const num = (key: string, fallback: number) => {
  const v = Number(env(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const isProduction = env('NODE_ENV') === 'production';

export const config = {
  port: num('PORT', 3000),
  host: env('HOST', '127.0.0.1'),
  /** Öffentliche Adresse der Website, z. B. https://bare-bastian.de (für Links in E-Mails) */
  baseUrl: env('BASE_URL', 'http://localhost:3000').replace(/\/+$/, ''),
  siteName: env('SITE_NAME', 'BAREBASTIAN'),
  dataDir: path.resolve(env('DATA_DIR', path.join(process.cwd(), 'data'))),
  /** Verzeichnis mit der gebauten Website (index.html + assets) */
  publicDir: path.resolve(env('PUBLIC_DIR', path.join(process.cwd(), 'dist'))),

  adminEmail: env('ADMIN_EMAIL').toLowerCase(),
  adminPassword: env('ADMIN_PASSWORD'),

  sessionDays: num('SESSION_DAYS', 30),

  smtp: {
    host: env('SMTP_HOST'),
    port: num('SMTP_PORT', 465),
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
    from: env('MAIL_FROM') || env('SMTP_USER'),
  },
  /** Empfänger für Benachrichtigungen (Kontaktformular, Abo-Anfragen) */
  notifyEmail: env('NOTIFY_EMAIL') || env('ADMIN_EMAIL'),

  payment: {
    info: env(
      'PAYMENT_INFO',
      'Nach deiner Anfrage erhältst du die Zahlungsinformationen per E-Mail. Sobald die Zahlung eingegangen ist, wird dein Abo freigeschaltet.',
    ),
    links: {
      monthly: env('PAYMENT_LINK_MONTHLY'),
      quarterly: env('PAYMENT_LINK_QUARTERLY'),
      yearly: env('PAYMENT_LINK_YEARLY'),
    } as Record<string, string>,
  },

  maxUploadMb: {
    library: num('MAX_VIDEO_UPLOAD_MB', 2048),
    other: num('MAX_IMAGE_UPLOAD_MB', 15),
  },
};

export const uploadsDir = path.join(config.dataDir, 'uploads');
export const mailEnabled = () => !!config.smtp.host;
