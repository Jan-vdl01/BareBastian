/**
 * Erzeugt eine eigenständige Version der Web-App in ./standalone:
 * JS und CSS werden direkt in index.html eingebettet, damit die Seite
 * per Doppelklick (file://) funktioniert und auf jeden Webserver hochgeladen
 * werden kann – ohne Node, ohne Build-Schritt.
 *
 * Aufruf: bun run build:standalone  (oder: npm run build:standalone)
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tmp = path.join(root, 'dist-standalone-tmp');
const out = path.join(root, 'standalone');

execSync(`npx vite build --base=./ --outDir "${tmp}" --emptyOutDir`, { stdio: 'inherit' });

let html = readFileSync(path.join(tmp, 'index.html'), 'utf8');

// <script type="module" src="./assets/x.js"> → Inline-Modul
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_m, src) => {
  const js = readFileSync(path.join(tmp, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">\n${js}\n</script>`;
});

// <link rel="stylesheet" href="./assets/x.css"> → <style>
html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_m, href) => {
  const css = readFileSync(path.join(tmp, href), 'utf8').replace(/<\/style/gi, '<\\/style');
  return `<style>\n${css}\n</style>`;
});

if (/src="\.\/assets|href="\.\/assets/.test(html)) {
  throw new Error('Nicht alle Assets konnten eingebettet werden.');
}

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'videos'), { recursive: true });
mkdirSync(path.join(out, 'media', 'videos'), { recursive: true });
mkdirSync(path.join(out, 'media', 'photos'), { recursive: true });
writeFileSync(path.join(out, 'index.html'), html);

// Weitere Dateien aus public/ (z. B. .htaccess, Videos) übernehmen
const publicDir = path.join(root, 'public');
if (existsSync(publicDir)) cpSync(publicDir, out, { recursive: true });

writeFileSync(
  path.join(out, 'LIESMICH.txt'),
  [
    'BAREBASTIAN – Web-App (eigenständige Version)',
    '',
    'LOKAL ÖFFNEN',
    '  index.html doppelklicken – fertig. Alles (JS + CSS) steckt in dieser einen Datei.',
    '  Für Schriftarten (Google Fonts) wird eine Internetverbindung benötigt.',
    '',
    'AUF DEN SERVER LADEN',
    '  Den gesamten Ordnerinhalt (inkl. der versteckten Datei .htaccess) per FTP/SFTP',
    '  in das Web-Verzeichnis kopieren (z. B. public_html/ oder htdocs/).',
    '  Die .htaccess erzwingt HTTPS und ist für Apache gedacht. Liegt die Seite in einem',
    '  Unterordner, in der .htaccess „RewriteBase /“ auf „RewriteBase /unterordner/“ ändern.',
    '',
    'LOGIN-VIDEO',
    '  Ein Video als videos/login-bg.mp4 ablegen – es erscheint automatisch auf der Anmeldeseite.',
    '  Ohne Video wird ein animierter Farbverlauf angezeigt.',
    '',
    'ABONNENTEN-INHALTE (Abo-Bereich → Bibliothek)',
    '  Videos als media/videos/v01.mp4 … v08.mp4 ablegen, Fotos als media/photos/p01.jpg … p12.jpg.',
    '  Titel, Beschreibungen und weitere Einträge stehen im Quellcode in src/portfolio/abo-bereich/libraryData.ts',
    '  (danach neu bauen mit: bun run build:standalone).',
    '',
    'ADMIN-ZUGANG',
    '  Login mit der Admin-E-Mail aus src/portfolio/config/admin.ts. Das Standard-Passwort vor dem',
    '  Hochladen ändern (Anleitung in derselben Datei) – Passwörter nie in Dateien auf dem Server ablegen.',
    '  Nur der Admin sieht im Abo-Bereich die Verwaltung und kann Videos, Fotos und Posts',
    '  hochladen, bearbeiten und löschen.',
    '',
    'INHALTE VERÖFFENTLICHEN (ohne Server-Backend)',
    '  1. Als Admin Inhalte in der Bibliothek bearbeiten (zunächst nur in diesem Browser gespeichert).',
    '  2. In der Verwaltung „content.json exportieren“ und neben die index.html hochladen.',
    '  3. „Mediendateien“ herunterladen und in media/videos bzw. media/photos hochladen (Dateinamen nicht ändern).',
    '  Hinweis: content.json wird nur über einen Webserver geladen, nicht beim Öffnen per Doppelklick.',
    '',
    'WICHTIG – DEMO-MODUS',
    '  Login und Abo laufen nur im Browser (Demo, keine echte Zahlung).',
    '  Profile und Chat-Nachrichten werden nur im jeweiligen Browser gespeichert – Mitglieder auf',
    '  verschiedenen Geräten sehen sich erst mit einem Backend gegenseitig.',
    '  Die Paywall ist damit KEIN echter Schutz: Dateien im media-Ordner sind über den direkten Link',
    '  für jeden abrufbar. Lade echte Abonnenten-Inhalte erst hoch, wenn ein Backend mit Login,',
    '  Zahlungsanbieter und geschützter Auslieferung angebunden ist.',
    '',
    'SEITEN',
    '  index.html                         → Link-Hub',
    '  index.html#/login                  → Anmeldung',
    '  index.html#/preise                 → Preise',
    '  index.html#/abo                    → Abo-Pakete (Paywall)',
    '  index.html#/abo-bereich              → Abo-Bereich (nur mit Abo)',
    '  index.html#/abo-bereich/bibliothek   → Videos, Fotos, Posts',
    '  index.html#/abo-bereich/bio-designer → Chaturbate-Bio-Designer',
    '  index.html#/abo-bereich/chat         → Nachrichten',
    '  index.html#/abo-bereich/profil       → Mein Profil',
    '  index.html#/abo-bereich/konto        → Konto & Abo',
    '  index.html#/abo-bereich/verwaltung   → Verwaltung (nur Admin)',
    '',
  ].join('\r\n'),
);

rmSync(tmp, { recursive: true, force: true });
console.log(`\n✔ Eigenständige Version erstellt: ${path.relative(root, out)}/index.html`);
