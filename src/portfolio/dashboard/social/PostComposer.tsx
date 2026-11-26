import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { CheckIcon, ImageIcon, PlusIcon, TrashIcon, XIcon } from '../../icons';
import { readJSON, uid } from '../../lib/localStore';
import { deleteFile, uploadFile } from '../../lib/api';
import { resizeImage, useMediaUrl } from '../../lib/mediaDb';
import { ColorPick, FontSelect, RichTextArea } from '../bio-builder/ModuleEditors';
import { POST_BACKGROUNDS } from './PostContent';
import { PostCard } from './PostCard';
import { DEFAULT_DESIGN, extractTags, MAX_IMAGES, MAX_POST_LENGTH, savePost, type PostDesign, type PostInput, type SocialPost } from './socialStore';

const draftKey = (userId: string) => `bb_social_draft_${userId}`;

/** Data-URL in eine Datei umwandeln (ohne fetch – das blockiert die Sicherheitsrichtlinie). */
function dataUrlToBlob(dataUrl: string) {
  const [head, data] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg';
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function Thumb({ src, onRemove, index }: { src: string; onRemove: () => void; index: number }) {
  const { url } = useMediaUrl(src);
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-800">
      {url && <img src={url} alt={`Bild ${index + 1}`} className="h-full w-full object-cover" />}
      <button type="button" onClick={onRemove} aria-label={`Bild ${index + 1} entfernen`} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white hover:bg-rose-500">
        <XIcon size={13} />
      </button>
    </div>
  );
}

/** Post erstellen oder bearbeiten – mit Textformatierung, Design, Bildern & Umfrage. */
export function PostComposer({ editing, onClose }: { editing?: SocialPost; onClose: () => void }) {
  const { user } = useAuth();
  const me = user?.id ?? '';
  const draft = !editing ? readJSON<Partial<PostInput> | null>(draftKey(me), null) : null;
  const [text, setText] = useState(editing?.text ?? draft?.text ?? '');
  const [design, setDesign] = useState<PostDesign>(editing?.design ?? { ...DEFAULT_DESIGN, ...draft?.design });
  const [images, setImages] = useState<string[]>(editing?.images ?? []);
  const [pollOn, setPollOn] = useState(!!editing?.poll);
  const [pollOptions, setPollOptions] = useState<string[]>(editing?.poll?.options.map((o) => o.text) ?? ['', '']);
  const [pollDays, setPollDays] = useState<number>(1);
  const [visibility, setVisibility] = useState<PostInput['visibility']>(editing?.visibility ?? 'public');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const added = useMemo(() => new Set<string>(), []);
  const tags = extractTags(text);
  const setD = <K extends keyof PostDesign>(k: K, v: PostDesign[K]) => setDesign((d) => ({ ...d, [k]: v }));

  // Entwurf automatisch sichern (nur Text & Design)
  useEffect(() => {
    if (editing) return;
    const t = setTimeout(() => localStorage.setItem(draftKey(me), JSON.stringify({ text, design })), 400);
    return () => clearTimeout(t);
  }, [text, design, editing, me]);

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

  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/')).slice(0, MAX_IMAGES - images.length);
    if (!imgs.length) return;
    setBusy(true);
    try {
      const refs: string[] = [];
      for (const f of imgs) {
        const blob = dataUrlToBlob(await resizeImage(f, 1600, 1600, 0.85));
        const ref = await uploadFile(blob, 'social');
        added.add(ref);
        refs.push(ref);
      }
      setImages((v) => [...v, ...refs].slice(0, MAX_IMAGES));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bild konnte nicht geladen werden.');
    } finally {
      setBusy(false);
    }
  };

  const removeImage = (ref: string) => {
    setImages((v) => v.filter((x) => x !== ref));
    if (added.has(ref)) deleteFile(ref);
  };

  const close = () => {
    // nicht gepostete neue Bilder wieder entfernen
    if (!busy) added.forEach((ref) => deleteFile(ref));
    onClose();
  };

  const input: PostInput = {
    text,
    design,
    images,
    visibility,
    poll: pollOn
      ? {
          endsAt: editing?.poll ? editing.poll.endsAt : pollDays ? new Date(Date.now() + pollDays * 86400000).toISOString() : null,
          options: pollOptions
            .map((t, i) => ({ id: editing?.poll?.options[i]?.id ?? uid('o-'), text: t.trim(), votes: editing?.poll?.options[i]?.votes ?? [] }))
            .filter((o) => o.text),
        }
      : null,
  };

  const submit = async () => {
    if (!text.trim() && !images.length && !pollOn) return setError('Schreib etwas, füge ein Bild hinzu oder erstelle eine Umfrage.');
    if (pollOn && input.poll!.options.length < 2) return setError('Eine Umfrage braucht mindestens 2 Antworten.');
    setBusy(true);
    setError(null);
    try {
      await savePost(me, input, editing?.id);
      if (!editing) localStorage.removeItem(draftKey(me));
      added.clear();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Posten fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const preview: SocialPost = {
    id: editing?.id ?? 'preview',
    authorId: me,
    ...input,
    tags,
    likes: editing?.likes ?? [],
    comments: editing?.comments ?? [],
    createdAt: editing?.createdAt ?? new Date().toISOString(),
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={editing ? 'Post bearbeiten' : 'Neuer Post'} className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Schließen" className="absolute inset-0 cursor-default" onClick={close} />
      <div className="relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0f18] shadow-2xl sm:max-w-6xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-4">
          <h2 className="font-oswald text-xl tracking-wide text-white">{editing ? 'Post bearbeiten' : 'Neuer Post'}</h2>
          <button type="button" onClick={close} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 hover:bg-white/15">
            <XIcon size={16} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5 p-6">
            <div>
              <RichTextArea value={text} onChange={(v) => setText(v.slice(0, MAX_POST_LENGTH))} rows={6} maxLength={MAX_POST_LENGTH} placeholder="Was gibt's Neues? Nutze #Hashtags und @Namen …" />
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span key={t} className="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-200">
                      #{t}
                    </span>
                  ))}
                </span>
                <span className={text.length > MAX_POST_LENGTH - 100 ? 'text-amber-300' : ''}>
                  {text.length} / {MAX_POST_LENGTH}
                </span>
              </div>
            </div>

            <fieldset className="rounded-2xl border border-white/10 p-4">
              <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-200">Gestaltung</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {POST_BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setD('bg', b.id)}
                    aria-pressed={design.bg === b.id}
                    title={b.label}
                    className={`relative h-12 overflow-hidden rounded-xl border text-[10px] font-semibold transition-all ${design.bg === b.id ? 'border-sky-400 ring-2 ring-sky-400/40' : 'border-white/10 hover:border-white/30'}`}
                    style={{ background: b.id === 'none' ? 'rgba(255,255,255,0.03)' : b.css, color: b.text || '#94a3b8' }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Schrift</span>
                  <FontSelect value={design.font} onChange={(v) => setD('font', v)} />
                </div>
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Textfarbe</span>
                  <div className="flex h-10 items-center">
                    <ColorPick label="Textfarbe des Posts" value={design.textColor} onChange={(v) => setD('textColor', v)} />
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Schriftgröße: {design.size}px</span>
                  <input type="range" min={13} max={40} value={design.size} onChange={(e) => setD('size', Number(e.target.value))} className="w-full accent-sky-400" />
                </label>
                <div role="radiogroup" aria-label="Ausrichtung" className="inline-flex rounded-lg border border-white/10 p-0.5">
                  {(
                    [
                      ['left', '⇤', 'Links'],
                      ['center', '↔', 'Zentriert'],
                      ['right', '⇥', 'Rechts'],
                    ] as const
                  ).map(([v, icon, label]) => (
                    <button key={v} type="button" role="radio" aria-checked={design.align === v} aria-label={label} onClick={() => setD('align', v)} className={`grid h-8 w-9 place-items-center rounded-md text-sm ${design.align === v ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-white/10 p-4">
              <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-200">Bilder ({images.length}/{MAX_IMAGES})</legend>
              {images.length > 0 && (
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {images.map((ref, i) => (
                    <Thumb key={ref} src={ref} index={i} onRemove={() => removeImage(ref)} />
                  ))}
                </div>
              )}
              {images.length < MAX_IMAGES && (
                <label
                  onDragOver={(e) => (e.preventDefault(), setOver(true))}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(false);
                    addFiles([...e.dataTransfer.files]);
                  }}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm transition-colors ${over ? 'border-sky-400 bg-sky-500/10 text-sky-100' : 'border-white/15 text-slate-400 hover:border-sky-400/50 hover:text-white'}`}
                >
                  {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <ImageIcon size={18} />}
                  Bilder hierher ziehen oder auswählen
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles([...(e.target.files ?? [])])} />
                </label>
              )}
            </fieldset>

            <fieldset className="rounded-2xl border border-white/10 p-4">
              <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-200">Umfrage</legend>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={pollOn} disabled={!!editing?.poll} onChange={(e) => setPollOn(e.target.checked)} />
                Umfrage hinzufügen
              </label>
              {pollOn && (
                <div className="mt-3 space-y-2">
                  {pollOptions.map((o, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        aria-label={`Antwort ${i + 1}`}
                        value={o}
                        maxLength={60}
                        disabled={!!editing?.poll}
                        onChange={(e) => setPollOptions((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={`Antwort ${i + 1}`}
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
                      />
                      {pollOptions.length > 2 && !editing?.poll && (
                        <button type="button" onClick={() => setPollOptions((v) => v.filter((_, j) => j !== i))} aria-label={`Antwort ${i + 1} entfernen`} className="grid w-10 place-items-center rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!editing?.poll && (
                    <div className="flex flex-wrap items-center gap-3">
                      {pollOptions.length < 4 && (
                        <button type="button" onClick={() => setPollOptions((v) => [...v, ''])} className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline">
                          <PlusIcon size={12} /> Antwort hinzufügen
                        </button>
                      )}
                      <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                        Laufzeit
                        <select value={pollDays} onChange={(e) => setPollDays(Number(e.target.value))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white">
                          <option value={1}>1 Tag</option>
                          <option value={3}>3 Tage</option>
                          <option value={7}>7 Tage</option>
                          <option value={0}>Unbegrenzt</option>
                        </select>
                      </label>
                    </div>
                  )}
                  {editing?.poll && <p className="text-[11px] text-slate-500">Umfragen lassen sich nach dem Posten nicht mehr ändern.</p>}
                </div>
              )}
            </fieldset>
          </div>

          <aside className="space-y-4 border-t border-white/5 bg-black/20 p-6 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vorschau</p>
            <PostCard post={preview} preview />
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Sichtbarkeit</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as PostInput['visibility'])} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white">
                <option value="public">🌍 Öffentlich – alle Mitglieder</option>
                <option value="followers">🔒 Nur meine Follower</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}
            <button type="button" onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:-translate-y-0.5 disabled:opacity-50">
              <CheckIcon size={16} /> {editing ? 'Änderungen speichern' : 'Posten'}
            </button>
            {!editing && <p className="text-center text-[11px] text-slate-500">Entwürfe werden automatisch gespeichert.</p>}
          </aside>
        </div>
      </div>
    </div>
  );
}
