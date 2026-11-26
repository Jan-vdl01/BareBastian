/** Wiedergabefortschritt & Likes lokal speichern (pro Browser). */
export interface ProgressEntry {
  time: number;
  ratio: number;
}

const PROGRESS_KEY = 'bb_progress';
const LIKES_KEY = 'bb_likes';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const readProgress = () => readJson<Record<string, ProgressEntry>>(PROGRESS_KEY, {});

export function saveProgress(id: string, time: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return;
  const all = readProgress();
  all[id] = { time, ratio: Math.min(1, time / duration) };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

export const readLikes = () => new Set(readJson<string[]>(LIKES_KEY, []));

export function toggleLike(id: string): Set<string> {
  const likes = readLikes();
  if (likes.has(id)) likes.delete(id);
  else likes.add(id);
  localStorage.setItem(LIKES_KEY, JSON.stringify([...likes]));
  return likes;
}
