# BAREBASTIAN – Livegang auf dem Hostinger-VPS

Die Website besteht aus zwei Teilen:

- **Website (Frontend):** React-App, liegt in `app/public/`.
- **Server (Backend):** `app/server.cjs`. Er stellt Login, Abos, Social Hub, Chat, Bibliothek und Uploads bereit.

Alle Daten liegen in einer SQLite-Datenbank und einem Upload-Ordner unter `/opt/barebastian/data`. Ein zusätzlicher Datenbankserver ist nicht nötig.

---

## 1. Vorbereitung in Hostinger (hPanel)

1. **VPS** mit **Ubuntu 24.04** (oder 22.04) als Betriebssystem. Das Root-Passwort bzw. den SSH-Zugang findest du unter *VPS → Übersicht*.
2. **Domain auf den VPS zeigen lassen:** Unter *Domains → DNS / Nameserver* zwei **A-Records** anlegen:
   - `@` → IP-Adresse des VPS
   - `www` → IP-Adresse des VPS

   Bis sie überall gelten, kann es bis zu einige Stunden dauern.
3. **E-Mail-Postfach für den Versand** anlegen, z. B. `noreply@deine-domain.de` (*E-Mails → Postfach erstellen*). Darüber verschickt die Website Bestätigungen, Passwort-Links und Abo-Infos.
4. Falls in hPanel eine **VPS-Firewall** aktiv ist: Die Ports **22, 80 und 443** müssen offen sein.

## 2. Paket hochladen

Auf deinem PC im Ordner mit `barebastian-release.zip`:

```bash
scp barebastian-release.zip root@DEINE-VPS-IP:/root/
```

Ohne Terminal geht es auch mit WinSCP oder FileZilla (Protokoll SFTP, Benutzer `root`).

## 3. Einrichten (einmalig)

Per SSH verbinden. Das geht mit `ssh root@DEINE-VPS-IP` oder über das Browser-Terminal in hPanel. Dann:

```bash
cd /root
apt-get install -y unzip
unzip barebastian-release.zip
sudo bash barebastian/deploy/setup-vps.sh
```

Das Skript fragt nach:

- **Domain:** z. B. `bare-bastian.de`
- **E-Mail für das SSL-Zertifikat**
- **Admin-E-Mail und Admin-Passwort:** dein Login als BAREBASTIAN
- **Versand-Postfach und dessen Passwort:** aus Schritt 1.3
- **Benachrichtigungs-E-Mail:** Kontaktformular, neue Abo-Anfragen

Danach installiert es alles automatisch:

- Node.js 22 und nginx
- HTTPS-Zertifikat
- Firewall
- Dienst mit Autostart
- tägliche Sicherung

Danach ist die Seite unter `https://deine-domain.de` erreichbar.

> Das Admin-Passwort wird nach dem ersten Start automatisch aus der Konfiguration gelöscht. In der Datenbank liegt es nur verschlüsselt (scrypt-Hash).

## 4. Erste Schritte nach dem Livegang

1. Unter `https://deine-domain.de/#/login` mit der Admin-E-Mail anmelden.
2. **Mein Profil:** Profilbild, Titelbild und Bio einrichten. Das Profil sehen alle Mitglieder.
3. **Bibliothek:** Videos und Fotos hochladen und Posts schreiben. Die Dateien liegen geschützt auf dem Server und sind nur für Mitglieder mit aktivem Abo abrufbar.
4. **Preise anpassen:** `src/portfolio/config/plans.ts`, danach neu bauen (siehe Abschnitt 8).
5. **Zahlungstext anpassen:** in `/opt/barebastian/.env` → `PAYMENT_INFO` und optional `PAYMENT_LINK_…`. Danach `systemctl restart barebastian`.

## 5. So funktioniert das Abo

1. Ein Besucher **registriert sich**. Dabei bestätigt er, dass er 18+ ist und die Nutzungsbedingungen akzeptiert.
2. Er wählt ein Paket und klickt **„Abo anfragen“**. Er sieht deinen Zahlungstext bzw. Bezahl-Link und bekommt ihn per E-Mail. Du bekommst eine Benachrichtigung.
3. Nach Zahlungseingang klickst du in **Verwaltung → Mitglieder & Abos** auf **„Abo freischalten“**. Das Mitglied bekommt eine E-Mail und hat sofort Zugang.
4. Das Abo endet automatisch nach der Laufzeit. Zum Verlängern stellt das Mitglied eine neue Anfrage, du klickst auf „Verlängern“.

In der Verwaltung kannst du außerdem:

- Abos sofort beenden
- Konten sperren oder löschen
- Mitgliedern schreiben
- Kontaktanfragen bearbeiten

## 6. Alltag & Wartung

| Aufgabe | Befehl |
|---|---|
| Status ansehen | `systemctl status barebastian` |
| Live-Logs | `journalctl -u barebastian -f` |
| Neustart | `systemctl restart barebastian` |
| Einstellungen ändern | `nano /opt/barebastian/.env`, danach Neustart |
| Sicherung sofort | `bash /opt/barebastian/deploy/backup.sh` |
| Passwort eines Kontos setzen | siehe unten |

**Passwort vergessen (auch Admin):** Normalerweise über „Passwort vergessen?“ auf der Login-Seite. Ohne funktionierenden E-Mail-Versand geht es direkt auf dem Server:

```bash
sudo -u barebastian node --no-warnings /opt/barebastian/app/server.cjs set-password admin@deine-domain.de 'NeuesPasswort123'
```

## 7. Sicherungen

- Jede Nacht um 03:30 Uhr werden Datenbank und Uploads nach `/opt/barebastian/backups/` gesichert. Sicherungen älter als 14 Tage werden gelöscht.
- **Wichtig:** Lade die Sicherungen regelmäßig zusätzlich auf deinen PC herunter (z. B. per WinSCP). Aktiviere außerdem in hPanel die **VPS-Snapshots/Backups**.
- **Wiederherstellen:**

  ```bash
  systemctl stop barebastian
  gunzip -c db-DATUM.sqlite.gz > /opt/barebastian/data/barebastian.db
  tar -xzf uploads-DATUM.tar.gz -C /opt/barebastian/data
  chown -R barebastian:barebastian /opt/barebastian/data
  systemctl start barebastian
  ```

## 8. Updates einspielen

Auf dem Entwicklungsrechner (im Projektordner):

```bash
bun install
bun run release        # erzeugt release/barebastian-release.zip
```

Die ZIP-Datei hochladen (wie in Schritt 2), dann auf dem Server:

```bash
cd /root && sudo bash /opt/barebastian/deploy/update.sh /root/barebastian-release.zip
```

Das Update-Skript sichert vorher automatisch. Startet die neue Version nicht, stellt es die alte wieder her.

## 9. Daten aus der alten Demo-Version übernehmen

Die Demo hat alles nur im Browser gespeichert. So übernimmst du deine Daten:

- **Finanzen:** In der alten Version unter *Finanzen → Streams* als CSV exportieren und in der neuen Version dort importieren.
- **Bio-Designer:** In der alten Version die Profile exportieren und in der neuen über „Importieren“ einlesen.

## 10. Checkliste vor dem offiziellen Start

- [ ] **Rechtstexte prüfen lassen.** Impressum, Datenschutzerklärung und Nutzungsbedingungen sind auf diese Website zugeschnittene Vorlagen, ersetzen aber keine Rechtsberatung.
- [ ] **Jugendschutz:** Für **pornografische Inhalte** verlangt das deutsche Recht (JMStV) ein anerkanntes **Altersverifikationssystem**. Ein Häkchen „Ich bin 18+“ reicht dafür nicht aus. Solche Inhalte erst einstellen, wenn eine geprüfte Altersverifikation angebunden ist, oder sie nur auf Plattformen anbieten, die das übernehmen.
- [ ] **Zahlungsanbieter wählen.** Viele Standardanbieter (z. B. Stripe, PayPal) schließen Erwachseneninhalte aus. Für solche Inhalte gibt es spezialisierte Anbieter (z. B. CCBill, Segpay). Bis dahin funktioniert die Freischaltung manuell (Abschnitt 5).
- [ ] **Auftragsverarbeitungsvertrag (AVV)** mit Hostinger im hPanel abschließen.
- [ ] Testkonto anlegen und den kompletten Ablauf einmal durchspielen: Registrierung → Abo-Anfrage → Freischaltung → E-Mail kommt an.
- [ ] Prüfen, ob E-Mails ankommen und nicht im Spam landen. Bei Bedarf in hPanel SPF/DKIM für die Domain aktivieren.

## Lokale Entwicklung

```bash
bun install
cp .env.example .env    # ADMIN_EMAIL/ADMIN_PASSWORD setzen, NODE_ENV=development, DATA_DIR=./data, PUBLIC_DIR=./dist
bun run dev:server      # API auf Port 3000
bun run dev             # Website mit Live-Reload auf http://localhost:5173
```
