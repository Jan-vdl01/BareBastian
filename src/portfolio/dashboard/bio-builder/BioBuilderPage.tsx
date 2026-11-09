import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AlertIcon, CheckIcon, ChevronDown, CopyIcon, DownloadIcon, EyeIcon, EyeOffIcon, PlusIcon, TrashIcon, XIcon } from '../../icons';
import { downloadBlob } from '../../lib/download';
import { readJSON } from '../../lib/localStore';
import { checkBio } from '../bio/chaturbateRules';
import { builderInput, Field, FontSelect, ModuleEditor, StyleEditor } from './ModuleEditors';
import { plainText } from './richText';
import { COLOR_PRESETS, fontCss, getTheme, THEMES } from './themes';
import { cloneModule, createModule, getModuleDef, MODULE_CATALOG, projectFromStarter, STARTERS } from './modules';
import { checkCompatibility, isHttpsUrl, MAX_WIDTH, renderBio } from './renderChaturbate';
import type { BioModule, BioProject, BioTheme, BoxStyle, ModuleType } from './types';

const storageKey = (userId: string) => `bb_bio_project_${userId}`;
const HISTORY_LIMIT = 50;

/** Projekt laden: gespeicherte Version des Users oder Startvorlage. */
function loadProject(userId: string, name: string): BioProject {
  const saved = readJSON<BioProject | null>(storageKey(userId), null);
  if (saved?.version === 1 && Array.isArray(saved.modules)) {
    // Ältere Version: Trenner-Art lag im Feld „style“ (heute: Box-Stil)
    const modules = saved.modules.map((m) => {
      const legacy = m as unknown as { type: string; style?: unknown; look?: string };
      if (legacy.type === 'divider' && typeof legacy.style === 'string') return { ...m, look: legacy.style, style: undefined } as BioModule;
      return m;
    });
    return { ...saved, modules };
  }
  return projectFromStarter(STARTERS[0], name);
}

/** Alle sichtbaren Texte eines Moduls – für den Regel-Check. */
function moduleText(m: BioModule): string {
  const parts: string[] = [m.title];
  switch (m.type) {
    case 'header':
      parts.push(m.name, m.tagline, m.bannerUrl, m.avatarUrl);
      break;
    case 'facts':
      m.items.forEach((x) => parts.push(x.label, x.value));
      break;
    case 'text':
      parts.push(m.text);
      break;
    case 'image':
      parts.push(m.caption, m.alt, m.url, m.link);
      break;
    case 'gallery':
      m.images.forEach((x) => parts.push(x.url, x.link));
      break;
    case 'tipMenu':
      m.items.forEach((x) => parts.push(x.label));
      break;
    case 'wishList':
      m.items.forEach((x) => parts.push(x.label, x.link));
      break;
    case 'schedule':
      m.items.forEach((x) => parts.push(x.day, x.time));
      parts.push(m.note);
      break;
    case 'goal':
      parts.push(m.text);
      break;
    case 'rules':
      m.items.forEach((x) => parts.push(x.text));
      break;
    case 'links':
      m.items.forEach((x) => parts.push(x.label, x.url));
      break;
    case 'marquee':
      parts.push(m.text);
      break;
    case 'ranking':
      m.items.forEach((x) => parts.push(x.label, x.name, x.value));
      parts.push(m.footer);
      break;
    case 'features':
      m.items.forEach((x) => parts.push(x.title, x.text));
      break;
    case 'chips':
      m.items.forEach((x) => parts.push(x.label, x.link));
      break;
    case 'products':
      m.items.forEach((x) => parts.push(x.brand, x.badge, x.title, x.text, x.button, x.url));
      break;
    case 'levels':
      m.items.forEach((x) => parts.push(x.label, x.info));
      parts.push(m.tip);
      break;
    case 'cards':
      m.items.forEach((x) => parts.push(x.tag, x.price, x.title, x.button, x.url, x.imageUrl));
      parts.push(m.hint);
      break;
  }
  parts.push(m.eyebrow ?? '', m.subtitle ?? '');
  return plainText(parts.filter(Boolean).join('\n'));
}

/** Zusammenfassung für die eingeklappte Modulkarte. */
function moduleSummary(m: BioModule): string {
  if (m.type === 'links' && !m.items.some((x) => isHttpsUrl(x.url))) return '⚠ Noch kein gültiger Link – wird nicht angezeigt';
  if (m.type === 'image' && !isHttpsUrl(m.url)) return '⚠ Noch keine Bild-URL – wird nicht angezeigt';
  switch (m.type) {
    case 'header':
      return m.name;
    case 'text':
      return plainText(m.text).slice(0, 60) || 'Noch kein Text';
    case 'tipMenu':
    case 'wishList':
    case 'schedule':
    case 'rules':
    case 'links':
    case 'facts':
    case 'ranking':
    case 'features':
    case 'chips':
    case 'products':
    case 'levels':
    case 'cards':
      return m.items.length === 1 ? '1 Eintrag' : `${m.items.length} Einträge`;
    case 'gallery':
      return m.images.length === 1 ? '1 Bild' : `${m.images.length} Bilder`;
    case 'image':
      return m.url ? 'Bild gesetzt' : 'Noch kein Bild';
    case 'goal':
      return `${m.current} / ${m.target} ${m.unit}`;
    case 'marquee':
      return plainText(m.text).slice(0, 50);
    case 'divider':
      return { line: 'Linie', dots: 'Punkte', hearts: 'Herzen', stars: 'Sterne', space: 'Abstand' }[m.look];
  }
}


function Panel({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-oswald text-lg tracking-wide text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function BioBuilderPage() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? 'anon';
  const [history, setHistory] = useState<{ past: BioProject[]; present: BioProject; future: BioProject[] }>(() => ({
    past: [],
    present: loadProject(userId, profile?.displayName ?? ''),
    future: [],
  }));
  const project = history.present;
  const [openId, setOpenId] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const [starterOpen, setStarterOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<'preview' | 'html' | 'checks'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [pageDark, setPageDark] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moduleTab, setModuleTab] = useState<'content' | 'style'>('content');
  const [styleClipboard, setStyleClipboard] = useState<BoxStyle | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Pro User speichern
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(storageKey(userId), JSON.stringify(project)), 250);
    return () => clearTimeout(t);
  }, [project, userId]);

  const commit = useCallback((fn: (p: BioProject) => BioProject) => {
    setHistory((h) => ({
      past: [...h.past, h.present].slice(-HISTORY_LIMIT),
      present: { ...fn(h.present), updatedAt: new Date().toISOString() },
      future: [],
    }));
  }, []);

  const undo = useCallback(() => setHistory((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h)), []);
  const redo = useCallback(() => setHistory((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const setTheme = <K extends keyof BioTheme>(key: K, value: BioTheme[K]) => commit((p) => ({ ...p, theme: { ...p.theme, [key]: value } }));
  const choosePreset = (id: string) => {
    const t = getTheme(id);
    commit((p) => ({ ...p, theme: { ...p.theme, preset: t.id, accent: t.accent, accent2: t.accent2, font: t.font, headingFont: t.headingFont, radius: t.radius } }));
  };

  const updateModule = (m: BioModule) => commit((p) => ({ ...p, modules: p.modules.map((x) => (x.id === m.id ? m : x)) }));
  const removeModule = (id: string) => commit((p) => ({ ...p, modules: p.modules.filter((x) => x.id !== id) }));
  const moveModule = (from: number, to: number) =>
    commit((p) => {
      const list = [...p.modules];
      const [item] = list.splice(from, 1);
      list.splice(Math.max(0, Math.min(list.length, to)), 0, item);
      return { ...p, modules: list };
    });
  const insertModule = (m: BioModule) => {
    commit((p) => {
      const idx = openId ? p.modules.findIndex((x) => x.id === openId) : -1;
      const list = [...p.modules];
      list.splice(idx >= 0 ? idx + 1 : list.length, 0, m);
      return { ...p, modules: list };
    });
    setOpenId(m.id);
    setPalette(false);
    setTimeout(() => document.getElementById(`module-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const html = useMemo(() => renderBio(project), [project]);
  const compat = useMemo(() => checkCompatibility(html), [html]);
  const compatOk = compat.every((c) => c.ok);

  const ruleResults = useMemo(() => checkBio(project.modules.filter((m) => !m.hidden).map(moduleText).join('\n')), [project.modules]);
  const underage = project.modules.some((m) => !m.hidden && m.type === 'facts' && m.items.some((x) => /alter|age/i.test(x.label) && /^\d+$/.test(x.value.trim()) && Number(x.value) < 18));
  const errors = ruleResults.filter((r) => r.matches.length && r.rule.severity === 'error').length + (underage ? 1 : 0);
  const warnings = ruleResults.filter((r) => r.matches.length && r.rule.severity === 'warning').length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const preset = getTheme(project.theme.preset);
  const previewDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px 10px;background:${pageDark ? '#1b1b1f' : '#ffffff'};font-family:Arial,sans-serif;font-size:13px;color:${pageDark ? '#ddd' : '#494949'}">${html}</body></html>`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ---------- Editor ---------- */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={undo} disabled={!history.past.length} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-30" title="Strg+Z">
            ↶ Rückgängig
          </button>
          <button type="button" onClick={redo} disabled={!history.future.length} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-30" title="Strg+Umschalt+Z">
            ↷ Wiederholen
          </button>
          <span className="flex-1" />
          <button type="button" onClick={() => setStarterOpen((v) => !v)} className="rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-400/20">
            Vorlage laden
          </button>
        </div>

        {starterOpen && (
          <div className="grid gap-2 rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-3 sm:grid-cols-4">
            {STARTERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (project.modules.length && !window.confirm(`Vorlage „${s.name}“ laden? Deine aktuellen Module werden ersetzt (Rückgängig ist möglich).`)) return;
                  commit((p) => ({ ...projectFromStarter(s, profile?.displayName ?? '', p.theme) }));
                  setStarterOpen(false);
                  setOpenId(null);
                }}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-left transition-colors hover:border-violet-400/50"
              >
                <span className="block text-sm font-semibold text-white">{s.name}</span>
                <span className="block text-[11px] text-slate-400">{s.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Design */}
        <Panel
          title="Design"
          right={
            <button type="button" onClick={() => setDesignOpen((v) => !v)} aria-expanded={designOpen} className="text-xs text-slate-400 hover:text-white">
              {designOpen ? 'Einklappen' : 'Anpassen'}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((t) => {
              const k = t.tokens(t.accent, t.accent2);
              const active = project.theme.preset === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => choosePreset(t.id)}
                  aria-pressed={active}
                  title={t.description}
                  className={`group overflow-hidden rounded-xl border text-left transition-all ${active ? 'border-violet-400 ring-2 ring-violet-400/40' : 'border-white/10 hover:-translate-y-0.5 hover:border-white/30'}`}
                >
                  <span className="block h-16 p-2" style={{ background: k.boxBg, borderTop: k.boxBorderTop }}>
                    <span className="inline-block rounded px-1.5 text-[7px] font-bold uppercase tracking-widest" style={{ background: k.eyebrowBg, color: k.eyebrowText, border: k.eyebrowBorder }}>
                      Label
                    </span>
                    <span className="mt-1 block truncate text-[11px] font-black" style={{ color: k.heading, fontFamily: fontCss(t.headingFont) }}>
                      Überschrift
                    </span>
                    <span className="mt-1 block h-2.5 w-3/4 rounded" style={{ background: k.buttonBg }} />
                  </span>
                  <span className="block bg-slate-950/60 px-2 py-1.5">
                    <span className="block truncate text-[11px] font-semibold text-white">{t.name}</span>
                    <span className="block truncate text-[10px] text-slate-500">{t.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {designOpen && (
            <div className="mt-5 space-y-4">
              <Field label="Farben">
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map(([c1, c2]) => (
                    <button
                      key={c1 + c2}
                      type="button"
                      aria-label={`Farben ${c1} und ${c2}`}
                      onClick={() => commit((p) => ({ ...p, theme: { ...p.theme, accent: c1, accent2: c2 } }))}
                      className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${project.theme.accent === c1 && project.theme.accent2 === c2 ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}
                    />
                  ))}
                  <input type="color" aria-label="Akzentfarbe 1" value={project.theme.accent} onChange={(e) => setTheme('accent', e.target.value)} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent" />
                  <input type="color" aria-label="Akzentfarbe 2" value={project.theme.accent2} onChange={(e) => setTheme('accent2', e.target.value)} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent" />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fließtext-Schrift" htmlFor="bb-font">
                  <FontSelect id="bb-font" allowTheme={false} value={project.theme.font} onChange={(v) => v && setTheme('font', v)} />
                </Field>
                <Field label="Überschrift-Schrift" htmlFor="bb-hfont">
                  <FontSelect id="bb-hfont" allowTheme={false} value={project.theme.headingFont ?? preset.headingFont} onChange={(v) => v && setTheme('headingFont', v)} />
                </Field>
                <Field label="Anordnung" htmlFor="bb-layout">
                  <select id="bb-layout" className={builderInput} value={project.theme.layout} onChange={(e) => setTheme('layout', e.target.value as BioTheme['layout'])}>
                    <option value="cards" className="bg-slate-900">Einzelne Karten</option>
                    <option value="joined" className="bg-slate-900">Durchgehend</option>
                  </select>
                </Field>
                <Field label="Ausrichtung" htmlFor="bb-align">
                  <select id="bb-align" className={builderInput} value={project.theme.align} onChange={(e) => setTheme('align', e.target.value as BioTheme['align'])}>
                    <option value="center" className="bg-slate-900">Zentriert</option>
                    <option value="left" className="bg-slate-900">Links</option>
                    <option value="right" className="bg-slate-900">Rechts</option>
                    <option value="justify" className="bg-slate-900">Blocksatz</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label={`Ecken-Rundung: ${project.theme.radius}px`} htmlFor="bb-radius">
                  <input id="bb-radius" type="range" min={0} max={32} value={project.theme.radius} onChange={(e) => setTheme('radius', Number(e.target.value))} className="w-full accent-violet-400" />
                </Field>
                <label className="flex h-9 items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" className="h-4 w-4 accent-violet-400" checked={project.theme.emojis} onChange={(e) => setTheme('emojis', e.target.checked)} />
                  Emojis in Überschriften
                </label>
              </div>
            </div>
          )}
        </Panel>

        {/* Module */}
        <Panel title={`Module (${project.modules.length})`} right={<span className="text-[11px] text-slate-500">Ziehen zum Sortieren</span>}>
          <ol ref={listRef} className="space-y-2" onDragLeave={(e) => !listRef.current?.contains(e.relatedTarget as Node) && setDropIndex(null)}>
            {project.modules.map((m, i) => {
              const def = getModuleDef(m.type);
              const Icon = def.icon;
              const open = openId === m.id;
              return (
                <li
                  key={m.id}
                  id={`module-${m.id}`}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropIndex(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = project.modules.findIndex((x) => x.id === dragId);
                    if (from >= 0 && dropIndex !== null) moveModule(from, dropIndex > from ? dropIndex - 1 : dropIndex);
                    setDragId(null);
                    setDropIndex(null);
                  }}
                  className={`relative rounded-xl border transition-all ${open ? 'border-violet-400/40 bg-violet-400/[0.04]' : 'border-white/10 bg-white/[0.02]'} ${dragId === m.id ? 'opacity-40' : ''} ${m.hidden ? 'opacity-60' : ''}`}
                >
                  {dropIndex === i && <span className="absolute -top-1.5 left-2 right-2 h-0.5 rounded-full bg-violet-400" />}
                  {dropIndex === i + 1 && i === project.modules.length - 1 && <span className="absolute -bottom-1.5 left-2 right-2 h-0.5 rounded-full bg-violet-400" />}
                  <div className="flex items-center gap-2 px-2 py-2">
                    <span
                      draggable
                      onDragStart={(e) => {
                        setDragId(m.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', m.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropIndex(null);
                      }}
                      className="grid h-8 w-6 cursor-grab place-items-center text-slate-500 active:cursor-grabbing"
                      aria-hidden="true"
                      title="Ziehen zum Sortieren"
                    >
                      ⋮⋮
                    </span>
                    <button type="button" onClick={() => setOpenId(open ? null : m.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-400/15 text-violet-200">
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">
                          {def.label}
                          {m.title && m.type !== 'header' ? <span className="font-normal text-slate-400"> · {m.title}</span> : null}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">{moduleSummary(m)}</span>
                      </span>
                      <ChevronDown size={16} className={`ml-auto shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="flex shrink-0 items-center">
                      <button type="button" onClick={() => moveModule(i, i - 1)} disabled={i === 0} aria-label={`${def.label} nach oben`} className="grid h-8 w-7 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20">
                        <ChevronDown size={15} className="rotate-180" />
                      </button>
                      <button type="button" onClick={() => moveModule(i, i + 1)} disabled={i === project.modules.length - 1} aria-label={`${def.label} nach unten`} className="grid h-8 w-7 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20">
                        <ChevronDown size={15} />
                      </button>
                      <button type="button" onClick={() => updateModule({ ...m, hidden: !m.hidden })} aria-label={m.hidden ? `${def.label} einblenden` : `${def.label} ausblenden`} className="grid h-8 w-7 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white">
                        {m.hidden ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => commit((p) => {
                          const list = [...p.modules];
                          list.splice(i + 1, 0, cloneModule(m));
                          return { ...p, modules: list };
                        })}
                        aria-label={`${def.label} duplizieren`}
                        className="grid h-8 w-7 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white"
                      >
                        <CopyIcon size={14} />
                      </button>
                      <button type="button" onClick={() => removeModule(m.id)} aria-label={`${def.label} entfernen`} className="grid h-8 w-7 place-items-center rounded text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </div>
                  <div className={`grid transition-[grid-template-rows] duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      {open && (
                        <div className="border-t border-white/5 p-4">
                          <div className="mb-4 flex flex-wrap items-center gap-2">
                            <div role="tablist" aria-label="Modul bearbeiten" className="inline-flex rounded-lg border border-white/10 p-0.5">
                              {(
                                [
                                  ['content', 'Inhalt'],
                                  ['style', 'Stil'],
                                ] as const
                              ).map(([k, l]) => (
                                <button key={k} type="button" role="tab" aria-selected={moduleTab === k} onClick={() => setModuleTab(k)} className={`rounded-md px-3 py-1 text-xs ${moduleTab === k ? 'bg-violet-500 font-semibold text-white' : 'text-slate-400 hover:text-white'}`}>
                                  {l}
                                </button>
                              ))}
                            </div>
                            {moduleTab === 'style' && (
                              <span className="flex flex-wrap gap-1 text-[11px]">
                                <button type="button" onClick={() => setStyleClipboard(m.style ?? {})} className="rounded-md border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/5">
                                  Stil kopieren
                                </button>
                                <button type="button" disabled={!styleClipboard} onClick={() => styleClipboard && updateModule({ ...m, style: { ...styleClipboard } } as BioModule)} className="rounded-md border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/5 disabled:opacity-30">
                                  Stil einfügen
                                </button>
                                <button type="button" disabled={!m.style} onClick={() => updateModule({ ...m, style: undefined, align: undefined } as BioModule)} className="rounded-md border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/5 disabled:opacity-30">
                                  Zurücksetzen
                                </button>
                              </span>
                            )}
                          </div>
                          {moduleTab === 'content' ? <ModuleEditor module={m} onChange={updateModule} /> : <StyleEditor module={m} onChange={updateModule} />}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            {project.modules.length === 0 && <li className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">Noch keine Module – füge unten dein erstes hinzu.</li>}
          </ol>

          <div className="mt-4">
            {palette ? (
              <div className="rounded-2xl border border-violet-400/25 bg-slate-950/40 p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-white">Modul hinzufügen{openId ? ' (unter dem geöffneten Modul)' : ''}</p>
                  <button type="button" onClick={() => setPalette(false)} aria-label="Schließen" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-white/10">
                    <XIcon size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MODULE_CATALOG.map((d) => {
                    const Icon = d.icon;
                    return (
                      <button key={d.type} type="button" onClick={() => insertModule(createModule(d.type as ModuleType))} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-400/[0.06]">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-400/15 text-violet-200">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-white">{d.label}</span>
                          <span className="block text-[10px] leading-snug text-slate-500">{d.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setPalette(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-400/30 py-3 text-sm font-medium text-violet-200 transition-colors hover:border-violet-400/60 hover:bg-violet-400/[0.05]">
                <PlusIcon size={18} /> Modul hinzufügen
              </button>
            )}
          </div>
        </Panel>
      </div>

      {/* ---------- Ergebnis ---------- */}
      <div className="xl:sticky xl:top-24 xl:self-start">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl xl:h-[calc(100dvh-8rem)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
            <div role="tablist" className="flex gap-1">
              {(
                [
                  ['preview', 'Vorschau'],
                  ['html', 'HTML'],
                  ['checks', `Prüfung${errors ? ` (${errors})` : ''}`],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${tab === id ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:text-white'} ${id === 'checks' && errors ? 'text-rose-300' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copy}
              disabled={errors > 0}
              title={errors ? 'Bitte zuerst die Regelverstöße beheben' : 'Einzeiler in die Zwischenablage kopieren'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${copied ? 'bg-emerald-400/20 text-emerald-200' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'}`}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? 'Kopiert!' : 'Für Chaturbate kopieren'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-1.5 text-[11px]">
            <span className={`inline-flex items-center gap-1.5 ${compatOk ? 'text-emerald-300' : 'text-rose-300'}`}>
              {compatOk ? <CheckIcon size={12} /> : <AlertIcon size={12} />}
              {compatOk ? 'Chaturbate-kompatibel' : 'Nicht kompatibel'} · {html.length.toLocaleString('de-DE')} Zeichen · {preset.name}
            </span>
            {tab === 'preview' && (
              <span className="flex gap-1">
                {(['desktop', 'mobile'] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDevice(d)} className={`rounded px-2 py-0.5 ${device === d ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
                    {d === 'desktop' ? 'Desktop' : 'Mobil'}
                  </button>
                ))}
                <button type="button" onClick={() => setPageDark((v) => !v)} className="rounded px-2 py-0.5 text-slate-500 hover:text-white">
                  {pageDark ? 'Dunkle Seite' : 'Helle Seite'}
                </button>
              </span>
            )}
          </div>

          <div className="min-h-[520px] flex-1 overflow-auto bg-black/20">
            {tab === 'preview' && (
              <div className={`mx-auto h-full transition-all duration-300 ${device === 'mobile' ? 'max-w-[390px] py-3' : 'max-w-[952px]'}`}>
                <iframe title="Vorschau der Chaturbate-Bio" sandbox="" srcDoc={previewDoc} className={`block h-full min-h-[520px] w-full bg-white ${device === 'mobile' ? 'rounded-2xl border border-white/15' : ''}`} />
              </div>
            )}
            {tab === 'html' && (
              <div className="p-4">
                <p className="mb-2 text-[11px] text-slate-400">
                  Der Code ist ein <b className="text-white">Einzeiler</b> – genau so in das „About Me“-Feld einfügen, ohne Zeilenumbrüche hinzuzufügen.
                </p>
                <pre className="whitespace-pre-wrap break-all rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-slate-300">{html}</pre>
                <button
                  type="button"
                  onClick={() => downloadBlob(new Blob([html], { type: 'text/plain;charset=utf-8' }), 'chaturbate-bio.txt')}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:underline"
                >
                  <DownloadIcon size={13} /> Als .txt speichern
                </button>
              </div>
            )}
            {tab === 'checks' && (
              <div className="space-y-5 p-4">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Technik (Chaturbate-Sanitizer)</h3>
                  <ul className="space-y-1.5">
                    {compat.map((c) => (
                      <CheckRow key={c.id} ok={c.ok} title={c.label} hint={c.detail} />
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Inhalt {errors ? `· ${errors} Verstoß${errors > 1 ? 'e' : ''}` : warnings ? `· ${warnings} Hinweis${warnings > 1 ? 'e' : ''}` : ''}
                  </h3>
                  <ul className="space-y-1.5">
                    <CheckRow ok={!underage} title="Mindestalter 18 Jahre" hint="Im Steckbrief ist ein Alter unter 18 eingetragen." />
                    {ruleResults.map((r) => (
                      <CheckRow key={r.rule.id} ok={!r.matches.length} warning={r.rule.severity === 'warning'} title={r.rule.title} hint={r.matches.length ? `${r.rule.hint} Gefunden: ${r.matches.slice(0, 4).join(', ')}` : undefined} />
                    ))}
                  </ul>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Die Inhaltsprüfung basiert auf bekannten Chaturbate-Regeln und ersetzt nicht die offiziellen Richtlinien. Bilder müssen öffentlich per https erreichbar sein. Max. Breite: {MAX_WIDTH}px.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function CheckRow({ ok, title, hint, warning = false }: { ok: boolean; title: string; hint?: string; warning?: boolean }) {
  const tone = ok ? 'bg-emerald-400/10 text-emerald-300' : warning ? 'bg-amber-400/10 text-amber-200' : 'bg-rose-500/10 text-rose-300';
  return (
    <li className="flex gap-2.5 text-sm">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${tone}`}>{ok ? <CheckIcon size={12} /> : <AlertIcon size={12} />}</span>
      <span className="min-w-0">
        <span className={ok ? 'text-slate-300' : 'font-medium text-white'}>{title}</span>
        {!ok && hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </li>
  );
}
