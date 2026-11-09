import { useEffect, useState } from 'react';

/**
 * Minimales Hash-Routing (funktioniert auch per file:// und auf jedem statischen Server).
 * "#/dashboard/bibliothek?tab=fotos" → path "/dashboard/bibliothek", query { tab: "fotos" }.
 * Normale Anker wie "#links" gehören zur Startseite ("/").
 */
export interface HashRoute {
  path: string;
  query: URLSearchParams;
}

export function parseHash(hash: string = window.location.hash): HashRoute {
  if (!hash.startsWith('#/')) return { path: '/', query: new URLSearchParams() };
  const [rawPath, rawQuery = ''] = hash.slice(1).split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  return { path, query: new URLSearchParams(rawQuery) };
}

export function useHashRoute(): HashRoute {
  const [route, setRoute] = useState<HashRoute>(() => parseHash());
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

/** Navigiert zu einem Pfad. `replace` ersetzt den History-Eintrag (für Weiterleitungen). */
export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) window.location.replace(target);
  else window.location.hash = target;
}
