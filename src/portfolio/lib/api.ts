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
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'X-BB': '1', ...(body !== undefined && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
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

/** Datei hochladen (mit Fortschritt). Liefert die URL der gespeicherten Datei. */
export function uploadFile(file: Blob, scope: UploadScope, onProgress?: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/files?scope=${scope}`);
    xhr.setRequestHeader('X-BB', '1');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* keine JSON-Antwort */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
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
