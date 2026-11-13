#!/usr/bin/env bash
# Gibt den Zustand der Installation aus (enthält KEINE Passwörter). Ausgabe bei Problemen kopieren und weitergeben.
BASE=/opt/barebastian
echo "== System =="; . /etc/os-release; echo "$PRETTY_NAME · Node $(node -v 2>&1) · $(nginx -v 2>&1)"
echo "== Dienste =="; for s in barebastian nginx firewalld ufw crond cron; do printf '%-12s %s\n' "$s" "$(systemctl is-active $s 2>/dev/null)"; done
echo "== Website-Server (Port 3000) =="; curl -s -m 5 http://127.0.0.1:3000/api/health || echo "antwortet NICHT"; echo
echo "== nginx (Port 80) =="; curl -s -m 5 -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1/ || echo "antwortet NICHT"
echo "== Offene Ports =="; (ss -ltnp 2>/dev/null || echo "(ss nicht verfügbar)") | grep -E ':(80|443|3000) |nicht' | awk '{print $4, $6}'
echo "== Einstellungen (ohne Passwörter) =="; grep -E '^(BASE_URL|PORT|HOST|DATA_DIR|PUBLIC_DIR|ADMIN_EMAIL|SMTP_HOST|SMTP_PORT|SMTP_USER|NOTIFY_EMAIL)=' "$BASE/.env" 2>/dev/null
echo "== Domain =="; D=$(grep -E '^BASE_URL=' "$BASE/.env" 2>/dev/null | sed -E "s/.*https?:\/\/([^'\/]+).*/\1/"); IP=$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -1)
echo "Server-IP: $IP · $D zeigt auf: $(getent hosts "$D" | awk '{print $1}' | tr '\n' ' ')"
echo "== Zertifikat =="; (certbot certificates 2>/dev/null | grep -E 'Domains|Expiry' ) || echo "kein Zertifikat"
command -v getenforce >/dev/null && echo "== SELinux: $(getenforce) · httpd_can_network_connect: $(getsebool httpd_can_network_connect 2>/dev/null | awk '{print $3}')"
echo "== nginx-Test =="; nginx -t 2>&1 | tail -2
echo "== Letzte Meldungen des Website-Servers =="; journalctl -u barebastian -n 25 --no-pager 2>/dev/null | cut -c1-220
