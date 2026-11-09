/**
 * Admin-Zugang (Demo).
 *
 * Wer sich mit ADMIN_EMAIL und dem passenden Passwort anmeldet, erhält die Admin-Rolle:
 * Zugang zum Abo-Bereich ohne Abo, Inhalte verwalten (Videos, Fotos, Posts) und
 * Nachrichten an BAREBASTIAN beantworten.
 *
 * Passwort ändern: SHA-256-Hash des neuen Passworts erzeugen, z. B. im Terminal
 *   node -e "console.log(require('crypto').createHash('sha256').update('NEUES-PASSWORT').digest('hex'))"
 * und unten bei ADMIN_PASSWORD_SHA256 eintragen. Danach neu bauen.
 *
 * ⚠️ Im Demo-Modus findet die Prüfung im Browser statt. Das verhindert normale Zugriffe,
 * ist aber KEIN echter Schutz – dafür braucht es ein Backend.
 */
export const ADMIN_EMAIL = 'admin@bare-bastian.de';

/** Standard-Passwort: BareAdmin2026!  → bitte ändern */
export const ADMIN_PASSWORD_SHA256 = '90840ec4dc1893b0c8f94aabbae00eba81073febd8088915f7a5b22f228ac52e';

/** Feste ID des Creator-Kontos (BAREBASTIAN) – Admin und Chat-Partner für alle Mitglieder. */
export const CREATOR_ID = 'creator';
