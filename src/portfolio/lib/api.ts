/**
 * Verbindung zum Server. Alle Anfragen laufen über `/api` derselben Domain;
 * die Sitzung steckt in einem httpOnly-Cookie (für JavaScript unsichtbar).
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Wird ausgelöst, wenn der Server meldet, dass die Sitzung abgelaufen ist. */
export const SESSION_EXPIRED_EVENT = 'bb:session-expired';

async function request<T>(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    // PUT/DELETE werden als POST gesendet (manche Hoster blockieren diese Methoden); der Server liest X-BB-Method
    const override = method === 'PUT' || method === 'DELETE';
    res = await fetch(`/api${path}`, {
      method: override ? 'POST' : method,
      credentials: 'same-origin',
      headers: { 'X-BB': '1', ...(override ? { 'X-BB-Method': method } : {}), ...(body !== undefined && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
      body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body),
      ...init,
    });
  } catch {
    throw new ApiError(0, 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.');
  }
  const data = (res.headers.get('content-type') ?? '').includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? `Fehler ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};

export type UploadScope = 'library' | 'social' | 'avatar';

const CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * Datei hochladen (mit Fortschritt). Liefert die URL der gespeicherten Datei.
 * Große Dateien werden in 4-MB-Stücken gesendet – das funktioniert auch bei Hostern mit Upload-Grenzen.
 */
export async function uploadFile(file: Blob, scope: UploadScope, onProgress?: (fraction: number) => void): Promise<string> {
  if (file.size <= CHUNK_SIZE) return sendPart(`/api/files?scope=${scope}`, file, file.type, onProgress);
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  let url = '';
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const part = file.slice(offset, offset + CHUNK_SIZE);
    const last = offset + CHUNK_SIZE >= file.size;
    const target = `/api/files/chunk?scope=${scope}&id=${id}&offset=${offset}&last=${last ? 1 : 0}&type=${encodeURIComponent(file.type)}`;
    let attempt = 0;
    for (;;) {
      try {
        url = await sendPart(target, part, 'application/octet-stream', (f) => onProgress?.((offset + f * part.size) / file.size));
        break;
      } catch (err) {
        // Verbindungsfehler: Teilstück bis zu 3-mal wiederholen
        if (!(err instanceof ApiError) || err.status !== 0 || ++attempt > 3) throw err;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  return url;
}

function sendPart(target: string, file: Blob, type: string, onProgress?: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', target);
    xhr.setRequestHeader('X-BB', '1');
    xhr.setRequestHeader('Content-Type', type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* keine JSON-Antwort */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.url ?? '');
      else reject(new ApiError(xhr.status, data.error ?? (xhr.status === 413 ? 'Die Datei ist zu groß.' : 'Upload fehlgeschlagen.')));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Upload fehlgeschlagen – keine Verbindung.'));
    xhr.send(file);
  });
}

export const isServerFile = (src?: string) => !!src?.startsWith('/api/files/');

/** Datei auf dem Server löschen (nur eigene; Fehler werden ignoriert). */
export async function deleteFile(src?: string) {
  if (isServerFile(src)) await api.del(src!.slice('/api'.length)).catch(() => undefined);
}

export const errorText = (err: unknown, fallback = 'Etwas ist schiefgelaufen.') => (err instanceof Error ? err.message : fallback);
