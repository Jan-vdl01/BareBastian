#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  BAREBASTIAN – Ersteinrichtung auf einem Hostinger-VPS (Ubuntu 22.04 / 24.04)
#
#  Aufruf (im entpackten Release-Ordner, als root):
#     sudo bash deploy/setup-vps.sh
#
#  Das Skript installiert Node.js 22, nginx, certbot (HTTPS), eine Firewall,
#  richtet den Dienst ein, legt das Admin-Konto an und plant tägliche Sicherungen.
#  Es kann gefahrlos erneut ausgeführt werden.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Bitte mit sudo bzw. als root ausführen."; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$SRC/app/server.cjs" ] || { echo "app/server.cjs fehlt – bitte im entpackten Release-Ordner ausführen."; exit 1; }
BASE=/opt/barebastian

echo "== BAREBASTIAN Einrichtung =="
read -rp "Domain (ohne www, z. B. bare-bastian.de): " DOMAIN
read -rp "E-Mail für SSL-Zertifikat-Hinweise (Let's Encrypt): " CERT_MAIL
if [ ! -f "$BASE/.env" ]; then
  read -rp "Admin-E-Mail (dein Login): " ADMIN_EMAIL
  while true; do
    read -rsp "Admin-Passwort (mind. 10 Zeichen, ohne Apostroph '): " ADMIN_PASSWORD; echo
    case "$ADMIN_PASSWORD" in *"'"*) echo "Bitte ohne Apostroph."; continue ;; esac
    [ ${#ADMIN_PASSWORD} -ge 10 ] && break
    echo "Zu kurz."
  done
  read -rp "SMTP-Postfach für den Versand (z. B. noreply@$DOMAIN, leer = später): " SMTP_USER
  SMTP_PASS=""
  while [ -n "$SMTP_USER" ]; do
    read -rsp "Passwort dieses Postfachs (ohne Apostroph '): " SMTP_PASS; echo
    case "$SMTP_PASS" in *"'"*) echo "Bitte ohne Apostroph." ;; *) break ;; esac
  done
  read -rp "E-Mail für Benachrichtigungen (Kontakt, Abo-Anfragen): " NOTIFY_EMAIL
fi

echo "→ Pakete installieren …"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg unzip nginx certbot python3-certbot-nginx ufw sqlite3 >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "   Node $(node -v)"

echo "→ Benutzer und Ordner …"
id barebastian >/dev/null 2>&1 || useradd --system --home "$BASE" --shell /usr/sbin/nologin barebastian
mkdir -p "$BASE/data" "$BASE/backups" "$BASE/deploy"
rm -rf "$BASE/app" && cp -r "$SRC/app" "$BASE/app"
cp -r "$SRC/deploy/." "$BASE/deploy/"
chown -R root:barebastian "$BASE/app" && chmod -R o-rwx "$BASE/app"
chown -R barebastian:barebastian "$BASE/data"
chmod 750 "$BASE/data"

if [ ! -f "$BASE/.env" ]; then
  echo "→ Konfiguration schreiben …"
  cp "$SRC/.env.example" "$BASE/.env"
  set_env() { # Schlüssel Wert – Wert wird in '…' gesetzt (Sonderzeichen bleiben erhalten)
    local v; v=$(printf '%s' "$2" | sed -e 's/[\\&|]/\\&/g')
    sed -i "s|^$1=.*|$1='$v'|" "$BASE/.env"
  }
  set_env BASE_URL "https://$DOMAIN"
  set_env ADMIN_EMAIL "$ADMIN_EMAIL"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  set_env SMTP_USER "$SMTP_USER"
  set_env SMTP_PASS "$SMTP_PASS"
  set_env MAIL_FROM "$SMTP_USER"
  set_env NOTIFY_EMAIL "$NOTIFY_EMAIL"
  if [ -z "$SMTP_USER" ]; then set_env SMTP_HOST ""; fi
fi
chown root:barebastian "$BASE/.env" && chmod 640 "$BASE/.env"

echo "→ Dienst starten …"
cp "$BASE/deploy/barebastian.service" /etc/systemd/system/barebastian.service
systemctl daemon-reload
systemctl enable --now barebastian >/dev/null
systemctl restart barebastian
for i in $(seq 1 20); do curl -fs http://127.0.0.1:3000/api/health >/dev/null && break; sleep 1; done
curl -fs http://127.0.0.1:3000/api/health >/dev/null || { journalctl -u barebastian -n 40 --no-pager; echo "✘ Server startet nicht."; exit 1; }
# Admin wurde angelegt → Passwort aus der Konfiguration entfernen
sed -i 's|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=|' "$BASE/.env"

echo "→ nginx …"
sed "s/DOMAIN/$DOMAIN/g" "$BASE/deploy/nginx-barebastian.conf" > /etc/nginx/sites-available/barebastian
ln -sf /etc/nginx/sites-available/barebastian /etc/nginx/sites-enabled/barebastian
rm -f /etc/nginx/sites-enabled/default
sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf || true
nginx -t && systemctl reload nginx

echo "→ Firewall …"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

echo "→ HTTPS-Zertifikat …"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$CERT_MAIL" --redirect; then
  echo "   HTTPS aktiv."
else
  echo "⚠ Zertifikat fehlgeschlagen. Zeigt die Domain (A-Record für $DOMAIN und www) schon auf diese Server-IP?"
  echo "  Später erneut: certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect"
fi

echo "→ Tägliche Sicherung (03:30 Uhr) …"
chmod +x "$BASE/deploy/"*.sh
echo "30 3 * * * root bash $BASE/deploy/backup.sh >> /var/log/barebastian-backup.log 2>&1" > /etc/cron.d/barebastian-backup

echo
echo "✔ Fertig! Deine Website: https://$DOMAIN"
echo "  Admin-Login: https://$DOMAIN/#/login"
echo "  Status:      systemctl status barebastian"
echo "  Logs:        journalctl -u barebastian -f"
echo "  Einstellungen: nano $BASE/.env  (danach: systemctl restart barebastian)"
