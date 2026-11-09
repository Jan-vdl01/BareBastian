import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, PlayIcon, XIcon } from '../icons';
import { useMediaUrl } from '../lib/mediaDb';
import { formatDate, placeholderGradient, type PhotoItem, type VideoItem } from './libraryData';
import { readProgress, saveProgress } from './progress';

/** Vollbild-Overlay mit Esc zum Schließen und Scroll-Sperre. */
function Overlay({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-8">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Schließen" onClick={onClose} tabIndex={-1} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-all hover:rotate-90 hover:bg-white/20"
      >
        <XIcon size={18} />
      </button>
      <div className="relative w-full max-w-5xl">{children}</div>
    </div>
  );
}

export function VideoPlayerModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const { url, loading } = useMediaUrl(video.src);
  const poster = useMediaUrl(video.poster).url;
  const [errored, setErrored] = useState(false);
  const failed = !loading && (!url || errored);
  const ref = useRef<HTMLVideoElement>(null);

  const onLoaded = () => {
    const saved = readProgress()[video.id];
    if (ref.current && saved && saved.ratio < 0.97) ref.current.currentTime = saved.time;
  };

  return (
    <Overlay onClose={onClose} label={video.title}>
      <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
        {loading ? (
          <div className="grid aspect-video animate-pulse place-items-center" style={{ background: placeholderGradient(video.hue) }}>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : failed ? (
          <div className="relative grid aspect-video place-items-center text-center" style={{ background: placeholderGradient(video.hue) }}>
            <div className="px-6">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white backdrop-blur"><PlayIcon size={28} /></span>
              <p className="mt-4 font-oswald text-2xl text-white">Video-Platzhalter</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">
                Lege die Datei <code className="rounded bg-black/40 px-1.5 py-0.5">{video.src ?? `media/videos/${video.id}.mp4`}</code> neben der index.html ab, dann wird sie hier abgespielt.
              </p>
            </div>
          </div>
        ) : (
          <video
            ref={ref}
            className="aspect-video w-full bg-black"
            src={url}
            poster={poster}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            onLoadedMetadata={onLoaded}
            onTimeUpdate={(e) => saveProgress(video.id, e.currentTarget.currentTime, e.currentTarget.duration)}
            onError={() => setErrored(true)}
          />
        )}
      </div>
      <div className="mt-4 text-white">
        <p className="text-xs uppercase tracking-wider text-cyan-300">{video.category} · {video.duration} · {formatDate(video.date)}</p>
        <h2 className="mt-1 font-oswald text-2xl tracking-wide">{video.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{video.description}</p>
      </div>
    </Overlay>
  );
}

export function PhotoTile({ photo, className = '' }: { photo: PhotoItem; className?: string }) {
  const { url, loading } = useMediaUrl(photo.src);
  const [errored, setErrored] = useState(false);
  useEffect(() => setErrored(false), [url]);
  if (loading) return <div className={`animate-pulse ${className}`} style={{ background: placeholderGradient(photo.hue) }} />;
  return !url || errored ? (
    <div className={`grid place-items-center ${className}`} style={{ background: placeholderGradient(photo.hue) }}>
      <span className="text-xs font-medium text-white/60">{photo.title}</span>
    </div>
  ) : (
    <img src={url} alt={photo.title} loading="lazy" draggable={false} onError={() => setErrored(true)} className={`object-cover ${className}`} />
  );
}

export function PhotoLightbox({ photos, index, onIndex, onClose }: { photos: PhotoItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const photo = photos[index];
  const prev = () => onIndex((index - 1 + photos.length) % photos.length);
  const next = () => onIndex((index + 1) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const nav = 'absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/25';

  return (
    <Overlay onClose={onClose} label={photo.title}>
      <div className="relative mx-auto flex max-h-[80dvh] justify-center" onContextMenu={(e) => e.preventDefault()}>
        <PhotoTile key={photo.id} photo={photo} className="animate-fade-in max-h-[80dvh] w-auto min-w-[min(100%,480px)] rounded-2xl aspect-[3/4]" />
        <button type="button" onClick={prev} aria-label="Vorheriges Foto" className={`${nav} left-2`}><ChevronLeft size={20} /></button>
        <button type="button" onClick={next} aria-label="Nächstes Foto" className={`${nav} right-2`}><ChevronRight size={20} /></button>
      </div>
      <p className="mt-4 text-center text-sm text-slate-400">
        <span className="text-white">{photo.title}</span> · {photo.album} · {index + 1} / {photos.length}
      </p>
    </Overlay>
  );
}

/** Vorschaubild eines Videos: eigenes Poster oder Farbverlauf-Platzhalter. */
export function VideoThumb({ video, className = '' }: { video: VideoItem; className?: string }) {
  const { url } = useMediaUrl(video.poster);
  return url ? (
    <img src={url} alt="" draggable={false} className={`absolute inset-0 h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`absolute inset-0 ${className}`} style={{ background: placeholderGradient(video.hue) }} />
  );
}
