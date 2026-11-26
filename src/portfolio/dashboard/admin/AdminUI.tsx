import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { extFor, useContent } from '../../content/ContentContext';
import { AlertIcon, CheckIcon, PencilIcon, Shield, TrashIcon, UploadIcon, XIcon } from '../../icons';
import { uid } from '../../lib/localStore';
import { deleteFile as deleteMedia, isServerFile, uploadFile } from '../../lib/api';
import { formatDuration, readVideoDuration, resizeImage, useMediaUrl } from '../../lib/mediaDb';
import { placeholderGradient, type PhotoItem, type PostItem, type VideoItem } from '../libraryData';
import { PhotoTile } from '../MediaViewer';

/* ---------- Grundbausteine ---------- */

export const adminInput =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-amber-300/60 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-amber-300/10';

export function AdminBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 ${className}`}>
      <Shield size={12} /> Admin
    </span>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
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
    <div role="dialog" aria-modal="true" aria-label={title} className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Schließen" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0f18] shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
        <header className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <AdminBadge />
            <h2 className="font-oswald text-xl tracking-wide text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 transition-all hover:rotate-90 hover:bg-white/15">
            <XIcon size={16} />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Löschen', onConfirm, onClose }: { title: string; message: string; confirmLabel?: string; onConfirm: () => Promise<void> | void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-300">
          <AlertIcon size={20} />
        </span>
        <p className="text-sm leading-relaxed text-slate-300">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
          Abbrechen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-400 disabled:opacity-60"
        >
          {busy ? 'Wird gelöscht …' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Kleine Bearbeiten/Löschen-Leiste über Karten – nur für Admins gerendert. */
export function AdminItemActions({ onEdit, onDelete, label }: { onEdit: () => void; onDelete: () => void; label: string }) {
  const btn = 'grid h-8 w-8 place-items-center rounded-lg bg-black/70 text-white backdrop-blur transition-colors';
  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onEdit} aria-label={`${label} bearbeiten`} title="Bearbeiten" className={`${btn} hover:bg-amber-400 hover:text-slate-900`}>
        <PencilIcon size={14} />
      </button>
      <button type="button" onClick={onDelete} aria-label={`${label} löschen`} title="Löschen" className={`${btn} hover:bg-rose-500`}>
        <TrashIcon size={14} />
      </button>
    </div>
  );
}

function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FormFooter({ busy, error, onClose, submitLabel, busyLabel }: { busy: boolean; error: string | null; onClose: () => void; submitLabel: string; busyLabel?: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
          Abbrechen
        </button>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60">
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" /> : <CheckIcon size={16} />}
          {busy ? (busyLabel ?? 'Wird gespeichert …') : submitLabel}
        </button>
      </div>
    </>
  );
}

function FileDrop({ accept, multiple, onFiles, label, hint }: { accept: string; multiple?: boolean; onFiles: (f: File[]) => void; label: string; hint: string }) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
        over ? 'border-amber-300/70 bg-amber-300/10' : 'border-white/15 hover:border-amber-300/40 hover:bg-white/[0.03]'
      }`}
    >
      <UploadIcon size={22} className="text-amber-200" />
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-xs text-slate-500">{hint}</span>
      <input id={id} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => onFiles([...(e.target.files ?? [])])} />
    </label>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');

/** Lädt Bilddateien in den Medienspeicher und erzeugt Foto-Einträge. */
async function uploadPhotoFiles(files: File[], album: string, date: string): Promise<PhotoItem[]> {
  const items: PhotoItem[] = [];
  for (const [i, file] of files.entries()) {
    if (!file.type.startsWith('image/')) continue;
    const id = uid('p-');
    const src = await uploadFile(file, 'library');
    const tall = await new Promise<boolean>((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve(img.naturalHeight > img.naturalWidth * 1.15);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => resolve(false);
      img.src = url;
    });
    items.push({
      id,
      title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') || `${album} #${i + 1}`,
      album,
      date,
      src,
      hue: Math.floor(Math.random() * 360),
      tall,
      fileExt: extFor(file, 'jpg'),
    });
  }
  return items;
}

/* ---------- Video ---------- */

export function VideoEditor({ video, onClose }: { video?: VideoItem; onClose: () => void }) {
  const { saveVideo, videos } = useContent();
  const id = useId();
  const [form, setForm] = useState<VideoItem>(
    () =>
      video ?? {
        id: uid('v-'),
        title: '',
        description: '',
        duration: '',
        date: today(),
        category: 'Exklusiv',
        tags: [],
        hue: Math.floor(Math.random() * 360),
      },
  );
  const [file, setFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'upload' | 'path'>(video?.src && !isServerFile(video.src) ? 'path' : 'upload');
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categories = useMemo(() => [...new Set(videos.map((v) => v.category))], [videos]);
  const posterPreview = useMediaUrl(form.poster).url;
  const set = <K extends keyof VideoItem>(k: K, v: VideoItem[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pickFile = async (files: File[]) => {
    const f = files.find((x) => x.type.startsWith('video/'));
    if (!f) return setError('Bitte eine Videodatei wählen (z. B. MP4 oder WebM).');
    setError(null);
    setFile(f);
    if (!form.title) set('title', f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    const d = await readVideoDuration(f);
    if (d) set('duration', d);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Bitte einen Titel angeben.');
    if (!video && mode === 'upload' && !file) return setError('Bitte eine Videodatei auswählen.');
    setBusy(true);
    setError(null);
    try {
      const next: VideoItem = { ...form, title: form.title.trim(), category: form.category.trim() || 'Allgemein' };
      if (mode === 'upload' && file) {
        setProgress(0);
        next.src = await uploadFile(file, 'library', setProgress);
        if (video?.src) await deleteMedia(video.src);
        next.fileExt = extFor(file, 'mp4');
      }
      if (mode === 'path') {
        if (video?.src && isServerFile(video.src)) await deleteMedia(video.src);
        next.src = form.src?.trim() || undefined;
        next.fileExt = undefined;
      }
      if (posterFile) next.poster = await resizeImage(posterFile, 960, 540, 0.8);
      await saveVideo(next);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Modal title={video ? 'Video bearbeiten' : 'Video hochladen'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs">
          {(['upload', 'path'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 transition-colors ${mode === m ? 'bg-white/10 font-semibold text-white' : 'text-slate-400'}`}>
              {m === 'upload' ? 'Datei hochladen' : 'Pfad / URL'}
            </button>
          ))}
        </div>

        {mode === 'upload' ? (
          <>
            <FileDrop accept="video/*" onFiles={pickFile} label={file ? file.name : video?.src ? 'Neue Datei wählen (ersetzt das Video)' : 'Video hierher ziehen oder auswählen'} hint="MP4 oder WebM empfohlen" />
            {file && <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB{form.duration ? ` · Länge ${form.duration}` : ''}</p>}
          </>
        ) : (
          <Field label="Pfad oder URL" hint="Externe Video-URL (https://…) oder Pfad auf dem Server." htmlFor={`${id}-src`}>
            <input id={`${id}-src`} className={adminInput} value={form.src ?? ''} onChange={(e) => set('src', e.target.value)} placeholder="https://…" />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titel *" htmlFor={`${id}-title`}>
            <input id={`${id}-title`} className={adminInput} value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Kategorie" htmlFor={`${id}-cat`}>
            <input id={`${id}-cat`} list={`${id}-cats`} className={adminInput} value={form.category} onChange={(e) => set('category', e.target.value)} />
            <datalist id={`${id}-cats`}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <Field label="Beschreibung" htmlFor={`${id}-desc`}>
          <textarea id={`${id}-desc`} rows={3} className={`${adminInput} resize-none`} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Datum" htmlFor={`${id}-date`}>
            <input id={`${id}-date`} type="date" className={adminInput} value={form.date.slice(0, 10)} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Länge" htmlFor={`${id}-dur`}>
            <input id={`${id}-dur`} className={adminInput} value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="mm:ss" />
          </Field>
          <Field label="Tags" hint="Mit Komma trennen" htmlFor={`${id}-tags`}>
            <input
              id={`${id}-tags`}
              className={adminInput}
              value={form.tags.join(', ')}
              onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
            />
          </Field>
        </div>

        <Field label="Vorschaubild">
          <div className="grid grid-cols-[8rem_1fr] items-center gap-4">
            <div className="relative aspect-video overflow-hidden rounded-xl" style={{ background: placeholderGradient(form.hue) }}>
              {(posterFile || posterPreview) && <img src={posterFile ? URL.createObjectURL(posterFile) : posterPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            </div>
            <div className="space-y-2">
              <FileDrop accept="image/*" onFiles={(f) => f[0] && setPosterFile(f[0])} label="Bild wählen" hint="Ohne Bild wird ein Farbverlauf genutzt" />
              {(form.poster || posterFile) && (
                <button type="button" onClick={() => (setPosterFile(null), set('poster', undefined))} className="text-xs text-rose-300 hover:underline">
                  Vorschaubild entfernen
                </button>
              )}
              {!form.poster && !posterFile && (
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  Farbton
                  <input type="range" min={0} max={359} value={form.hue} onChange={(e) => set('hue', Number(e.target.value))} className="flex-1 accent-amber-300" />
                </label>
              )}
            </div>
          </div>
        </Field>

        <FormFooter busy={busy} error={error} onClose={onClose} submitLabel={video ? 'Speichern' : 'Hochladen'} busyLabel={progress !== null ? `Upload ${Math.round(progress * 100)} % …` : undefined} />
      </form>
    </Modal>
  );
}

/* ---------- Fotos ---------- */

export function PhotoUploader({ onClose, defaultAlbum = '' }: { onClose: () => void; defaultAlbum?: string }) {
  const { savePhotos, photos } = useContent();
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [album, setAlbum] = useState(defaultAlbum);
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const albums = useMemo(() => [...new Set(photos.map((p) => p.album))], [photos]);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!files.length) return setError('Bitte mindestens ein Bild auswählen.');
    if (!album.trim()) return setError('Bitte einen Albumnamen angeben.');
    setBusy(true);
    setError(null);
    try {
      await savePhotos(await uploadPhotoFiles(files, album.trim(), date));
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Fotos hochladen" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <FileDrop accept="image/*" multiple onFiles={(f) => setFiles((prev) => [...prev, ...f.filter((x) => x.type.startsWith('image/'))])} label="Bilder hierher ziehen oder auswählen" hint="Mehrere Dateien möglich (JPG, PNG, WebP)" />
        {files.length > 0 && (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {previews.map((src, i) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-lg">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Entfernen" onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white hover:bg-rose-500">
                  <XIcon size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Album *" htmlFor={`${id}-album`}>
            <input id={`${id}-album`} list={`${id}-albums`} className={adminInput} value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="z. B. Winter-Shooting" />
            <datalist id={`${id}-albums`}>{albums.map((a) => <option key={a} value={a} />)}</datalist>
          </Field>
          <Field label="Datum" htmlFor={`${id}-date`}>
            <input id={`${id}-date`} type="date" className={adminInput} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <FormFooter busy={busy} error={error} onClose={onClose} submitLabel={`${files.length || ''} Foto${files.length === 1 ? '' : 's'} hochladen`.trim()} />
      </form>
    </Modal>
  );
}

export function PhotoEditor({ photo, onClose }: { photo: PhotoItem; onClose: () => void }) {
  const { savePhotos, photos } = useContent();
  const id = useId();
  const [form, setForm] = useState<PhotoItem>(photo);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const albums = useMemo(() => [...new Set(photos.map((p) => p.album))], [photos]);
  const set = <K extends keyof PhotoItem>(k: K, v: PhotoItem[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.album.trim()) return setError('Bitte einen Albumnamen angeben.');
    setBusy(true);
    setError(null);
    try {
      const next = { ...form, title: form.title.trim() || photo.title, album: form.album.trim() };
      if (file) {
        next.src = await uploadFile(file, 'library');
        await deleteMedia(photo.src);
        next.fileExt = extFor(file, 'jpg');
      }
      await savePhotos([next]);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Foto bearbeiten" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-2">
          <div className="aspect-[3/4] overflow-hidden rounded-xl">
            {file ? <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" /> : <PhotoTile photo={photo} className="h-full w-full" />}
          </div>
          <FileDrop accept="image/*" onFiles={(f) => f[0] && setFile(f[0])} label="Bild ersetzen" hint="Optional" />
        </div>
        <div className="space-y-4">
          <Field label="Titel" htmlFor={`${id}-title`}>
            <input id={`${id}-title`} className={adminInput} value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Beschreibung" htmlFor={`${id}-desc`}>
            <textarea id={`${id}-desc`} rows={2} className={`${adminInput} resize-none`} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Album" htmlFor={`${id}-album`}>
              <input id={`${id}-album`} list={`${id}-albums`} className={adminInput} value={form.album} onChange={(e) => set('album', e.target.value)} />
              <datalist id={`${id}-albums`}>{albums.map((a) => <option key={a} value={a} />)}</datalist>
            </Field>
            <Field label="Datum" htmlFor={`${id}-date`}>
              <input id={`${id}-date`} type="date" className={adminInput} value={form.date.slice(0, 10)} onChange={(e) => set('date', e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-amber-300" checked={!!form.tall} onChange={(e) => set('tall', e.target.checked)} />
            Im Raster hoch darstellen (Hochformat)
          </label>
          <FormFooter busy={busy} error={error} onClose={onClose} submitLabel="Speichern" />
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Posts ---------- */

export function PostEditor({ post, onClose }: { post?: PostItem; onClose: () => void }) {
  const { savePost, savePhotos, photos, videos } = useContent();
  const id = useId();
  const [form, setForm] = useState<PostItem>(() => post ?? { id: uid('post-'), date: today(), text: '', photoIds: [], likes: 0 });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = new Set(form.photoIds ?? []);
  const set = <K extends keyof PostItem>(k: K, v: PostItem[K]) => setForm((f) => ({ ...f, [k]: v }));

  const togglePhoto = (pid: string) => set('photoIds', selected.has(pid) ? [...selected].filter((x) => x !== pid) : [...selected, pid]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) return setError('Bitte einen Text schreiben.');
    setBusy(true);
    setError(null);
    try {
      let photoIds = form.photoIds ?? [];
      if (newFiles.length) {
        const uploaded = await uploadPhotoFiles(newFiles, 'Posts', form.date);
        void savePhotos(uploaded);
        photoIds = [...photoIds, ...uploaded.map((p) => p.id)];
      }
      await savePost({ ...form, text: form.text.trim(), photoIds, videoId: form.videoId || undefined });
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={post ? 'Post bearbeiten' : 'Neuer Post'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Text *" htmlFor={`${id}-text`}>
          <textarea id={`${id}-text`} rows={5} maxLength={2000} className={`${adminInput} resize-y`} value={form.text} onChange={(e) => set('text', e.target.value)} placeholder="Was gibt's Neues?" />
          <p className="mt-1 text-right text-[11px] text-slate-500">{form.text.length} / 2000</p>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Datum" htmlFor={`${id}-date`}>
            <input id={`${id}-date`} type="date" className={adminInput} value={form.date.slice(0, 10)} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Video anhängen" htmlFor={`${id}-video`}>
            <select id={`${id}-video`} className={adminInput} value={form.videoId ?? ''} onChange={(e) => set('videoId', e.target.value || undefined)}>
              <option value="" className="bg-slate-900">Kein Video</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-900">
                  {v.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={`Fotos anhängen (${selected.size + newFiles.length} ausgewählt)`}>
          <div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-white/5 p-2 sm:grid-cols-7">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePhoto(p.id)}
                aria-pressed={selected.has(p.id)}
                aria-label={p.title}
                className={`relative aspect-square overflow-hidden rounded-lg transition-all ${selected.has(p.id) ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#0b0f18]' : 'opacity-70 hover:opacity-100'}`}
              >
                <PhotoTile photo={p} className="h-full w-full" />
                {selected.has(p.id) && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-300 text-slate-900">
                    <CheckIcon size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Field>
        <FileDrop accept="image/*" multiple onFiles={(f) => setNewFiles((prev) => [...prev, ...f.filter((x) => x.type.startsWith('image/'))])} label={newFiles.length ? `${newFiles.length} neue Bilder ausgewählt` : 'Neue Bilder hochladen'} hint="Landen zusätzlich im Album „Posts“" />
        <FormFooter busy={busy} error={error} onClose={onClose} submitLabel={post ? 'Speichern' : 'Veröffentlichen'} />
      </form>
    </Modal>
  );
}

export { formatDuration };
