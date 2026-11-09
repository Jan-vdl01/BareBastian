import { useEffect, useState } from 'react';

/**
 * Kleiner Speicher-Helfer über localStorage mit Änderungs-Events.
 * Andere Komponenten (und andere Tabs desselben Browsers) werden automatisch aktualisiert.
 */
const EVENT = 'bb:store';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export class StorageFullError extends Error {
  constructor() {
    super('Der Browser-Speicher ist voll. Bitte große Bilder verkleinern oder Inhalte entfernen.');
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (err instanceof DOMException) throw new StorageFullError();
    throw err;
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

/** Liest einen Wert und rendert neu, sobald er sich (auch in einem anderen Tab) ändert. */
export function useStoredValue<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(() => readJSON(key, fallback));
  useEffect(() => {
    const refresh = () => setValue(readJSON(key, fallback));
    const onLocal = (e: Event) => (e as CustomEvent<string>).detail === key && refresh();
    const onStorage = (e: StorageEvent) => e.key === key && refresh();
    window.addEventListener(EVENT, onLocal);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onLocal);
      window.removeEventListener('storage', onStorage);
    };
    // fallback ist bewusst nicht in den Abhängigkeiten (meist ein Literal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}

export const uid = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
