import { useMemo, useState } from 'react';
import { HeartFilledIcon, HeartIcon, ImageIcon, PlayIcon, PostIcon, SearchIcon } from '../icons';
import { navigate } from '../router';
import { formatDate, PHOTOS, placeholderGradient, POSTS, VIDEOS, type PhotoItem } from './libraryData';
import { PhotoLightbox, PhotoTile, VideoPlayerModal } from './MediaViewer';
import { readLikes, readProgress, toggleLike } from './progress';

type Tab = 'videos' | 'fotos' | 'posts';

const TABS: { id: Tab; label: string; icon: typeof PlayIcon; count: number }[] = [
  { id: 'videos', label: 'Videos', icon: PlayIcon, count: VIDEOS.length },
  { id: 'fotos', label: 'Fotos', icon: ImageIcon, count: PHOTOS.length },
  { id: 'posts', label: 'Posts', icon: PostIcon, count: POSTS.length },
];

interface LibraryPageProps {
  query: URLSearchParams;
}

/** Abonnenten-Bibliothek: Videos streamen, Fotoalben ansehen, Posts lesen. Zustand liegt in der URL. */
export function LibraryPage({ query }: LibraryPageProps) {
  const tab = (TABS.some((t) => t.id === query.get('tab')) ? query.get('tab') : 'videos') as Tab;
  const playing = VIDEOS.find((v) => v.id === query.get('play'));

  const setParams = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(query);
    Object.entries(params).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    const qs = next.toString();
    navigate(`/abo-bereich/bibliothek${qs ? `?${qs}` : ''}`);
  };

  return (
    <div>
      <div role="tablist" aria-label="Bibliothek" className="inline-flex rounded-2xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur-xl">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setParams({ tab: t.id, play: null })}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all duration-300 ${
                active ? 'bg-gradient-to-r from-cyan-400 to-blue-600 font-semibold text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {t.label}
              <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-white/5'}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === 'videos' && <VideoGrid onPlay={(id) => setParams({ play: id })} />}
        {tab === 'fotos' && <PhotoGrid />}
        {tab === 'posts' && <PostFeed onPlay={(id) => setParams({ tab: 'videos', play: id })} />}
      </div>

      {playing && <VideoPlayerModal video={playing} onClose={() => setParams({ play: null })} />}
    </div>
  );
}

function VideoGrid({ onPlay }: { onPlay: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Alle');
  const categories = ['Alle', ...new Set(VIDEOS.map((v) => v.category))];
  const progress = readProgress();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VIDEOS.filter(
      (v) =>
        (category === 'Alle' || v.category === category) &&
        (!q || `${v.title} ${v.description} ${v.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [search, category]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 focus-within:border-cyan-400/50">
          <SearchIcon size={16} className="text-slate-500" />
          <span className="sr-only">Videos durchsuchen</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Videos durchsuchen …"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                c === category ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((v) => {
          const p = progress[v.id]?.ratio ?? 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onPlay(v.id)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-xl hover:shadow-blue-900/30"
            >
              <div className="relative aspect-video overflow-hidden" style={{ background: placeholderGradient(v.hue) }}>
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ background: placeholderGradient(v.hue) }} />
                <span className="absolute left-2 top-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{v.category}</span>
                <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{v.duration}</span>
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-14 w-14 scale-90 place-items-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                    <PlayIcon size={24} />
                  </span>
                </span>
                {p > 0.02 && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                    <span className="block h-full bg-cyan-400" style={{ width: `${p * 100}%` }} />
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="truncate font-medium text-white">{v.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{v.description}</p>
                <p className="mt-3 text-xs text-slate-500">{formatDate(v.date)}</p>
              </div>
            </button>
          );
        })}
      </div>
      {list.length === 0 && <p className="mt-10 text-center text-sm text-slate-500">Keine Videos gefunden.</p>}
    </>
  );
}

function PhotoGrid() {
  const albums = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();
    PHOTOS.forEach((p) => map.set(p.album, [...(map.get(p.album) ?? []), p]));
    return [...map.entries()];
  }, []);
  const [open, setOpen] = useState<{ photos: PhotoItem[]; index: number } | null>(null);

  return (
    <div className="space-y-10">
      {albums.map(([album, photos]) => (
        <section key={album}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-oswald text-xl tracking-wide text-white">{album}</h2>
            <span className="text-xs text-slate-500">{photos.length} Fotos · {formatDate(photos[0].date)}</span>
          </div>
          <div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:grid-cols-4">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpen({ photos, index: i })}
                aria-label={`${p.title} öffnen`}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 ${p.tall ? 'row-span-2' : ''}`}
              >
                <PhotoTile photo={p} className="h-full w-full transition-transform duration-700 group-hover:scale-110" />
                <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
              </button>
            ))}
          </div>
        </section>
      ))}
      {open && (
        <PhotoLightbox photos={open.photos} index={open.index} onIndex={(index) => setOpen({ ...open, index })} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function PostFeed({ onPlay }: { onPlay: (videoId: string) => void }) {
  const [likes, setLikes] = useState(readLikes);
  const [open, setOpen] = useState<{ photos: PhotoItem[]; index: number } | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {POSTS.map((post) => {
        const liked = likes.has(post.id);
        const photos = (post.photoIds ?? []).map((id) => PHOTOS.find((p) => p.id === id)).filter((p): p is PhotoItem => Boolean(p));
        const video = VIDEOS.find((v) => v.id === post.videoId);
        return (
          <article key={post.id} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
            <header className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 font-oswald font-bold text-white">B</span>
              <div>
                <p className="text-sm font-medium text-white">BAREBASTIAN</p>
                <p className="text-xs text-slate-500">{formatDate(post.date)}</p>
              </div>
            </header>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-200">{post.text}</p>

            {photos.length > 0 && (
              <div className={`mt-4 grid gap-2 ${photos.length === 1 ? '' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {photos.map((p, i) => (
                  <button key={p.id} type="button" onClick={() => setOpen({ photos, index: i })} className="overflow-hidden rounded-xl" aria-label={`${p.title} öffnen`}>
                    <PhotoTile photo={p} className="aspect-square h-full w-full transition-transform duration-500 hover:scale-105" />
                  </button>
                ))}
              </div>
            )}

            {video && (
              <button type="button" onClick={() => onPlay(video.id)} className="group mt-4 flex w-full items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition-colors hover:border-cyan-400/30">
                <span className="relative grid aspect-video w-32 shrink-0 place-items-center" style={{ background: placeholderGradient(video.hue) }}>
                  <PlayIcon size={20} className="text-white transition-transform group-hover:scale-125" />
                </span>
                <span className="min-w-0 pr-4">
                  <span className="block truncate text-sm font-medium text-white">{video.title}</span>
                  <span className="text-xs text-slate-500">{video.duration}</span>
                </span>
              </button>
            )}

            <footer className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => setLikes(toggleLike(post.id))}
                aria-pressed={liked}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all duration-300 active:scale-90 ${
                  liked ? 'bg-rose-500/15 text-rose-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {liked ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
                {post.likes + (liked ? 1 : 0)}
              </button>
            </footer>
          </article>
        );
      })}
      {open && (
        <PhotoLightbox photos={open.photos} index={open.index} onIndex={(index) => setOpen({ ...open, index })} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
