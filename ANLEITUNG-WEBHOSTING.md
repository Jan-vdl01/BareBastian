# BAREBASTIAN – Installation im Hostinger Webhosting (Business)

Diese Version läuft direkt im normalen Webhosting. Du lädst die Dateien in `public_html`, öffnest deine Domain und richtest alles im Browser ein. Du brauchst kein Terminal, keinen VPS und keine MySQL-Datenbank.

## 1. Hochladen

1. In hPanel: **Websites → deine Website → Dateimanager** öffnen und in den Ordner **`public_html`** wechseln.
2. Alles löschen, was dort schon liegt (z. B. `default.php` oder eine alte `index.html`).
3. Die Datei **`barebastian-webhosting.zip`** in `public_html` hochladen.
4. Rechtsklick auf die ZIP → **Extract / Entpacken**. Als Zielordner `.` eintragen (das bedeutet: hier in `public_html`).
5. Die ZIP-Datei danach löschen.

Am Ende muss direkt in `public_html` liegen:

```
.htaccess        ← wichtig! (versteckte Datei – im Dateimanager ggf. „Versteckte Dateien anzeigen“ einschalten)
index.html
einrichtung.php
api/
assets/
```

> Die Website muss direkt auf der Domain liegen (also in `public_html`), nicht in einem Unterordner wie `public_html/seite/`.

## 2. Hosting-Einstellungen prüfen (hPanel)

- **SSL:** Unter *Sicherheit → SSL* das kostenlose Zertifikat installieren und **„HTTPS erzwingen“** einschalten.
- **PHP-Version:** Unter *Erweitert → PHP-Konfiguration* **PHP 8.1 oder neuer** wählen (8.2/8.3 empfohlen).
- **E-Mail-Postfach:** Unter *E-Mails* ein Postfach anlegen, z. B. `noreply@deine-domain.de`. Über diese Adresse verschickt die Website Bestätigungen, Passwort-Links und Abo-Infos.

## 3. Einrichten

1. Öffne **`https://deine-domain.de`**. Du wirst automatisch zur **Einrichtung** weitergeleitet.
2. Trage ein:
   - deine E-Mail-Adresse und ein Passwort (das ist dein Admin-Login)
   - die Absender-Adresse (das Postfach aus Schritt 2)
3. Auf **„Einrichtung abschließen“** klicken.

Du bist danach als Admin angemeldet. Die Einrichtungsseite ist ab jetzt gesperrt.

Falls die Seite einen Hinweis zeigt (z. B. „pdo_sqlite ist nicht aktiv“): In hPanel unter *Erweitert → PHP-Konfiguration → PHP-Erweiterungen* die genannte Erweiterung einschalten und die Seite neu laden.

## 4. Erste Schritte

1. **Verwaltung → Einstellungen:** Zahlungstext und (optional) Bezahl-Links eintragen. Mit **„Test-E-Mail senden“** prüfst du, ob E-Mails ankommen.
2. **Mein Profil:** Profilbild, Titelbild und Bio einrichten.
3. **Bibliothek:** Videos und Fotos hochladen, Posts schreiben. Große Videos werden automatisch in kleinen Stücken übertragen.
4. Mit einem zweiten Browser ein Testkonto registrieren und den Ablauf einmal durchspielen: Registrierung → Abo anfragen → in der Verwaltung freischalten.

## 5. So funktioniert das Abo

1. Ein Besucher registriert sich (bestätigt 18+ und die Nutzungsbedingungen).
2. Er wählt ein Paket und klickt **„Abo anfragen“**. Er sieht deinen Zahlungstext bzw. Bezahl-Link, du bekommst eine E-Mail.
3. Nach Zahlungseingang klickst du in **Verwaltung → Mitglieder & Abos** auf **„Abo freischalten“**.
4. Das Abo endet automatisch nach der Laufzeit, es gibt keine automatische Verlängerung.

## Rabatt- und Zugangscodes

In **Verwaltung → Rabatt- & Zugangscodes** erstellst du Codes:

- **Rabatt in %:** Der Code senkt den Preis. Das Mitglied sieht den reduzierten Preis, du siehst Code und Preis in der Abo-Anfrage.
- **Kostenloser Zugang:** Der Code schaltet das Abo sofort für die eingestellte Zahl von Monaten frei, ohne Zahlung und ohne Freigabe. Gut für Testkonten oder Geschenke.

Optional begrenzt du die Zahl der Einlösungen und setzt ein Ablaufdatum. Mitglieder geben den Code bei der Registrierung oder bei der Abo-Auswahl ein. Jedes Mitglied kann einen Code nur einmal einlösen. Codes lassen sich pausieren und löschen.

## 6. Wo liegen die Daten?

Alle Daten liegen im Ordner **`barebastian-data`**, eine Ebene **über** `public_html` (im Dateimanager: einmal „nach oben“). Dort ist er aus dem Internet nicht erreichbar.

| Datei / Ordner | Inhalt |
|---|---|
| `barebastian.db` | Datenbank (Konten, Posts, Nachrichten, Abos …) |
| `uploads/` | hochgeladene Bilder und Videos |
| `config.json` | Einstellungen |
| `mail.log` | Protokoll der verschickten E-Mails |
| `error.log` | Fehlermeldungen (falls etwas nicht klappt) |

Kann der Ordner dort nicht angelegt werden, liegt er stattdessen als `bb-data` in `public_html` und ist per `.htaccess` gesperrt.

**Sicherung:** Lade den kompletten Ordner `barebastian-data` regelmäßig als ZIP herunter (Rechtsklick → Komprimieren → Herunterladen). Zusätzlich macht Hostinger im Business-Tarif automatische Backups.

## 7. Updates einspielen

1. Neue ZIP entpacken wie in Schritt 1.
2. Die Dateien in `public_html` überschreiben. Der Ordner `assets` kann vorher gelöscht werden.

Deine Daten bleiben erhalten, weil sie in `barebastian-data` liegen. Diesen Ordner **nie** löschen.

## 8. Wenn etwas nicht klappt

- **Weiße Seite oder Fehler 500:** PHP-Version prüfen (Schritt 2). In `barebastian-data/error.log` steht die genaue Meldung.
- **Login oder Speichern geht nicht („Unbekannte Adresse“ / 404):** Die Datei `.htaccess` fehlt in `public_html`. Sie ist versteckt und geht beim Hochladen einzelner Dateien leicht verloren.
- **E-Mails kommen nicht an:** Die Absender-Adresse muss ein echtes Postfach deiner Domain sein. In `mail.log` siehst du, ob der Versand geklappt hat. Im Spam-Ordner nachsehen.
- **Admin-Passwort vergessen und keine E-Mail kommt an:** Im Ordner `barebastian-data` eine Textdatei **`admin-passwort.txt`** anlegen, die nur das neue Passwort enthält (mindestens 10 Zeichen). Beim nächsten Login-Versuch wird es übernommen und die Datei automatisch gelöscht.

## 9. Vor dem offiziellen Start

- [ ] **Rechtstexte prüfen lassen** (Impressum, Datenschutz, Nutzungsbedingungen sind Vorlagen).
- [ ] **Hostinger-Nutzungsbedingungen prüfen:** Kläre, ob deine Inhalte im gewählten Tarif erlaubt sind. Viele Webhoster schränken Erwachseneninhalte ein.
- [ ] **Jugendschutz:** Für pornografische Inhalte verlangt das deutsche Recht ein anerkanntes Altersverifikationssystem. Ein Häkchen „18+“ reicht dafür nicht.
- [ ] **Zahlungsanbieter:** Stripe und PayPal schließen Erwachseneninhalte meist aus. Spezialisierte Anbieter sind z. B. CCBill oder Segpay.
- [ ] **Preise anpassen:** Die Paketpreise stehen in `src/portfolio/config/plans.ts`. Nach einer Änderung muss die Website neu gebaut werden (`bun run release:php`).
- [ ] **Speicherplatz im Blick behalten:** Videos brauchen viel Platz. In der Verwaltung siehst du, wie viel die Uploads belegen.

## Hinweis zur Leistung

Das Webhosting reicht für eine kleine bis mittlere Community gut aus. Bei sehr vielen gleichzeitig aktiven Mitgliedern oder sehr vielen großen Videos ist die VPS-Version die bessere Wahl. Die Daten lassen sich später umziehen.
