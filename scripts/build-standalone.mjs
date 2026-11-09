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
    'SEITEN',
    '  index.html          → Link-Hub',
    '  index.html#/login   → Anmeldeseite',
    '',
  ].join('\r\n'),
);

rmSync(tmp, { recursive: true, force: true });
console.log(`\n✔ Eigenständige Version erstellt: ${path.relative(root, out)}/index.html`);
