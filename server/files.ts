import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { Router, type Request } from 'express';
import { config, uploadsDir } from './config';
import { all, now, one, run } from './db';
import { badRequest, forbidden, h, HttpError, newId, notFound } from './security';
import { hasAccess, requireAccess, requireLogin } from './users';

export type FileScope = 'library' | 'social' | 'avatar';
const SCOPES: FileScope[] = ['library', 'social', 'avatar'];

/** Nur sichere Bild- und Videoformate (kein SVG/HTML → kein Skript-Risiko). */
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

interface FileRow {
  id: string;
  owner_id: string;
  scope: FileScope;
  mime: string;
  size: number;
}

const filePath = (id: string) => path.join(uploadsDir, id);
export const FILE_URL_RE = /^\/api\/files\/(f_[\w-]+)$/;
export const fileUrl = (id: string) => `/api/files/${id}`;

/** Speichert einen Buffer (z. B. aus einer Data-URL) als Datei. */
export function saveBuffer(ownerId: string, scope: FileScope, mime: string, data: Buffer): string {
  if (!ALLOWED[mime]) throw badRequest('Dateiformat wird nicht unterstützt.');
  const id = newId('f');
  fs.writeFileSync(filePath(id), data);
  run('INSERT INTO files (id, owner_id, scope, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, ownerId, scope, mime, data.length, now());
  return fileUrl(id);
}

/** Wandelt eingebettete Bilder (data:image/…;base64) in gespeicherte Dateien um. */
export function storeDataUrl(value: string | undefined, ownerId: string, scope: FileScope, maxBytes = 3 * 1024 * 1024): string | undefined {
  if (!value) return value;
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!m) return value;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > maxBytes) throw badRequest('Das Bild ist zu groß.');
  return saveBuffer(ownerId, scope, m[1], buf);
}

/** Entfernt eine Datei anhand ihrer URL (nur eigene Dateien bzw. als Admin). */
export function deleteFileByUrl(url: string | undefined, actor?: { id: string; role: string }) {
  const id = url && FILE_URL_RE.exec(url)?.[1];
  if (!id) return;
  const row = one<FileRow>('SELECT * FROM files WHERE id = ?', id);
  if (!row) return;
  if (actor && actor.role !== 'admin' && row.owner_id !== actor.id) return;
  run('DELETE FROM files WHERE id = ?', id);
  fs.rm(filePath(id), { force: true }, () => undefined);
}

/** Löscht alle Dateien eines Benutzers (Konto-Löschung). */
export function deleteFilesOf(userId: string) {
  const ids = all<{ id: string }>('SELECT id FROM files WHERE owner_id = ?', userId);
  for (const { id } of ids) fs.rm(filePath(id), { force: true }, () => undefined);
  run('DELETE FROM files WHERE owner_id = ?', userId);
}

export const filesRouter = Router();

/** Upload: roher Dateiinhalt im Body, Typ im Content-Type, Bereich als ?scope= */
filesRouter.post(
  '/',
  requireLogin,
  h(async (req: Request, res) => {
    const scope = String(req.query.scope ?? '') as FileScope;
    if (!SCOPES.includes(scope)) throw badRequest('Unbekannter Bereich.');
    if (scope === 'library' && req.user!.role !== 'admin') throw forbidden();
    if (scope === 'social' && !hasAccess(req.user)) throw forbidden('Dafür brauchst du ein aktives Abo.');
    const mime = (req.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED[mime]) throw badRequest('Dateiformat wird nicht unterstützt (erlaubt: JPG, PNG, WebP, GIF, MP4, WebM, MOV).');
    if (scope !== 'library' && mime.startsWith('video/')) throw badRequest('Hier sind nur Bilder erlaubt.');

    const limit = (scope === 'library' ? config.maxUploadMb.library : config.maxUploadMb.other) * 1024 * 1024;
    const declared = Number(req.get('content-length') ?? 0);
    if (declared > limit) throw new HttpError(413, `Die Datei ist zu groß (max. ${Math.round(limit / 1024 / 1024)} MB).`);

    const id = newId('f');
    const target = filePath(id);
    let size = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        size += chunk.length;
        if (size > limit) cb(new HttpError(413, `Die Datei ist zu groß (max. ${Math.round(limit / 1024 / 1024)} MB).`));
        else cb(null, chunk);
      },
    });
    try {
      await pipeline(req, counter, fs.createWriteStream(target));
    } catch (err) {
      fs.rm(target, { force: true }, () => undefined);
      throw err instanceof HttpError ? err : badRequest('Upload abgebrochen.');
    }
    if (!size) {
      fs.rm(target, { force: true }, () => undefined);
      throw badRequest('Die Datei ist leer.');
    }
    run('INSERT INTO files (id, owner_id, scope, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, req.user!.id, scope, mime, size, now());
    res.status(201).json({ url: fileUrl(id), size });
  }),
);

filesRouter.get(
  '/:id',
  requireLogin,
  h((req, res) => {
    const row = one<FileRow>('SELECT * FROM files WHERE id = ?', String(req.params.id));
    if (!row) throw notFound('Datei nicht gefunden.');
    if (row.owner_id !== req.user!.id && !hasAccess(req.user)) throw forbidden('Dafür brauchst du ein aktives Abo.');
    res.setHeader('Cache-Control', 'private, max-age=604800');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath(row.id), { headers: { 'Content-Type': row.mime }, acceptRanges: true });
  }),
);

filesRouter.delete(
  '/:id',
  requireAccess,
  h((req, res) => {
    deleteFileByUrl(fileUrl(String(req.params.id)), req.user);
    res.json({ ok: true });
  }),
);
