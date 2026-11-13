#!/usr/bin/env bash
# Neue Version einspielen: sudo bash update.sh /pfad/zu/barebastian-release.zip
set -euo pipefail
ZIP=${1:?"Bitte Pfad zur ZIP-Datei angeben"}
BASE=/opt/barebastian
TMP=$(mktemp -d)
unzip -q "$ZIP" -d "$TMP"
SRC="$TMP/barebastian"
[ -f "$SRC/app/server.cjs" ] || { echo "Ungültiges Paket"; exit 1; }
bash "$BASE/deploy/backup.sh" || true
rm -rf "$BASE/app.old" && [ -d "$BASE/app" ] && mv "$BASE/app" "$BASE/app.old"
cp -r "$SRC/app" "$BASE/app"
cp -r "$SRC/deploy/." "$BASE/deploy/"
chown -R root:barebastian "$BASE/app" && chmod -R o-rwx "$BASE/app"
systemctl restart barebastian
sleep 2
if curl -fs http://127.0.0.1:3000/api/health >/dev/null; then
  echo "✔ Update erfolgreich."
  rm -rf "$TMP"
else
  echo "✘ Server antwortet nicht – stelle alte Version wieder her."
  rm -rf "$BASE/app" && mv "$BASE/app.old" "$BASE/app" && systemctl restart barebastian
  journalctl -u barebastian -n 30 --no-pager
  exit 1
fi
