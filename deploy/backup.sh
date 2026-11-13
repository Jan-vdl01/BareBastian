#!/usr/bin/env bash
# Tägliche Sicherung: Datenbank (konsistente Kopie) + Uploads. Behält 14 Tage.
set -euo pipefail
BASE=/opt/barebastian
DEST=$BASE/backups
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DEST"
sqlite3 "$BASE/data/barebastian.db" ".backup '$DEST/db-$STAMP.sqlite'"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$BASE/data" uploads
gzip -f "$DEST/db-$STAMP.sqlite"
find "$DEST" -type f -mtime +14 -delete
echo "Sicherung fertig: $DEST ($STAMP)"
