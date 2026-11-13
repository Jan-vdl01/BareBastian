/**
 * Typisierte, validierte Datenablage (localStorage) mit zod.
 *
 * - Beim Lesen wird gegen ein Schema geprüft. Ungültige/beschädigte Daten werden
 *   unter "<key>.backup" gesichert und durch den Standardwert ersetzt – die App läuft weiter.
 * - Gültige Daten werden unverändert zurückgegeben (keine Felder gehen verloren).
 * - Änderungen lösen ein Event aus; Hooks in allen Komponenten/Tabs aktualisieren sich.
 *
 * Persönliche Daten (defineUserStore) werden auf dem Server gespeichert, siehe unten.
 */
import { useEffect, useState } from 'react';
import type { z } from 'zod';
import { api } from './api';
import { StorageFullError } from './localStore';

const EVENT = 'bb:store';

export interface Store<T> {
  key: string;
  read: () => T;
  write: (value: T) => void;
  update: (fn: (value: T) => T) => T;
  use: () => T;
}

export interface StoreOptions<T> {
  key: string;
  schema: z.ZodType;
  fallback: () => T;
  /** Wird vor der Prüfung angewendet (z. B. für ältere Datenformate) */
  migrate?: (raw: unknown) => unknown;
  /** Wird aufgerufen, wenn noch nichts gespeichert ist (z. B. Startdaten) */
  seed?: () => T;
}

/** Fehlermeldung eines Schemas in lesbarer Form. */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((i) => `${i.path.length ? i.path.join('.') : 'Datei'}: ${i.message}`)
    .join(' · ');
}

/** Sichert die ungültigen Daten und ersetzt sie still durch den Standardwert (ohne Event – kann während des Renderns passieren). */
function quarantine(key: string, raw: string, reason: string, replacement: unknown) {
  try {
    localStorage.setItem(`${key}.backup`, raw);
    localStorage.setItem(key, JSON.stringify(replacement));
  } catch {
    /* Speicher voll – Sicherung nicht möglich */
  }
  console.warn(`[Speicher] „${key}“ war ungültig und wurde zurückgesetzt (Sicherung unter „${key}.backup“). Grund: ${reason}`);
}

export function defineStore<T>({ key, schema, fallback, migrate, seed }: StoreOptions<T>): Store<T> {
  const read = (): T => {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      if (!seed) return fallback();
      const initial = seed();
      write(initial);
      return initial;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const fb = seed ? seed() : fallback();
      quarantine(key, raw, 'kein gültiges JSON', fb);
      return fb;
    }
    const value = migrate ? migrate(parsed) : parsed;
    const result = schema.safeParse(value);
    if (!result.success) {
      const fb = seed ? seed() : fallback();
      quarantine(key, raw, describeIssues(result.error), fb);
      return fb;
    }
    return value as T;
  };

  const write = (value: T) => {
    const check = schema.safeParse(value);
    if (!check.success) console.warn(`[Speicher] Schreibe ungeprüfte Daten nach „${key}“: ${describeIssues(check.error)}`);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      if (err instanceof DOMException) throw new StorageFullError();
      throw err;
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  };

  const update = (fn: (value: T) => T) => {
    const next = fn(read());
    write(next);
    return next;
  };

  const use = (): T => {
    const [value, setValue] = useState<T>(read);
    useEffect(() => {
      const refresh = () => setValue(read());
      const onLocal = (e: Event) => (e as CustomEvent<string>).detail === key && refresh();
      const onStorage = (e: StorageEvent) => e.key === key && refresh();
      window.addEventListener(EVENT, onLocal);
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener(EVENT, onLocal);
        window.removeEventListener('storage', onStorage);
      };
    }, []);
    return value;
  };

  return { key, read, write, update, use };
}

/* ================= Persönliche Daten auf dem Server ================= */

/**
 * Persönliche Dokumente (Finanzen, Bio-Designer) liegen auf dem Server.
 * Beim Anmelden werden alle geladen (`hydrateDocs`), Lesen ist danach synchron,
 * Änderungen werden kurz gesammelt und dann gespeichert.
 */
const docCache = new Map<string, unknown>();
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
let saveListeners: ((state: 'saving' | 'saved' | 'error') => void)[] = [];

export const onDocSave = (fn: (state: 'saving' | 'saved' | 'error') => void) => {
  saveListeners.push(fn);
  return () => {
    saveListeners = saveListeners.filter((f) => f !== fn);
  };
};

export async function hydrateDocs() {
  const docs = await api.get<Record<string, unknown>>('/docs');
  docCache.clear();
  for (const [k, v] of Object.entries(docs)) if (v !== null) docCache.set(k, v);
}

export function clearDocs() {
  pendingWrites.forEach((t) => clearTimeout(t));
  pendingWrites.clear();
  failedDocs.clear();
  docCache.clear();
}

const failedDocs = new Set<string>();

function pushDoc(key: string, keepalive = false, attempt = 0): Promise<void> {
  pendingWrites.delete(key);
  saveListeners.forEach((f) => f('saving'));
  const body = JSON.stringify({ value: docCache.get(key) ?? null });
  const sentValue = docCache.get(key);
  return fetch(`/api/docs/${encodeURIComponent(key)}`, {
    method: 'PUT',
    // keepalive erlaubt nur kleine Anfragen (64 KB) – größere normal senden
    keepalive: keepalive && body.length < 60000,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-BB': '1' },
    body,
  })
    .then((r) => {
      if (r.ok) {
        failedDocs.delete(key);
        if (!failedDocs.size) saveListeners.forEach((f) => f('saved'));
        return;
      }
      // 4xx (z. B. zu groß, abgemeldet) nicht wiederholen
      if (r.status >= 400 && r.status < 500) throw Object.assign(new Error('rejected'), { final: true });
      throw new Error('server');
    })
    .catch((err: Error & { final?: boolean }) => {
      if (docCache.get(key) !== sentValue || pendingWrites.has(key)) return; // inzwischen neuere Änderung unterwegs
      if (!err.final && attempt < 4 && docCache.has(key)) {
        pendingWrites.set(key, setTimeout(() => pushDoc(key, false, attempt + 1), 2000 * 2 ** attempt));
        return;
      }
      failedDocs.add(key);
      saveListeners.forEach((f) => f('error'));
    });
}

/** Nicht gespeicherte Änderungen erneut senden (z. B. nach Verbindungsproblemen). */
export function retryFailedDocs() {
  for (const key of [...failedDocs]) if (docCache.has(key)) pushDoc(key);
}

/** Stand vom Server neu laden, wenn der Tab wieder sichtbar wird (Änderungen von anderen Geräten). */
async function refreshDocs() {
  if (pendingWrites.size || failedDocs.size || !docCache.size) return;
  try {
    const docs = await api.get<Record<string, unknown>>('/docs');
    if (pendingWrites.size) return;
    for (const [k, v] of Object.entries(docs)) {
      if (v === null || JSON.stringify(docCache.get(k)) === JSON.stringify(v)) continue;
      docCache.set(k, v);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: k }));
    }
  } catch {
    /* offline oder abgemeldet – ignorieren */
  }
}

/** Offene Änderungen sofort senden (z. B. beim Verlassen der Seite). */
export function flushDocs(keepalive = false) {
  for (const [key, t] of pendingWrites) {
    clearTimeout(t);
    pushDoc(key, keepalive);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushDocs(true));
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? flushDocs(true) : refreshDocs()));
  window.addEventListener('online', retryFailedDocs);
}

function defineServerStore<T>({ key, schema, fallback, migrate, seed }: StoreOptions<T>): Store<T> {
  const write = (value: T) => {
    const check = schema.safeParse(value);
    if (!check.success) console.warn(`[Speicher] Schreibe ungeprüfte Daten nach „${key}“: ${describeIssues(check.error)}`);
    docCache.set(key, value);
    const t = pendingWrites.get(key);
    if (t) clearTimeout(t);
    pendingWrites.set(key, setTimeout(() => pushDoc(key), 700));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  };

  const read = (): T => {
    if (!docCache.has(key)) {
      const initial = seed ? seed() : fallback();
      docCache.set(key, initial);
      return initial;
    }
    const raw = docCache.get(key);
    const value = migrate ? migrate(raw) : raw;
    const result = schema.safeParse(value);
    if (!result.success) {
      console.warn(`[Speicher] „${key}“ war ungültig und wurde zurückgesetzt. Grund: ${describeIssues(result.error)}`);
      try {
        localStorage.setItem(`${key}.backup`, JSON.stringify(raw));
      } catch {
        /* ignorieren */
      }
      const fb = seed ? seed() : fallback();
      docCache.set(key, fb);
      return fb;
    }
    if (value !== raw) docCache.set(key, value);
    return value as T;
  };

  const update = (fn: (value: T) => T) => {
    const next = fn(read());
    write(next);
    return next;
  };

  const use = (): T => {
    const [value, setValue] = useState<T>(read);
    useEffect(() => {
      const onLocal = (e: Event) => (e as CustomEvent<string>).detail === key && setValue(read());
      window.addEventListener(EVENT, onLocal);
      return () => window.removeEventListener(EVENT, onLocal);
    }, []);
    return value;
  };

  return { key, read, write, update, use };
}

/** Persönliche Speicher pro Konto (z. B. Finanzdaten) – auf dem Server gesichert. */
export function defineUserStore<T>(prefix: string, opts: Omit<StoreOptions<T>, 'key'>) {
  const cache = new Map<string, Store<T>>();
  const forUser = (userId: string) => {
    if (!cache.has(userId)) cache.set(userId, defineServerStore({ ...opts, key: `${prefix}${userId}` }));
    return cache.get(userId)!;
  };
  /** Hook-Variante: wechselt automatisch mit der userId. */
  const use = (userId: string): T => {
    const store = forUser(userId);
    const [value, setValue] = useState<T>(store.read);
    useEffect(() => {
      setValue(store.read());
      const onLocal = (e: Event) => (e as CustomEvent<string>).detail === store.key && setValue(store.read());
      window.addEventListener(EVENT, onLocal);
      return () => window.removeEventListener(EVENT, onLocal);
    }, [store]);
    return value;
  };
  return { forUser, use };
}
