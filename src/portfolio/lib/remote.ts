import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api';

/**
 * Gemeinsam genutzte Daten vom Server (Profile, Social Hub, Chat, Bibliothek).
 * - Lesen ist synchron (letzter bekannter Stand), damit die Oberfläche flüssig bleibt.
 * - Solange eine Komponente die Daten anzeigt, wird regelmäßig nachgeladen (pausiert im Hintergrund-Tab).
 */
export interface RemoteResource<T> {
  get: () => T;
  set: (value: T) => void;
  refresh: () => Promise<T | undefined>;
  reset: () => void;
  use: (intervalMs?: number) => T;
  /** Nur den zuletzt geladenen Stand anzeigen (ohne selbst nachzuladen). */
  useCached: () => T;
  loaded: () => boolean;
}

const registry = new Set<RemoteResource<unknown>>();

/** Alle Daten verwerfen (z. B. beim Abmelden). */
export const resetAllRemote = () => registry.forEach((r) => r.reset());

export function remoteResource<T>(path: string, initial: () => T, defaultInterval = 30000): RemoteResource<T> {
  let value = initial();
  let isLoaded = false;
  let lastFetch = 0;
  let inflight: Promise<T | undefined> | null = null;
  const listeners = new Set<() => void>();
  const intervals = new Map<symbol, number>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const emit = () => listeners.forEach((l) => l());
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  };
  const set = (v: T) => {
    value = v;
    isLoaded = true;
    emit();
  };

  const refresh = () => {
    inflight ??= api
      .get<T>(path)
      .then((v) => {
        lastFetch = Date.now();
        set(v);
        return v;
      })
      .catch(() => undefined)
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!intervals.size) return;
    const every = Math.min(...intervals.values());
    timer = setTimeout(async () => {
      if (document.visibilityState === 'visible') await refresh();
      schedule();
    }, every);
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible' && intervals.size && Date.now() - lastFetch > 3000) refresh();
  };

  const resource: RemoteResource<T> = {
    get: () => value,
    set,
    refresh,
    loaded: () => isLoaded,
    reset: () => {
      value = initial();
      isLoaded = false;
      lastFetch = 0;
      emit();
    },
    useCached() {
      return useSyncExternalStore(subscribe, () => value);
    },
    use(intervalMs = defaultInterval) {
      const snapshot = useSyncExternalStore(subscribe, () => value);
      useEffect(() => {
        const key = Symbol();
        intervals.set(key, intervalMs);
        if (intervals.size === 1) document.addEventListener('visibilitychange', onVisible);
        if (Date.now() - lastFetch > 2000) refresh();
        schedule();
        return () => {
          intervals.delete(key);
          if (!intervals.size) document.removeEventListener('visibilitychange', onVisible);
          schedule();
        };
      }, [intervalMs]);
      return snapshot;
    },
  };
  registry.add(resource as RemoteResource<unknown>);
  return resource;
}
