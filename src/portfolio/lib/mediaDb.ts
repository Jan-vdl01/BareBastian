import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { useEffect, useState } from 'react';

/**
 * Speichert hochgeladene Medien (Videos, Fotos) als Blobs in IndexedDB.
 * Verweise im Inhalt haben die Form "idb:<schlüssel>".
 */
const DB_NAME = 'bb_media';
const STORE = 'files';
export const IDB_PREFIX = 'idb:';

interface MediaDB extends DBSchema {
  files: { key: string; value: Blob };
}

let dbPromise: Promise<IDBPDatabase<MediaDB>> | null = null;

/** Verbindung zur Medien-Datenbank (wird wiederverwendet). */
function db(): Promise<IDBPDatabase<MediaDB>> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB wird von diesem Browser nicht unterstützt.'));
  dbPromise ??= openDB<MediaDB>(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    },
  }).catch((err) => {
    dbPromise = null;
    throw err instanceof Error ? err : new Error('IndexedDB konnte nicht geöffnet werden.');
  });
  return dbPromise;
}

export async function putMedia(key: string, file: Blob): Promise<string> {
  await (await db()).put(STORE, file, key);
  return `${IDB_PREFIX}${key}`;
}

export const getMedia = async (ref: string): Promise<Blob | undefined> => (await db()).get(STORE, ref.slice(IDB_PREFIX.length));

export async function deleteMedia(ref: string | undefined) {
  if (ref?.startsWith(IDB_PREFIX)) await (await db()).delete(STORE, ref.slice(IDB_PREFIX.length));
}

export const isLocalMedia = (src?: string) => !!src?.startsWith(IDB_PREFIX);

/** Liefert eine abspielbare URL – lokale Blobs werden in Object-URLs umgewandelt. */
export function useMediaUrl(src: string | undefined): { url: string | undefined; loading: boolean } {
  const local = isLocalMedia(src);
  const [state, setState] = useState<{ url: string | undefined; loading: boolean }>({ url: local ? undefined : src, loading: local });

  useEffect(() => {
    if (!src || !isLocalMedia(src)) {
      setState({ url: src, loading: false });
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    setState({ url: undefined, loading: true });
    getMedia(src)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = blob ? URL.createObjectURL(blob) : undefined;
        setState({ url: objectUrl, loading: false });
      })
      .catch(() => !cancelled && setState({ url: undefined, loading: false }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return state;
}

/** Bild verkleinern und als JPEG-Data-URL zurückgeben (für Avatare, Titelbilder, Vorschaubilder). */
export function resizeImage(file: Blob, maxWidth: number, maxHeight: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Das Bild konnte nicht gelesen werden.'));
    };
    img.src = url;
  });
}

/** Bild zuschneiden (Cover-Ausschnitt) auf feste Größe. */
export function cropImage(file: Blob, width: number, height: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Das Bild konnte nicht gelesen werden.'));
    };
    img.src = url;
  });
}

/** Videolänge aus einer Datei ermitteln, formatiert als mm:ss bzw. h:mm:ss. */
export function readVideoDuration(file: Blob): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(formatDuration(v.duration));
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    v.src = url;
  });
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`;
}
