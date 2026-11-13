import nodemailer, { type Transporter } from 'nodemailer';
import { config, mailEnabled } from './config';

let transport: Transporter | null = null;

function getTransport() {
  if (!mailEnabled()) return null;
  transport ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transport;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Schlichtes HTML-Layout für alle E-Mails. */
function layout(title: string, lines: string[], button?: { label: string; url: string }) {
  const body = lines.map((l) => `<p style="margin:0 0 14px;line-height:1.55">${escape(l)}</p>`).join('');
  const btn = button
    ? `<p style="margin:24px 0"><a href="${escape(button.url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${escape(button.label)}</a></p><p style="font-size:12px;color:#64748b;word-break:break-all">Falls der Button nicht funktioniert: ${escape(button.url)}</p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border-radius:16px;padding:28px"><p style="margin:0 0 18px;font-weight:700;letter-spacing:.15em;color:#2563eb">${escape(config.siteName)}</p><h1 style="font-size:20px;margin:0 0 16px">${escape(title)}</h1>${body}${btn}</div></div></body></html>`;
}

export interface Mail {
  to: string;
  subject: string;
  title: string;
  lines: string[];
  button?: { label: string; url: string };
  replyTo?: string;
}

/** Versendet eine E-Mail. Ohne SMTP-Einstellungen wird sie nur im Server-Log ausgegeben. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const t = getTransport();
  const text = [...mail.lines, mail.button ? `${mail.button.label}: ${mail.button.url}` : ''].filter(Boolean).join('\n\n');
  if (!t) {
    console.log(`[Mail – SMTP nicht eingerichtet] An: ${mail.to} | ${mail.subject}\n${text}\n`);
    return false;
  }
  try {
    await t.sendMail({
      from: `"${config.siteName}" <${config.smtp.from}>`,
      to: mail.to,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text,
      html: layout(mail.title, mail.lines, mail.button),
    });
    return true;
  } catch (err) {
    console.error('[Mail] Versand fehlgeschlagen:', err instanceof Error ? err.message : err);
    return false;
  }
}

export const notifyAdmin = (subject: string, lines: string[], replyTo?: string) =>
  config.notifyEmail ? sendMail({ to: config.notifyEmail, subject: `[${config.siteName}] ${subject}`, title: subject, lines, replyTo }) : Promise.resolve(false);
