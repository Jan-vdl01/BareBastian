/**
 * Baut die Webhosting-Version (PHP) zum Hochladen in public_html:
 *   release-php/public_html/…           – alles in diesen Ordner gehört in public_html
 *   release-php/barebastian-webhosting.zip
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'release-php');
const pub = path.join(out, 'public_html');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

run('npx vite build');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(pub, { recursive: true });
fs.cpSync(path.join(root, 'dist'), pub, { recursive: true });
fs.cpSync(path.join(root, 'php', 'api'), path.join(pub, 'api'), { recursive: true });
fs.copyFileSync(path.join(root, 'php', 'einrichtung.php'), path.join(pub, 'einrichtung.php'));
fs.copyFileSync(path.join(root, 'php', 'htaccess.txt'), path.join(pub, '.htaccess'));
// Abo-Pakete aus der App übernehmen (eine Quelle für Preise & Laufzeiten)
const plans = execSync(`npx tsx -e "import('./src/portfolio/config/plans.ts').then(m => console.log(JSON.stringify(m.PLANS)))"`, { cwd: root }).toString().trim();
JSON.parse(plans);
fs.writeFileSync(path.join(pub, 'api', 'plans.json'), plans);
fs.copyFileSync(path.join(root, 'ANLEITUNG-WEBHOSTING.md'), path.join(out, 'ANLEITUNG-WEBHOSTING.md'));

// Dateien liegen direkt in der ZIP: in public_html entpacken und fertig
run('cd release-php/public_html && zip -qr ../barebastian-webhosting.zip .');
const size = (fs.statSync(path.join(out, 'barebastian-webhosting.zip')).size / 1024 / 1024).toFixed(1);
console.log(`\n✔ Webhosting-Version erstellt: release-php/barebastian-webhosting.zip (${size} MB)`);
