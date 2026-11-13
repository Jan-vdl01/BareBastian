/**
 * Medien-Helfer. Hochgeladene Dateien liegen auf dem Server (siehe lib/api.ts → uploadFile)
 * und werden über ihre URL (/api/files/…) direkt angezeigt.
 */
export const isLocalMedia = (_src?: string) => false;

/** Liefert eine abspielbare URL (Server-Dateien und externe Links werden direkt verwendet). */
export function useMediaUrl(src: string | undefined): { url: string | undefined; loading: boolean } {
  return { url: src && !src.startsWith('idb:') ? src : undefined, loading: false };
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
