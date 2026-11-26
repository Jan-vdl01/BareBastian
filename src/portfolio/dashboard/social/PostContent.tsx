import { useEffect, useState } from 'react';
import { listProfiles } from '../../auth/userDirectory';
import { ChevronLeft, ChevronRight, CheckIcon, XIcon } from '../../icons';
import { useMediaUrl } from '../../lib/mediaDb';
import { richText } from '../bio-builder/richText';
import { fontCss } from '../bio-builder/themes';
import { vote, type PostDesign, type SocialPost } from './socialStore';

/** Hintergrund-Vorlagen für gestaltete Posts. */
export const POST_BACKGROUNDS: { id: string; label: string; css: string; text: string }[] = [
  { id: 'none', label: 'Ohne', css: 'transparent', text: '' },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg,#f97316,#db2777)', text: '#ffffff' },
  { id: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg,#22d3ee,#a855f7 55%,#ec4899)', text: '#ffffff' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg,#06b6d4,#2563eb)', text: '#ffffff' },
  { id: 'fire', label: 'Feuer', css: 'linear-gradient(135deg,#7f1d1d,#ef4444 45%,#f59e0b)', text: '#ffffff' },
  { id: 'midnight', label: 'Midnight', css: 'linear-gradient(160deg,#0f172a,#1e1b4b)', text: '#e0e7ff' },
  { id: 'neon', label: 'Neon-Raster', css: 'repeating-linear-gradient(0deg,rgba(255,113,206,.22) 0 1px,transparent 1px 26px),repeating-linear-gradient(90deg,rgba(1,205,254,.22) 0 1px,transparent 1px 26px),linear-gradient(180deg,#1a0533,#3b0a5c)', text: '#fffb96' },
  { id: 'gold', label: 'Gold', css: 'linear-gradient(135deg,#1a1405,#5c4a12 50%,#d4af37)', text: '#fff7d6' },
  { id: 'mint', label: 'Mint', css: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', text: '#064e3b' },
  { id: 'candy', label: 'Candy', css: 'repeating-linear-gradient(135deg,#fff0f6 0 16px,#ffe3ef 16px 32px)', text: '#9d174d' },
  { id: 'paper', label: 'Papier', css: '#fbf6e9', text: '#3b3029' },
  { id: 'galaxy', label: 'Galaxie', css: 'radial-gradient(1.5px 1.5px at 15% 25%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 80%,#fff,transparent),radial-gradient(1px 1px at 85% 65%,#fff,transparent),radial-gradient(ellipse at 20% 0%,rgba(124,58,237,.6),transparent 60%),#0b0624', text: '#ffffff' },
];
export const getBackground = (id: string) => POST_BACKGROUNDS.find((b) => b.id === id) ?? POST_BACKGROUNDS[0];

/** Formatierten Text in HTML umwandeln und #Hashtags / @Erwähnungen verlinken (nur in Textknoten). */
export function postHtml(text: string): string {
  const users = new Map(listProfiles().map((p) => [p.username.toLowerCase(), p.id]));
  const html = richText(text);
  let inAnchor = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<a\b/i.test(part)) inAnchor++;
        if (/^<\/a>/i.test(part)) inAnchor = Math.max(0, inAnchor - 1);
        return part;
      }
      if (inAnchor) return part;
      return part
        .replace(/(^|[^\p{L}\d_&#;])#([\p{L}\d_]{2,30})/gu, (_m, pre: string, tag: string) => `${pre}<a href="#/abo-bereich/social?tag=${encodeURIComponent(tag.toLowerCase())}" class="font-semibold text-sky-300 hover:underline">#${tag}</a>`)
        .replace(/(^|[^\p{L}\d_.])@([a-z0-9_.]{3,20})/giu, (m, pre: string, name: string) => {
          const id = users.get(name.toLowerCase());
          return id ? `${pre}<a href="#/abo-bereich/profil?u=${encodeURIComponent(id)}" class="font-semibold text-sky-300 hover:underline">@${name}</a>` : m;
        });
    })
    .join('');
}

export function PostText({ text, design }: { text: string; design: PostDesign }) {
  const bg = getBackground(design.bg);
  const card = bg.id !== 'none';
  const style = {
    fontFamily: design.font ? fontCss(design.font) : undefined,
    fontSize: `${design.size}px`,
    textAlign: design.align,
    color: design.textColor ?? (card ? bg.text : undefined),
    lineHeight: 1.45,
  } as const;
  const body = (
    <div
      className={`whitespace-pre-wrap break-words [&_a]:break-all ${card ? '[&_a]:!text-current [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-4' : ''}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: postHtml(text) }}
    />
  );
  if (!card) return body;
  return (
    <div className="grid min-h-[200px] place-items-center rounded-2xl px-6 py-10 shadow-inner" style={{ background: bg.css }}>
      <div className="w-full">{body}</div>
    </div>
  );
}

function Img({ src, className = '', onClick, alt }: { src: string; className?: string; onClick?: () => void; alt: string }) {
  const { url, loading } = useMediaUrl(src);
  if (loading || !url) return <div className={`animate-pulse bg-slate-800 ${className}`} />;
  return (
    <button type="button" onClick={onClick} className={`block overflow-hidden ${className}`} aria-label={alt}>
      <img src={url} alt={alt} className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" draggable={false} />
    </button>
  );
}

function Lightbox({ images, index, onClose }: { images: string[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const { url } = useMediaUrl(images[i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % images.length);
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Bild" className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
      <button type="button" tabIndex={-1} aria-label="Schließen" className="absolute inset-0 cursor-default" onClick={onClose} />
      {url && <img src={url} alt={`Bild ${i + 1}`} className="relative max-h-[88dvh] max-w-full rounded-2xl object-contain" />}
      <button type="button" onClick={onClose} aria-label="Schließen" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <XIcon size={18} />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => setI((v) => (v - 1 + images.length) % images.length)} aria-label="Vorheriges Bild" className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => setI((v) => (v + 1) % images.length)} aria-label="Nächstes Bild" className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}

export function PostImages({ images }: { images: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  const n = images.length;
  return (
    <>
      <div className={`mt-3 grid gap-1.5 overflow-hidden rounded-2xl ${n === 1 ? '' : 'grid-cols-2'} ${n === 3 ? 'grid-rows-2' : ''}`}>
        {images.map((src, i) => (
          <Img
            key={src}
            src={src}
            alt={`Bild ${i + 1} von ${n}`}
            onClick={() => setOpen(i)}
            className={n === 1 ? 'max-h-[520px] w-full' : n === 3 && i === 0 ? 'row-span-2 h-full min-h-[240px]' : 'aspect-square w-full'}
          />
        ))}
      </div>
      {open !== null && <Lightbox images={images} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function PostPoll({ post, viewer, preview = false }: { post: SocialPost; viewer: string; preview?: boolean }) {
  if (!post.poll) return null;
  const { options, endsAt } = post.poll;
  const total = options.reduce((a, o) => a + o.votes.length, 0);
  const ended = !!endsAt && new Date(endsAt) <= new Date();
  const myVote = options.find((o) => o.votes.includes(viewer))?.id;
  const showResults = ended || !!myVote || preview;
  const left = endsAt && !ended ? Math.max(0, new Date(endsAt).getTime() - Date.now()) : 0;
  return (
    <div className="mt-3 space-y-2" role="group" aria-label="Umfrage">
      {options.map((o) => {
        const pct = total ? Math.round((o.votes.length / total) * 100) : 0;
        return showResults ? (
          <button
            key={o.id}
            type="button"
            disabled={ended || preview}
            onClick={() => vote(post.id, o.id, viewer)}
            className="relative block w-full overflow-hidden rounded-xl border border-white/10 px-3.5 py-2.5 text-left text-sm text-white disabled:cursor-default"
          >
            <span className={`absolute inset-y-0 left-0 ${myVote === o.id ? 'bg-sky-500/35' : 'bg-white/10'} transition-all duration-700`} style={{ width: `${pct}%` }} />
            <span className="relative flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {myVote === o.id && <CheckIcon size={14} />}
                {o.text}
              </span>
              <span className="tabular-nums text-slate-300">{pct} %</span>
            </span>
          </button>
        ) : (
          <button key={o.id} type="button" onClick={() => vote(post.id, o.id, viewer)} className="block w-full rounded-xl border border-sky-400/40 px-3.5 py-2.5 text-left text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/15">
            {o.text}
          </button>
        );
      })}
      <p className="text-xs text-slate-500">
        {total} Stimme{total === 1 ? '' : 'n'} · {ended ? 'Beendet' : endsAt ? `Endet in ${left > 86400000 ? `${Math.ceil(left / 86400000)} Tagen` : `${Math.ceil(left / 3600000)} Std.`}` : 'Unbegrenzt'}
        {myVote && !ended && ' · Klicke eine andere Option, um deine Stimme zu ändern'}
      </p>
    </div>
  );
}
