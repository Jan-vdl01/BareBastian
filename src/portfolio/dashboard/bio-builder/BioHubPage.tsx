import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { CheckIcon, CopyIcon, DownloadIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon, XIcon } from '../../icons';
import { downloadBlob } from '../../lib/download';
import { navigate } from '../../router';
import { defaultTheme, projectFromStarter, STARTERS, type StarterTemplate } from './modules';
import {
  addFolder,
  createProject,
  DEFAULT_FOLDER,
  deleteFolder,
  deleteProject,
  duplicateProject,
  exportProjects,
  importProjects,
  moveProject,
  renameFolder,
  renameProject,
  toggleFavoriteTheme,
  useLibrary,
  type StoredProject,
} from './projectStore';
import { renderBio } from './renderChaturbate';
import { ScaledPreview } from './ScaledPreview';
import { getTheme, THEME_CATEGORIES, THEMES, type ThemeCategory, type ThemeDef } from './themes';

const editorUrl = (id: string) => `/abo-bereich/bio-designer/edit?p=${id}`;

/** Beispielprofil eines Themes (für Galerie & Detailansicht), gecacht. */
const sampleCache = new Map<string, string>();
function sampleHtml(themeId: string, starterId = 'studio'): string {
  const k = `${themeId}:${starterId}`;
  if (!sampleCache.has(k)) {
    const starter = STARTERS.find((s) => s.id === starterId) ?? STARTERS[0];
    sampleCache.set(k, renderBio(projectFromStarter(starter, 'Dein Name', defaultTheme(themeId))));
  }
  return sampleCache.get(k)!;
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 86400 * 7) return `vor ${Math.floor(diff / 86400)} Tag${diff < 86400 * 2 ? '' : 'en'}`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition-all ${
        active ? 'border-violet-400/60 bg-violet-500/20 font-semibold text-white' : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
      }`}
    >
      {children}
      {count !== undefined && <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white/5'}`}>{count}</span>}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 focus-within:border-violet-400/50 sm:max-w-xs">
      <SearchIcon size={16} className="shrink-0 text-slate-500" />
      <span className="sr-only">{placeholder}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Suche leeren" className="text-slate-500 hover:text-white">
          <XIcon size={14} />
        </button>
      )}
    </label>
  );
}

function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
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
      <div className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0f18] shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-6xl' : 'sm:max-w-2xl'}`}>
        <header className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-4">
          <h2 className="font-oswald text-xl tracking-wide text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 transition-all hover:rotate-90 hover:bg-white/15">
            <XIcon size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/60 focus:outline-none focus:ring-4 focus:ring-violet-400/10';

/* ---------- Neues Profil ---------- */

function NewProfileDialog({ userId, folders, defaultName, displayName, initialTheme, initialStarter, initialFolder, onClose }: { userId: string; folders: string[]; defaultName: string; displayName: string; initialTheme: string; initialStarter: string; initialFolder: string; onClose: () => void }) {
  const [name, setName] = useState(defaultName);
  const [themeId, setThemeId] = useState(initialTheme);
  const [starterId, setStarterId] = useState(initialStarter);
  const [folder, setFolder] = useState(initialFolder);
  const [newFolder, setNewFolder] = useState('');
  const starter = STARTERS.find((s) => s.id === starterId) ?? STARTERS[0];

  const create = () => {
    const target = folder === '__new' ? newFolder.trim() || DEFAULT_FOLDER : folder;
    const entry = createProject(userId, name, projectFromStarter(starter, displayName, defaultTheme(themeId)), target);
    onClose();
    navigate(editorUrl(entry.id));
  };

  return (
    <Dialog title="Neues Profil erstellen" onClose={onClose} wide>
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">Name des Profils</span>
              <input autoFocus className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">Ordner</span>
              <select className={inputCls} value={folder} onChange={(e) => setFolder(e.target.value)}>
                {folders.map((f) => (
                  <option key={f} value={f} className="bg-slate-900">
                    {f}
                  </option>
                ))}
                <option value="__new" className="bg-slate-900">+ Neuer Ordner …</option>
              </select>
              {folder === '__new' && <input className={`${inputCls} mt-2`} placeholder="Name des Ordners" value={newFolder} maxLength={40} onChange={(e) => setNewFolder(e.target.value)} />}
            </label>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-300">Layout-Vorlage</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {STARTERS.map((s) => (
                <button key={s.id} type="button" onClick={() => setStarterId(s.id)} aria-pressed={starterId === s.id} className={`rounded-xl border p-3 text-left transition-all ${starterId === s.id ? 'border-violet-400 bg-violet-500/15 ring-2 ring-violet-400/30' : 'border-white/10 hover:border-white/25'}`}>
                  <span className="block text-sm font-semibold text-white">{s.name}</span>
                  <span className="block text-[11px] text-slate-400">{s.description}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">{s.types.length ? `${s.types.length} Module` : 'Ohne Module'}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-300">Theme</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {THEMES.map((t) => {
                const k = t.tokens(t.accent, t.accent2);
                return (
                  <button key={t.id} type="button" onClick={() => setThemeId(t.id)} aria-pressed={themeId === t.id} title={t.name} className={`overflow-hidden rounded-lg border text-left transition-all ${themeId === t.id ? 'border-violet-400 ring-2 ring-violet-400/40' : 'border-white/10 hover:border-white/30'}`}>
                    <span className="block h-9" style={{ background: k.boxBg, borderTop: k.boxBorderTop }}>
                      <span className="ml-1.5 mt-2 block h-1.5 w-3/5 rounded" style={{ background: k.buttonBg }} />
                    </span>
                    <span className="block truncate bg-slate-950/70 px-1.5 py-1 text-[10px] text-slate-200">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <span className="block text-xs font-medium text-slate-300">Vorschau</span>
          <ScaledPreview html={sampleHtml(themeId, starter.types.length ? starter.id : 'compact')} height={420} className="rounded-xl border border-white/10" title={`Vorschau ${getTheme(themeId).name}`} />
          <button type="button" onClick={create} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:-translate-y-0.5">
            <PlusIcon size={16} /> Profil erstellen & bearbeiten
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- Theme-Detailansicht ---------- */

function ThemeDetail({ theme, favorite, onFavorite, onUse, onClose }: { theme: ThemeDef; favorite: boolean; onFavorite: () => void; onUse: (starter: StarterTemplate) => void; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [starterId, setStarterId] = useState('studio');
  const [dark, setDark] = useState(false);
  const starters = STARTERS.filter((s) => s.types.length);
  const starter = starters.find((s) => s.id === starterId) ?? starters[0];

  return (
    <Dialog title={theme.name} onClose={onClose} wide>
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['desktop', 'mobile'] as const).map((d) => (
              <Chip key={d} active={device === d} onClick={() => setDevice(d)}>
                {d === 'desktop' ? 'Desktop' : 'Mobil'}
              </Chip>
            ))}
            <Chip active={dark} onClick={() => setDark((v) => !v)}>
              Dunkle Seite
            </Chip>
          </div>
          <div className={`mx-auto transition-all duration-300 ${device === 'mobile' ? 'max-w-[390px]' : ''}`}>
            <ScaledPreview
              key={`${device}-${starter.id}`}
              html={sampleHtml(theme.id, starter.id)}
              renderWidth={device === 'mobile' ? 390 : 952}
              height={device === 'mobile' ? 680 : 600}
              dark={dark}
              interactive
              title={`${theme.name} – große Vorschau`}
              className="rounded-2xl border border-white/10"
            />
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-500">In der Vorschau kannst du scrollen.</p>
        </div>

        <aside className="space-y-5">
          <div>
            <p className="text-sm text-slate-300">{theme.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {theme.categories.map((c) => (
                <span key={c} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full border border-white/20" style={{ background: theme.accent }} title={theme.accent} />
            <span className="h-8 w-8 rounded-full border border-white/20" style={{ background: theme.accent2 }} title={theme.accent2} />
            <span className="text-xs text-slate-500">Farben lassen sich später frei ändern.</span>
          </div>
          <div>
            <span className="mb-2 block text-xs font-medium text-slate-300">Layout in der Vorschau</span>
            <div className="grid gap-1.5">
              {starters.map((s) => (
                <button key={s.id} type="button" onClick={() => setStarterId(s.id)} aria-pressed={starterId === s.id} className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${starterId === s.id ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                  <b>{s.name}</b> · {s.description}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => onUse(starter)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:-translate-y-0.5">
            <PlusIcon size={16} /> Mit diesem Theme starten
          </button>
          <button type="button" onClick={onFavorite} aria-pressed={favorite} className={`w-full rounded-xl border px-5 py-2.5 text-sm transition-colors ${favorite ? 'border-amber-300/50 bg-amber-300/10 text-amber-200' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
            {favorite ? '★ In deinen Favoriten' : '☆ Zu Favoriten hinzufügen'}
          </button>
        </aside>
      </div>
    </Dialog>
  );
}

/* ---------- Profilkarte ---------- */

function ProjectCard({ p, folders, userId }: { p: StoredProject; folders: string[]; userId: string }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(p.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const html = useMemo(() => renderBio(p.project), [p.project]);
  const theme = getTheme(p.project.theme.preset);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  const item = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10';

  return (
    <article className="group relative overflow-visible rounded-2xl border border-white/10 bg-slate-900/50 transition-all hover:-translate-y-0.5 hover:border-violet-400/40" data-project={p.id}>
      <button type="button" onClick={() => navigate(editorUrl(p.id))} className="block w-full overflow-hidden rounded-t-2xl text-left" aria-label={`${p.name} öffnen`}>
        <ScaledPreview html={html || '<p style="text-align:center;color:#888;padding:40px">Noch leer</p>'} height={200} title={`Vorschau ${p.name}`} />
      </button>
      <div className="p-4">
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renameProject(userId, p.id, name);
              setRenaming(false);
            }}
            className="flex gap-2"
          >
            <input autoFocus aria-label="Neuer Name" className={`${inputCls} py-1.5`} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={() => (renameProject(userId, p.id, name), setRenaming(false))} />
          </form>
        ) : (
          <p className="truncate font-medium text-white">{p.name}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-slate-300">📁 {p.folder}</span>
          <span>{theme.name}</span>
          <span>·</span>
          <span>{p.project.modules.length} Module</span>
          <span>·</span>
          <span>{relativeTime(p.updatedAt)}</span>
          {p.versions.length > 0 && <span>· {p.versions.length} Versionen</span>}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => navigate(editorUrl(p.id))} className="flex-1 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white">
            Bearbeiten
          </button>
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} aria-label={`Aktionen für ${p.name}`} aria-expanded={menu} className="grid h-8 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10">
              ⋯
            </button>
            {menu && (
              <div className="absolute bottom-10 right-0 z-20 w-56 rounded-xl border border-white/10 bg-[#0b0f18] p-1.5 shadow-2xl">
                <button type="button" className={item} onClick={() => (setRenaming(true), setMenu(false))}>
                  <PencilIcon size={13} /> Umbenennen
                </button>
                <button type="button" className={item} onClick={() => (duplicateProject(userId, p.id), setMenu(false))}>
                  <CopyIcon size={13} /> Duplizieren
                </button>
                <button
                  type="button"
                  className={item}
                  onClick={() => {
                    downloadBlob(new Blob([exportProjects(userId, [p.id])], { type: 'application/json' }), `${p.name.replace(/[^\w-]+/g, '_')}.bio.json`);
                    setMenu(false);
                  }}
                >
                  <DownloadIcon size={13} /> Als Datei exportieren
                </button>
                <label className="block px-3 py-2 text-[11px] text-slate-400">
                  In Ordner verschieben
                  <select aria-label="Ordner" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white" value={p.folder} onChange={(e) => (moveProject(userId, p.id, e.target.value), setMenu(false))}>
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className={`${item} text-rose-300 hover:bg-rose-500/15`} onClick={() => (setConfirmDelete(true), setMenu(false))}>
                  <TrashIcon size={13} /> Löschen
                </button>
              </div>
            )}
          </div>
        </div>
        {confirmDelete && (
          <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
            „{p.name}“ endgültig löschen?
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => deleteProject(userId, p.id)} className="rounded-lg bg-rose-500 px-3 py-1.5 font-semibold text-white">
                Löschen
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-white/10">
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/* ---------- Startseite ---------- */

export function BioHubPage() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? 'anon';
  const lib = useLibrary(userId);
  const [projectSearch, setProjectSearch] = useState('');
  const [folder, setFolder] = useState<string>('__all');
  const [sort, setSort] = useState<'updated' | 'name' | 'created'>('updated');
  const [themeSearch, setThemeSearch] = useState('');
  const [category, setCategory] = useState<ThemeCategory | '__all' | '__fav'>('__all');
  const [themeSort, setThemeSort] = useState<'recommended' | 'name' | 'new'>('recommended');
  const [detail, setDetail] = useState<ThemeDef | null>(null);
  const [creating, setCreating] = useState<{ theme: string; starter: string } | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [folderEdit, setFolderEdit] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const projects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    return lib.projects
      .filter((p) => (folder === '__all' || p.folder === folder) && (!q || `${p.name} ${p.folder} ${getTheme(p.project.theme.preset).name}`.toLowerCase().includes(q)))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [lib.projects, projectSearch, folder, sort]);

  const themes = useMemo(() => {
    const q = themeSearch.trim().toLowerCase();
    const list = THEMES.filter(
      (t) =>
        (category === '__all' || (category === '__fav' ? lib.favoriteThemes.includes(t.id) : t.categories.includes(category))) &&
        (!q || `${t.name} ${t.description} ${t.categories.join(' ')}`.toLowerCase().includes(q)),
    );
    if (themeSort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (themeSort === 'new') return [...list].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    return list;
  }, [themeSearch, category, themeSort, lib.favoriteThemes]);

  const folderCounts = useMemo(() => Object.fromEntries(lib.folders.map((f) => [f, lib.projects.filter((p) => p.folder === f).length])), [lib]);

  const startNew = (themeId = 'inferno', starter = 'studio') => setCreating({ theme: themeId, starter });

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const n = importProjects(userId, await file.text());
      setNotice({ ok: true, text: `${n} Profil${n === 1 ? '' : 'e'} importiert.` });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Import fehlgeschlagen.' });
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-700/40 via-fuchsia-700/20 to-orange-600/20 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-200">Chaturbate-Bio-Designer</p>
            <h2 className="mt-2 font-oswald text-3xl tracking-wide text-white sm:text-4xl">Gestalte dein perfektes Profil</h2>
            <p className="mt-2 text-sm text-slate-300">
              Wähle ein Theme, stelle deine Module zusammen und kopiere das fertige HTML direkt in Chaturbate. Du kannst beliebig viele Profile speichern – z. B. für verschiedene Anlässe.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => startNew()} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-all hover:-translate-y-0.5">
              <PlusIcon size={16} /> Neues Profil
            </button>
            <button type="button" onClick={() => importRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm text-white transition-colors hover:bg-white/10">
              <UploadIcon size={16} /> Importieren
            </button>
            <input ref={importRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </div>
        {notice && (
          <p role="status" className={`relative mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${notice.ok ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>
            {notice.ok && <CheckIcon size={14} />} {notice.text}
          </p>
        )}
      </section>

      {/* Meine Profile */}
      <section aria-labelledby="my-profiles">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="my-profiles" className="font-oswald text-2xl tracking-wide text-white">
              Meine Profile <span className="text-base text-slate-500">({lib.projects.length})</span>
            </h2>
            <p className="text-sm text-slate-400">Alle Profile werden automatisch gespeichert.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <SearchBox value={projectSearch} onChange={setProjectSearch} placeholder="Profile durchsuchen …" />
            <select aria-label="Sortierung" className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="updated">Zuletzt bearbeitet</option>
              <option value="created">Neueste zuerst</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Ordner">
          <Chip active={folder === '__all'} onClick={() => setFolder('__all')} count={lib.projects.length}>
            Alle
          </Chip>
          {lib.folders.map((f) => (
            <Chip key={f} active={folder === f} onClick={() => setFolder(f)} count={folderCounts[f]}>
              📁 {f}
            </Chip>
          ))}
          <button
            type="button"
            onClick={() => {
              const n = window.prompt('Name des neuen Ordners');
              if (n?.trim()) {
                addFolder(userId, n);
                setFolder(n.trim().slice(0, 40));
              }
            }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-slate-400 hover:border-violet-400/50 hover:text-violet-200"
          >
            <PlusIcon size={12} /> Ordner
          </button>
          {folder !== '__all' && folder !== DEFAULT_FOLDER && (
            <span className="ml-1 flex items-center gap-1 text-[11px]">
              {folderEdit === folder ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = (e.currentTarget.elements.namedItem('folder') as HTMLInputElement).value;
                    renameFolder(userId, folder, v);
                    setFolder(v.trim().slice(0, 40) || folder);
                    setFolderEdit(null);
                  }}
                >
                  <input name="folder" autoFocus defaultValue={folder} aria-label="Ordnername" className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white" />
                </form>
              ) : (
                <button type="button" onClick={() => setFolderEdit(folder)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white">
                  Umbenennen
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Ordner „${folder}“ löschen? Die Profile darin werden nach „${DEFAULT_FOLDER}“ verschoben.`)) {
                    deleteFolder(userId, folder);
                    setFolder('__all');
                  }
                }}
                className="rounded-lg px-2 py-1 text-rose-300 hover:bg-rose-500/10"
              >
                Ordner löschen
              </button>
            </span>
          )}
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <button type="button" onClick={() => startNew()} className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-400/30 text-violet-200 transition-all hover:border-violet-400/70 hover:bg-violet-500/5">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-violet-500/20">
                <PlusIcon size={24} />
              </span>
              <span className="font-semibold">Neues Profil erstellen</span>
            </button>
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} folders={lib.folders} userId={userId} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
            <p className="font-oswald text-xl text-white">{lib.projects.length ? 'Keine Profile gefunden' : 'Noch keine Profile'}</p>
            <p className="mt-1 text-sm text-slate-400">{lib.projects.length ? 'Passe Suche oder Ordner an.' : 'Starte mit einem Theme aus der Galerie oder erstelle direkt ein neues Profil.'}</p>
            <button type="button" onClick={() => startNew()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white">
              <PlusIcon size={16} /> Neues Profil
            </button>
          </div>
        )}
      </section>

      {/* Theme-Galerie */}
      <section aria-labelledby="theme-gallery">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="theme-gallery" className="font-oswald text-2xl tracking-wide text-white">
              Theme-Galerie <span className="text-base text-slate-500">({THEMES.length})</span>
            </h2>
            <p className="text-sm text-slate-400">Live-Vorschau mit Beispielprofil – klicke ein Theme an, um es groß anzusehen.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <SearchBox value={themeSearch} onChange={setThemeSearch} placeholder="Themes durchsuchen …" />
            <select aria-label="Theme-Sortierung" className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white" value={themeSort} onChange={(e) => setThemeSort(e.target.value as typeof themeSort)}>
              <option value="recommended">Empfohlen</option>
              <option value="new">Neu zuerst</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Kategorien">
          <Chip active={category === '__all'} onClick={() => setCategory('__all')} count={THEMES.length}>
            Alle
          </Chip>
          <Chip active={category === '__fav'} onClick={() => setCategory('__fav')} count={lib.favoriteThemes.length}>
            ★ Favoriten
          </Chip>
          {THEME_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)} count={THEMES.filter((t) => t.categories.includes(c)).length}>
              {c}
            </Chip>
          ))}
        </div>

        {themes.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {themes.map((t) => {
              const fav = lib.favoriteThemes.includes(t.id);
              return (
                <article key={t.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 transition-all hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-2xl hover:shadow-violet-900/30" data-theme={t.id}>
                  <button type="button" onClick={() => setDetail(t)} className="block w-full text-left" aria-label={`Theme ${t.name} ansehen`}>
                    <ScaledPreview html={sampleHtml(t.id)} height={260} title={`Vorschau ${t.name}`} />
                    <span className="absolute inset-x-0 top-0 grid h-[260px] place-items-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">Vorschau öffnen</span>
                    </span>
                  </button>
                  {t.isNew && <span className="absolute left-3 top-3 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Neu</span>}
                  <button
                    type="button"
                    onClick={() => toggleFavoriteTheme(userId, t.id)}
                    aria-pressed={fav}
                    aria-label={fav ? `${t.name} aus Favoriten entfernen` : `${t.name} zu Favoriten`}
                    className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-lg backdrop-blur transition-all hover:scale-110 ${fav ? 'bg-amber-300 text-slate-900' : 'bg-black/50 text-white'}`}
                  >
                    {fav ? '★' : '☆'}
                  </button>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ background: `linear-gradient(135deg, ${t.accent} 50%, ${t.accent2} 50%)` }} />
                      <p className="font-medium text-white">{t.name}</p>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-400">{t.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.categories.map((c) => (
                        <button key={c} type="button" onClick={() => setCategory(c)} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white">
                          {c}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => startNew(t.id)} className="mt-3 w-full rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 transition-colors hover:bg-violet-500/25">
                      Mit diesem Theme starten
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-slate-400">{category === '__fav' ? 'Noch keine Favoriten – markiere Themes mit ☆.' : 'Kein Theme gefunden.'}</p>
        )}
      </section>

      {detail && (
        <ThemeDetail
          theme={detail}
          favorite={lib.favoriteThemes.includes(detail.id)}
          onFavorite={() => toggleFavoriteTheme(userId, detail.id)}
          onUse={(starter) => {
            setDetail(null);
            startNew(detail.id, starter.id);
          }}
          onClose={() => setDetail(null)}
        />
      )}
      {creating && (
        <NewProfileDialog
          userId={userId}
          folders={lib.folders}
          defaultName={`Profil ${lib.projects.length + 1}`}
          displayName={profile?.displayName ?? ''}
          initialTheme={creating.theme}
          initialStarter={creating.starter}
          initialFolder={folder !== '__all' ? folder : DEFAULT_FOLDER}
          onClose={() => setCreating(null)}
        />
      )}
    </div>
  );
}
