import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PHOTOS, POSTS, VIDEOS, type PhotoItem, type PostItem, type VideoItem } from '../dashboard/libraryData';
import { readJSON, uid, writeJSON } from '../lib/localStore';
import { downloadBlob } from '../lib/download';
import { deleteMedia, getMedia, isLocalMedia } from '../lib/mediaDb';

/**
 * Inhalte der Bibliothek (Videos, Fotos, Posts).
 *
 * Reihenfolge beim Laden:
 *  1. Änderungen des Admins in diesem Browser (localStorage)
 *  2. content.json neben der index.html (vom Admin exportiert und hochgeladen)
 *  3. Beispielinhalte aus libraryData.ts
 */
export interface ContentState {
  version: 1;
  updatedAt: string;
  videos: VideoItem[];
  photos: PhotoItem[];
  posts: PostItem[];
}

type Source = 'local' | 'published' | 'defaults';

const KEY = 'bb_content';
const defaults = (): ContentState => ({ version: 1, updatedAt: '', videos: VIDEOS, photos: PHOTOS, posts: POSTS });

const isContent = (v: unknown): v is ContentState =>
  !!v && typeof v === 'object' && Array.isArray((v as ContentState).videos) && Array.isArray((v as ContentState).photos) && Array.isArray((v as ContentState).posts);

interface ContentContextValue extends ContentState {
  source: Source;
  saveVideo: (v: VideoItem) => void;
  deleteVideo: (id: string) => Promise<void>;
  savePhotos: (items: PhotoItem[]) => void;
  deletePhoto: (id: string) => Promise<void>;
  savePost: (p: PostItem) => void;
  deletePost: (id: string) => void;
  importContent: (json: string) => void;
  resetContent: () => Promise<void>;
  exportContent: () => { json: string; localFiles: { ref: string; path: string }[] };
  downloadLocalFiles: () => Promise<number>;
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

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentState>(() => readJSON<ContentState | null>(KEY, null) ?? defaults());
  const [source, setSource] = useState<Source>(() => (localStorage.getItem(KEY) ? 'local' : 'defaults'));

  // Veröffentlichte content.json laden (nur wenn keine lokalen Admin-Änderungen vorliegen)
  useEffect(() => {
    if (localStorage.getItem(KEY) || location.protocol === 'file:') return;
    fetch('content.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (isContent(data) && !localStorage.getItem(KEY)) {
          setState(data);
          setSource('published');
        }
      })
      .catch(() => undefined);
  }, []);

  // Änderungen aus anderen Tabs übernehmen
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const next = readJSON<ContentState | null>(KEY, null);
      if (next) {
        setState(next);
        setSource('local');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((fn: (s: ContentState) => ContentState) => {
    setState((prev) => {
      const next = { ...fn(prev), version: 1 as const, updatedAt: new Date().toISOString() };
      writeJSON(KEY, next);
      return next;
    });
    setSource('local');
  }, []);

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

  const value = useMemo<ContentContextValue>(() => {
    const exportContent = () => {
      const localFiles: { ref: string; path: string }[] = [];
      const mapSrc = (src: string | undefined, folder: string, id: string, ext: string) => {
        if (!isLocalMedia(src)) return src;
        const path = `media/${folder}/${id}.${ext}`;
        localFiles.push({ ref: src!, path });
        return path;
      };
      const data: ContentState = {
        ...state,
        videos: state.videos.map((v) => ({ ...v, src: mapSrc(v.src, 'videos', v.id, v.fileExt ?? 'mp4') })),
        photos: state.photos.map((p) => ({ ...p, src: mapSrc(p.src, 'photos', p.id, p.fileExt ?? 'jpg') })),
      };
      return { json: JSON.stringify(data, null, 2), localFiles };
    };

    return {
      ...state,
      source,
      saveVideo: (v) => commit((s) => ({ ...s, videos: upsert(s.videos, v) })),
      deleteVideo: async (id) => {
        await deleteMedia(state.videos.find((v) => v.id === id)?.src);
        commit((s) => ({
          ...s,
          videos: s.videos.filter((v) => v.id !== id),
          posts: s.posts.map((p) => (p.videoId === id ? { ...p, videoId: undefined } : p)),
        }));
      },
      savePhotos: (items) => commit((s) => ({ ...s, photos: items.reduce((list, item) => upsert(list, item), s.photos) })),
      deletePhoto: async (id) => {
        await deleteMedia(state.photos.find((p) => p.id === id)?.src);
        commit((s) => ({
          ...s,
          photos: s.photos.filter((p) => p.id !== id),
          posts: s.posts.map((p) => ({ ...p, photoIds: p.photoIds?.filter((x) => x !== id) })),
        }));
      },
      savePost: (p) => commit((s) => ({ ...s, posts: upsert(s.posts, p).sort((a, b) => b.date.localeCompare(a.date)) })),
      deletePost: (id) => commit((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) })),
      importContent: (json) => {
        const data: unknown = JSON.parse(json);
        if (!isContent(data)) throw new Error('Die Datei hat nicht das erwartete Format (videos, photos, posts).');
        commit(() => data);
      },
      resetContent: async () => {
        await Promise.all([...state.videos.map((v) => deleteMedia(v.src)), ...state.photos.map((p) => deleteMedia(p.src))]);
        localStorage.removeItem(KEY);
        setState(defaults());
        setSource('defaults');
      },
      exportContent,
      downloadLocalFiles: async () => {
        const { localFiles } = exportContent();
        for (const f of localFiles) {
          const blob = await getMedia(f.ref);
          if (!blob) continue;
          downloadBlob(blob, f.path.split('/').pop()!);
          await new Promise((r) => setTimeout(r, 400));
        }
        return localFiles.length;
      },
    };
  }, [state, source, commit]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent muss innerhalb von <ContentProvider> verwendet werden.');
  return ctx;
}

export { extFor, uid };
