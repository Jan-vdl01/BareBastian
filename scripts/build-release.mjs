/**
 * Baut das Server-Paket für den VPS:
 *   release/barebastian/app/server.cjs   – Server (alle Abhängigkeiten eingebaut)
 *   release/barebastian/app/public/      – Website
 *   release/barebastian/deploy/          – Einrichtungs-, Update- und Backup-Skripte
 *   release/barebastian-release.zip
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'release', 'barebastian');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

run('npx vite build');
run('npx esbuild server/index.ts --bundle --platform=node --target=node22 --format=cjs --outfile=dist-server/server.cjs --log-level=warning');

fs.rmSync(path.join(root, 'release'), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'app'), { recursive: true });
fs.cpSync(path.join(root, 'dist'), path.join(out, 'app', 'public'), { recursive: true });
fs.copyFileSync(path.join(root, 'dist-server', 'server.cjs'), path.join(out, 'app', 'server.cjs'));
fs.cpSync(path.join(root, 'deploy'), path.join(out, 'deploy'), { recursive: true });
fs.copyFileSync(path.join(root, '.env.example'), path.join(out, '.env.example'));
fs.copyFileSync(path.join(root, 'ANLEITUNG-LIVEGANG.md'), path.join(out, 'ANLEITUNG-LIVEGANG.md'));
for (const f of fs.readdirSync(path.join(out, 'deploy'))) if (f.endsWith('.sh')) fs.chmodSync(path.join(out, 'deploy', f), 0o755);

run('cd release && zip -qr barebastian-release.zip barebastian');
const size = (fs.statSync(path.join(root, 'release', 'barebastian-release.zip')).size / 1024 / 1024).toFixed(1);
console.log(`\n✔ Release erstellt: release/barebastian-release.zip (${size} MB)`);
