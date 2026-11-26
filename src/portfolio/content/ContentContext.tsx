import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { PhotoItem, PostItem, VideoItem } from '../dashboard/libraryData';
import { api, deleteFile } from '../lib/api';
import { uid } from '../lib/localStore';
import { remoteResource } from '../lib/remote';
import { contentSchema } from '../lib/schemas';
import { describeIssues } from '../lib/store';

/**
 * Inhalte der Bibliothek (Videos, Fotos, Posts) – vom Server, nur mit aktivem Abo.
 * Nur der Admin kann sie ändern; jede Änderung wird sofort gespeichert.
 */
export interface ContentState {
  version: 1;
  updatedAt: string;
  videos: VideoItem[];
  photos: PhotoItem[];
  posts: PostItem[];
}

const empty = (): ContentState => ({ version: 1, updatedAt: '', videos: [], photos: [], posts: [] });
export const contentResource = remoteResource<ContentState>('/content', empty, 120000);

interface ContentContextValue extends ContentState {
  loaded: boolean;
  saveVideo: (v: VideoItem) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  savePhotos: (items: PhotoItem[]) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  savePost: (p: PostItem) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  importContent: (json: string) => Promise<void>;
  exportContent: () => { json: string };
}

const ContentContext = createContext<ContentContextValue | null>(null);

const extFor = (blob: Blob | undefined, fallback: string) => {
  const t = blob?.type ?? '';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('webm')) return 'webm';
  if (t.includes('quicktime')) return 'mov';
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  return fallback;
};

const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]);

/** Lädt die Bibliothek nur für Abonnenten (sonst verweigert der Server den Zugriff). */
function ContentLoader({ children }: { children: ReactNode }) {
  contentResource.use();
  return <>{children}</>;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const { isSubscribed } = useAuth();
  const state = contentResource.useCached();
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** Änderung lokal anwenden und nacheinander auf dem Server speichern. */
  const commit = useCallback((fn: (s: ContentState) => ContentState) => {
    const next = { ...fn(contentResource.get()), version: 1 as const };
    contentResource.set(next);
    const job = queue.current.then(() => api.put<ContentState>('/content', contentResource.get()));
    queue.current = job.catch(() => undefined);
    return job
      .then((saved) => contentResource.set(saved))
      .catch((err) => {
        contentResource.refresh();
        throw err;
      });
  }, []);

  const value = useMemo<ContentContextValue>(
    () => ({
      ...state,
      loaded: contentResource.loaded(),
      saveVideo: (v) => commit((s) => ({ ...s, videos: upsert(s.videos, v) })),
      deleteVideo: async (id) => {
        const v = contentResource.get().videos.find((x) => x.id === id);
        await commit((s) => ({
          ...s,
          videos: s.videos.filter((x) => x.id !== id),
          posts: s.posts.map((p) => (p.videoId === id ? { ...p, videoId: undefined } : p)),
        }));
        await Promise.all([deleteFile(v?.src), deleteFile(v?.poster)]);
      },
      savePhotos: (items) => commit((s) => ({ ...s, photos: items.reduce((list, item) => upsert(list, item), s.photos) })),
      deletePhoto: async (id) => {
        const p = contentResource.get().photos.find((x) => x.id === id);
        await commit((s) => ({
          ...s,
          photos: s.photos.filter((x) => x.id !== id),
          posts: s.posts.map((x) => ({ ...x, photoIds: x.photoIds?.filter((pid) => pid !== id) })),
        }));
        await deleteFile(p?.src);
      },
      savePost: (p) => commit((s) => ({ ...s, posts: upsert(s.posts, p).sort((a, b) => b.date.localeCompare(a.date)) })),
      deletePost: (id) => commit((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) })),
      importContent: async (json) => {
        let data: unknown;
        try {
          data = JSON.parse(json);
        } catch {
          throw new Error('Die Datei ist kein gültiges JSON.');
        }
        const parsed = contentSchema.safeParse(data);
        if (!parsed.success) throw new Error(`Die Datei hat nicht das erwartete Format: ${describeIssues(parsed.error)}`);
        await commit(() => data as ContentState);
      },
      exportContent: () => ({ json: JSON.stringify(contentResource.get(), null, 2) }),
    }),
    [state, commit],
  );

  return (
    <ContentContext.Provider value={value}>
      {isSubscribed ? <ContentLoader>{children}</ContentLoader> : children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent muss innerhalb von <ContentProvider> verwendet werden.');
  return ctx;
}

export { extFor, uid };
