/**
 * Typisierte, validierte Datenablage (localStorage) mit zod.
 *
 * - Beim Lesen wird gegen ein Schema geprüft. Ungültige/beschädigte Daten werden
 *   unter "<key>.backup" gesichert und durch den Standardwert ersetzt – die App läuft weiter.
 * - Gültige Daten werden unverändert zurückgegeben (keine Felder gehen verloren).
 * - Änderungen lösen ein Event aus; Hooks in allen Komponenten/Tabs aktualisieren sich.
 *
 * Für ein echtes Backend lässt sich diese Schicht später durch API-Aufrufe ersetzen,
 * ohne dass sich die Stores darüber ändern müssen.
 */
import { useEffect, useState } from 'react';
import type { z } from 'zod';
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

/** Speicher, deren Schlüssel vom Benutzer abhängt (z. B. Finanzdaten pro Konto). */
export function defineUserStore<T>(prefix: string, opts: Omit<StoreOptions<T>, 'key'>) {
  const cache = new Map<string, Store<T>>();
  const forUser = (userId: string) => {
    if (!cache.has(userId)) cache.set(userId, defineStore({ ...opts, key: `${prefix}${userId}` }));
    return cache.get(userId)!;
  };
  /** Hook-Variante: wechselt automatisch mit der userId. */
  const use = (userId: string): T => {
    const store = forUser(userId);
    const [value, setValue] = useState<T>(store.read);
    useEffect(() => {
      setValue(store.read());
      const refresh = () => setValue(store.read());
      const onLocal = (e: Event) => (e as CustomEvent<string>).detail === store.key && refresh();
      const onStorage = (e: StorageEvent) => e.key === store.key && refresh();
      window.addEventListener(EVENT, onLocal);
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener(EVENT, onLocal);
        window.removeEventListener('storage', onStorage);
      };
    }, [store]);
    return value;
  };
  return { forUser, use };
}
