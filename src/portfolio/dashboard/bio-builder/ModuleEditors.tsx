import { useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, PlusIcon, SparkleIcon, TrashIcon, XIcon } from '../../icons';
import { uid } from '../../lib/localStore';
import { isHttpsUrl } from './renderChaturbate';
import { FONTS, type FontId } from './themes';
import type { Align, BioModule, BoxStyle, Row } from './types';

export const builderInput =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-violet-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-violet-400/10';

export function Field({ label, children, hint, warn, htmlFor }: { label: string; children: ReactNode; hint?: string; warn?: string | null; htmlFor?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
      {warn ? <p className="mt-1 text-[11px] text-amber-300">{warn}</p> : hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

const urlWarn = (v: string) => (v.trim() && !isHttpsUrl(v) ? 'Nur vollständige https://-Links werden übernommen.' : null);

/** Schrift-Auswahl gruppiert nach Art – jede Option in ihrer eigenen Schrift. */
export function FontSelect({ value, onChange, id, allowTheme = true }: { value: FontId | undefined; onChange: (v: FontId | undefined) => void; id?: string; allowTheme?: boolean }) {
  const groups = [...new Set(Object.values(FONTS).map((f) => f.group))];
  return (
    <select id={id} className={builderInput} value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as FontId | undefined)} style={value ? { fontFamily: FONTS[value].css } : undefined}>
      {allowTheme && (
        <option value="" className="bg-slate-900">
          Wie Design
        </option>
      )}
      {groups.map((g) => (
        <optgroup key={g} label={g} className="bg-slate-900">
          {(Object.keys(FONTS) as FontId[])
            .filter((f) => FONTS[f].group === g)
            .map((f) => (
              <option key={f} value={f} style={{ fontFamily: FONTS[f].css }} className="bg-slate-900">
                {FONTS[f].label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Farbwähler mit „zurücksetzen“ (leer = Theme-Farbe). */
export function ColorPick({ value, onChange, label, fallback = '#ffffff' }: { value: string | undefined; onChange: (v: string | undefined) => void; label: string; fallback?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <input type="color" aria-label={label} title={label} value={value ?? fallback} onChange={(e) => onChange(e.target.value)} className={`h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent ${value ? '' : 'opacity-40'}`} />
      {value && (
        <button type="button" onClick={() => onChange(undefined)} aria-label={`${label} zurücksetzen`} title="Wie Design" className="grid h-5 w-5 place-items-center rounded-full text-slate-500 hover:bg-white/10 hover:text-white">
          <XIcon size={11} />
        </button>
      )}
    </span>
  );
}

/* ---------- Rich-Text-Feld mit Werkzeugleiste ---------- */

const QUICK_EMOJIS = ['🔥', '💎', '👑', '❤️', '✨', '🎁', '⚡', '🎯', '💬', '🎉', '💋', '🌈'];

export function RichTextArea({ value, onChange, rows = 4, placeholder, id, maxLength = 3000 }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; id?: string; maxLength?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [color, setColor] = useState('#ff5a1f');
  const [mark, setMark] = useState('#ffe600');
  const [emojiOpen, setEmojiOpen] = useState(false);

  const wrap = (open: string, close: string, placeholderText = 'Text') => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e) || placeholderText;
    const next = value.slice(0, s) + open + selected + close + value.slice(e);
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + open.length, s + open.length + selected.length);
    });
  };
  const insert = (str: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    onChange((value.slice(0, s) + str + value.slice(e)).slice(0, maxLength));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + str.length, s + str.length);
    });
  };

  const btn = 'grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white';
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-violet-400/60">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/5 px-1.5 py-1" role="toolbar" aria-label="Textformatierung">
        <button type="button" className={`${btn} font-bold`} onClick={() => wrap('[b]', '[/b]')} title="Fett" aria-label="Fett">B</button>
        <button type="button" className={`${btn} italic`} onClick={() => wrap('[i]', '[/i]')} title="Kursiv" aria-label="Kursiv">I</button>
        <button type="button" className={`${btn} underline`} onClick={() => wrap('[u]', '[/u]')} title="Unterstrichen" aria-label="Unterstrichen">U</button>
        <button type="button" className={`${btn} line-through`} onClick={() => wrap('[s]', '[/s]')} title="Durchgestrichen" aria-label="Durchgestrichen">S</button>
        <button type="button" className={`${btn} text-[11px] font-bold`} onClick={() => wrap('[gross]', '[/gross]')} title="Großbuchstaben" aria-label="Großbuchstaben">AA</button>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <span className="inline-flex items-center">
          <button type="button" className={btn} onClick={() => wrap(`[farbe=${color}]`, '[/farbe]')} title="Textfarbe" aria-label="Textfarbe">
            <span className="font-bold" style={{ color, textShadow: '0 0 1px #000' }}>A</span>
          </button>
          <input type="color" aria-label="Farbe für Textfarbe" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-5 cursor-pointer border-0 bg-transparent" />
        </span>
        <span className="inline-flex items-center">
          <button type="button" className={btn} onClick={() => wrap(`[mark=${mark}]`, '[/mark]')} title="Markieren" aria-label="Markieren">
            <span className="rounded px-1 text-xs font-bold text-slate-900" style={{ background: mark }}>ab</span>
          </button>
          <input type="color" aria-label="Farbe für Markierung" value={mark} onChange={(e) => setMark(e.target.value)} className="h-6 w-5 cursor-pointer border-0 bg-transparent" />
        </span>
        <select aria-label="Schriftgröße" className="h-8 rounded-md bg-transparent px-1 text-xs text-slate-300 hover:bg-white/10" value="" onChange={(e) => e.target.value && wrap(`[groesse=${e.target.value}]`, '[/groesse]')}>
          <option value="" className="bg-slate-900">Größe</option>
          {[11, 13, 15, 18, 22, 28, 36, 48].map((n) => (
            <option key={n} value={n} className="bg-slate-900">
              {n}px
            </option>
          ))}
        </select>
        <button type="button" className={btn} onClick={() => wrap(`[glow=${color}]`, '[/glow]')} title="Leuchten (in Textfarbe)" aria-label="Leuchten">
          <span style={{ textShadow: `0 0 6px ${color}` }}>✦</span>
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const href = window.prompt('Link-Adresse (https://…)', 'https://');
            if (href && isHttpsUrl(href)) wrap(`[link=${href.trim()}]`, '[/link]', 'Linktext');
          }}
          title="Link einfügen"
          aria-label="Link einfügen"
        >
          🔗
        </button>
        <span className="relative">
          <button type="button" className={btn} onClick={() => setEmojiOpen((v) => !v)} title="Emoji" aria-label="Emoji einfügen" aria-expanded={emojiOpen}>
            😊
          </button>
          {emojiOpen && (
            <span className="absolute left-0 top-9 z-10 grid w-48 grid-cols-6 gap-1 rounded-xl border border-white/10 bg-[#0b0f18] p-2 shadow-xl">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} type="button" className="rounded p-1 text-lg hover:bg-white/10" onClick={() => (insert(e), setEmojiOpen(false))}>
                  {e}
                </button>
              ))}
            </span>
          )}
        </span>
        <span className="flex-1" />
        <button type="button" className={`${btn} text-[11px]`} onClick={() => onChange(value.replace(/\[\/?(b|i|u|s|gross|farbe|mark|glow|groesse|link)(=[^\]]*)?\]/gi, ''))} title="Formatierung entfernen">
          Tx
        </button>
      </div>
      <textarea id={id} ref={ref} rows={rows} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="block w-full resize-y bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
    </div>
  );
}

/* ---------- Generische Listen ---------- */

interface ColumnDef<T> {
  key: keyof T & string;
  placeholder: string;
  type?: 'text' | 'number' | 'url';
  className?: string;
}

function MoveButtons({ i, len, move }: { i: number; len: number; move: (i: number, d: -1 | 1) => void }) {
  return (
    <div className="flex shrink-0 flex-col">
      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben" className="grid h-5 w-6 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20">
        <ChevronDown size={14} className="rotate-180" />
      </button>
      <button type="button" onClick={() => move(i, 1)} disabled={i === len - 1} aria-label="Nach unten" className="grid h-5 w-6 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20">
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

function useListOps<T extends Row>(items: T[], onChange: (items: T[]) => void) {
  return {
    move: (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= items.length) return;
      const next = [...items];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    },
    remove: (id: string) => onChange(items.filter((x) => x.id !== id)),
  };
}

const coerce = (type: string | undefined, value: string) => (type === 'number' ? Number(value.replace(/\D/g, '').slice(0, 7)) : value);

function ListEditor<T extends Row>({ items, onChange, columns, create, addLabel, max = 40 }: { items: T[]; onChange: (items: T[]) => void; columns: ColumnDef<T>[]; create: () => T; addLabel: string; max?: number }) {
  const { move, remove } = useListOps(items, onChange);
  const update = (id: string, key: keyof T, value: string) => onChange(items.map((x) => (x.id === id ? { ...x, [key]: coerce(columns.find((c) => c.key === key)?.type, value) } : x)));
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.id} className="flex items-start gap-1.5">
          <MoveButtons i={i} len={items.length} move={move} />
          <div className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: columns.map((c) => (c.type === 'number' ? '5.5rem' : c.className ?? '1fr')).join(' ') }}>
            {columns.map((c) => {
              const value = String(item[c.key] ?? '');
              return (
                <input
                  key={c.key}
                  aria-label={c.placeholder}
                  inputMode={c.type === 'number' ? 'numeric' : undefined}
                  type={c.type === 'url' ? 'url' : 'text'}
                  className={`${builderInput} ${c.type === 'url' && urlWarn(value) ? 'border-amber-300/50' : ''}`}
                  value={c.type === 'number' && value === '0' ? '' : value}
                  placeholder={c.placeholder}
                  onChange={(e) => update(item.id, c.key, e.target.value)}
                />
              );
            })}
          </div>
          <button type="button" onClick={() => remove(item.id)} aria-label="Eintrag entfernen" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300">
            <TrashIcon size={15} />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, create()])} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-violet-400/50 hover:text-violet-200">
          <PlusIcon size={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

interface CardField<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'number' | 'url' | 'rich';
  span?: 1 | 2;
}

/** Listen mit vielen Feldern pro Eintrag – als kleine Karten. */
function CardListEditor<T extends Row>({ items, onChange, fields, create, addLabel, itemLabel, max = 20 }: { items: T[]; onChange: (items: T[]) => void; fields: CardField<T>[]; create: () => T; addLabel: string; itemLabel: string; max?: number }) {
  const { move, remove } = useListOps(items, onChange);
  const update = (id: string, key: keyof T, value: string) => onChange(items.map((x) => (x.id === id ? { ...x, [key]: coerce(fields.find((f) => f.key === key)?.type, value) } : x)));
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <MoveButtons i={i} len={items.length} move={move} />
            <span className="flex-1 text-xs font-semibold text-slate-300">
              {itemLabel} {i + 1}
            </span>
            <button type="button" onClick={() => remove(item.id)} aria-label={`${itemLabel} ${i + 1} entfernen`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">
              <TrashIcon size={14} />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => {
              const value = String(item[f.key] ?? '');
              return (
                <div key={f.key} className={f.span === 2 || f.type === 'rich' ? 'sm:col-span-2' : ''}>
                  {f.type === 'rich' ? (
                    <Field label={f.label}>
                      <RichTextArea value={value} rows={2} onChange={(v) => update(item.id, f.key, v)} />
                    </Field>
                  ) : (
                    <Field label={f.label} warn={f.type === 'url' ? urlWarn(value) : null}>
                      <input aria-label={f.label} type={f.type === 'url' ? 'url' : 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined} className={builderInput} value={value} onChange={(e) => update(item.id, f.key, e.target.value)} placeholder={f.type === 'url' ? 'https://…' : ''} />
                    </Field>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, create()])} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-violet-400/50 hover:text-violet-200">
          <PlusIcon size={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

function Segment<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-white/10 p-0.5">
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={`rounded-md px-2.5 py-1 text-xs ${value === v ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:text-white'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

/* ---------- Inhalt eines Moduls ---------- */

const SUGGESTIONS = [
  'Hey, schön dass du da bist! 👋 Ich bin [b]gesprächig[/b], entspannt und immer für einen Spaß zu haben. Schreib mir gern im Chat!',
  'Willkommen in meinem Raum ✨ Hier geht es um [farbe=#ff5a1f]gute Laune[/farbe], ehrliche Gespräche und eine entspannte Atmosphäre.',
  'Hi! Ich freue mich über jeden, der vorbeischaut. Erzähl mir von deinem Tag – ich höre gern zu 😊',
  'Hey there! 👋 Thanks for stopping by. I love chatting, good music and making new friends. [b]Say hi in chat![/b]',
  'Welcome to my room ✨ Relax, have fun and be kind – that’s all I ask. [u]Don’t forget to follow![/u]',
];

export function ModuleEditor({ module: m, onChange }: { module: BioModule; onChange: (m: BioModule) => void }) {
  const id = useId();
  const [suggestion, setSuggestion] = useState(0);
  const set = (key: string, value: unknown) => onChange({ ...m, [key]: value } as BioModule);
  const row = () => ({ id: uid('r-') });
  const hasTitle = !['header', 'marquee', 'divider'].includes(m.type);

  const head = hasTitle && (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Etikett (klein, über der Überschrift)" htmlFor={`${id}-eyebrow`}>
        <input id={`${id}-eyebrow`} className={builderInput} value={m.eyebrow ?? ''} onChange={(e) => set('eyebrow', e.target.value)} placeholder="z. B. ROOM HALL OF FAME" />
      </Field>
      <Field label="Überschrift" htmlFor={`${id}-title`}>
        <input id={`${id}-title`} className={builderInput} value={m.title} onChange={(e) => set('title', e.target.value)} placeholder="Optional – Emojis erlaubt 🔥" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Untertitel" htmlFor={`${id}-sub`}>
          <input id={`${id}-sub`} className={builderInput} value={m.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Optional – Formatierung wie [b]fett[/b] möglich" />
        </Field>
      </div>
    </div>
  );

  let specific: ReactNode = null;
  switch (m.type) {
    case 'header':
      specific = (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor={`${id}-name`}>
            <input id={`${id}-name`} className={builderInput} value={m.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label={`Namensgröße: ${m.nameSize ?? 46}px`} htmlFor={`${id}-ns`}>
            <input id={`${id}-ns`} type="range" min={20} max={80} value={m.nameSize ?? 46} onChange={(e) => set('nameSize', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Slogan" htmlFor={`${id}-tag`}>
              <RichTextArea id={`${id}-tag`} rows={2} value={m.tagline} onChange={(v) => set('tagline', v)} />
            </Field>
          </div>
          <Field label="Etikett (über dem Namen)" htmlFor={`${id}-eb`}>
            <input id={`${id}-eb`} className={builderInput} value={m.eyebrow ?? ''} onChange={(e) => set('eyebrow', e.target.value)} placeholder="z. B. HAMBURG • 24 Y/O" />
          </Field>
          <Field label="Banner-Bild (URL)" warn={urlWarn(m.bannerUrl)} hint="Breites Bild, z. B. 1200 × 400" htmlFor={`${id}-banner`}>
            <input id={`${id}-banner`} type="url" className={builderInput} value={m.bannerUrl} onChange={(e) => set('bannerUrl', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Profilbild (URL)" warn={urlWarn(m.avatarUrl)} hint="Quadratisch, wird rund dargestellt" htmlFor={`${id}-avatar`}>
            <input id={`${id}-avatar`} type="url" className={builderInput} value={m.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-violet-400" checked={!!m.nameOnBanner} onChange={(e) => set('nameOnBanner', e.target.checked)} />
            Name groß über das Banner legen
          </label>
        </div>
      );
      break;
    case 'facts':
      specific = <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), label: '', value: '' })} addLabel="Info hinzufügen" columns={[{ key: 'label', placeholder: 'Bezeichnung', className: '0.8fr' }, { key: 'value', placeholder: 'Wert' }]} />;
      break;
    case 'text':
      specific = (
        <Field label="Text" htmlFor={`${id}-text`}>
          <RichTextArea id={`${id}-text`} rows={6} value={m.text} onChange={(v) => set('text', v)} placeholder="Schreib etwas über dich …" />
          <div className="mt-1 flex items-center justify-between">
            <button type="button" onClick={() => (set('text', SUGGESTIONS[suggestion % SUGGESTIONS.length]), setSuggestion((s) => s + 1))} className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline">
              <SparkleIcon size={12} /> Textvorschlag einfügen
            </button>
            <span className="text-[11px] text-slate-500">Text markieren und Werkzeug anklicken</span>
          </div>
        </Field>
      );
      break;
    case 'image':
      specific = (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bild-URL" warn={urlWarn(m.url)} htmlFor={`${id}-url`}>
            <input id={`${id}-url`} type="url" className={builderInput} value={m.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…/bild.jpg" />
          </Field>
          <Field label="Link beim Klick (optional)" warn={urlWarn(m.link)} htmlFor={`${id}-link`}>
            <input id={`${id}-link`} type="url" className={builderInput} value={m.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Bildunterschrift" htmlFor={`${id}-cap`}>
            <input id={`${id}-cap`} className={builderInput} value={m.caption} onChange={(e) => set('caption', e.target.value)} />
          </Field>
          <Field label="Alternativtext" htmlFor={`${id}-alt`}>
            <input id={`${id}-alt`} className={builderInput} value={m.alt} onChange={(e) => set('alt', e.target.value)} placeholder="Beschreibung des Bildes" />
          </Field>
          <Field label={`Breite: ${m.width} %`} htmlFor={`${id}-w`}>
            <input id={`${id}-w`} type="range" min={20} max={100} step={5} value={m.width} onChange={(e) => set('width', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
        </div>
      );
      break;
    case 'gallery':
      specific = (
        <div className="space-y-3">
          <Segment label="Spalten" value={m.columns} onChange={(v) => set('columns', v)} options={[[2, '2 Spalten'], [3, '3 Spalten'], [4, '4 Spalten']]} />
          <ListEditor items={m.images} onChange={(v) => set('images', v)} create={() => ({ ...row(), url: '', link: '' })} addLabel="Bild hinzufügen" max={16} columns={[{ key: 'url', placeholder: 'Bild-URL (https://…)', type: 'url' }, { key: 'link', placeholder: 'Link (optional)', type: 'url', className: '0.7fr' }]} />
        </div>
      );
      break;
    case 'tipMenu':
      specific = (
        <div className="space-y-3">
          <ListEditor
            items={m.items}
            onChange={(v) => set('items', v)}
            create={() => ({ ...row(), emoji: '⭐', label: '', tokens: 0, category: m.items[m.items.length - 1]?.category ?? '' })}
            addLabel="Aktion hinzufügen"
            max={60}
            columns={[{ key: 'category', placeholder: 'Kategorie', className: '0.9fr' }, { key: 'emoji', placeholder: 'Emoji', className: '3rem' }, { key: 'label', placeholder: 'Aktion' }, { key: 'tokens', placeholder: 'Tokens', type: 'number' }]}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Segment label="Spalten" value={m.columns ?? 1} onChange={(v) => set('columns', v)} options={[[1, '1 Spalte'], [2, '2 Spalten']]} />
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" className="h-4 w-4 accent-violet-400" checked={m.sortByPrice} onChange={(e) => set('sortByPrice', e.target.checked)} />
              Nach Preis sortieren
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              Hervorheben ab
              <input inputMode="numeric" className={`${builderInput} w-20`} value={m.highlightFrom || ''} placeholder="aus" onChange={(e) => set('highlightFrom', Number(e.target.value.replace(/\D/g, '').slice(0, 6)))} />
              TK
            </label>
          </div>
          <p className="text-[11px] text-slate-500">Gleiche Kategorie = gemeinsame Gruppe mit Zwischenüberschrift (z. B. „01 // Chat &amp; Basics“).</p>
        </div>
      );
      break;
    case 'wishList':
      specific = <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), label: '', link: '' })} addLabel="Wunsch hinzufügen" columns={[{ key: 'label', placeholder: 'Wunsch' }, { key: 'link', placeholder: 'Link (optional)', type: 'url', className: '0.8fr' }]} />;
      break;
    case 'schedule':
      specific = (
        <div className="space-y-3">
          <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), day: '', time: '' })} addLabel="Termin hinzufügen" columns={[{ key: 'day', placeholder: 'Tag' }, { key: 'time', placeholder: 'Uhrzeit', className: '0.7fr' }]} />
          <Field label="Hinweis" htmlFor={`${id}-note`}>
            <input id={`${id}-note`} className={builderInput} value={m.note} onChange={(e) => set('note', e.target.value)} />
          </Field>
        </div>
      );
      break;
    case 'goal':
      specific = (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Field label="Beschreibung">
              <RichTextArea rows={2} value={m.text} onChange={(v) => set('text', v)} />
            </Field>
          </div>
          <Field label="Aktuell" htmlFor={`${id}-cur`}>
            <input id={`${id}-cur`} inputMode="numeric" className={builderInput} value={m.current} onChange={(e) => set('current', Number(e.target.value.replace(/\D/g, '').slice(0, 7)))} />
          </Field>
          <Field label="Ziel" htmlFor={`${id}-tgt`}>
            <input id={`${id}-tgt`} inputMode="numeric" className={builderInput} value={m.target} onChange={(e) => set('target', Number(e.target.value.replace(/\D/g, '').slice(0, 7)))} />
          </Field>
          <Field label="Einheit" htmlFor={`${id}-unit`}>
            <input id={`${id}-unit`} className={builderInput} value={m.unit} onChange={(e) => set('unit', e.target.value.slice(0, 10))} />
          </Field>
        </div>
      );
      break;
    case 'rules':
      specific = (
        <div className="space-y-3">
          <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), text: '' })} addLabel="Regel hinzufügen" columns={[{ key: 'text', placeholder: 'Regel' }]} />
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-violet-400" checked={m.numbered} onChange={(e) => set('numbered', e.target.checked)} />
            Nummerieren
          </label>
        </div>
      );
      break;
    case 'links':
      specific = (
        <div className="space-y-3">
          <Segment label="Button-Stil" value={m.variant ?? 'pill'} onChange={(v) => set('variant', v)} options={[['cta', 'Großer Button'], ['pill', 'Pillen'], ['chips', 'Chips'], ['outline', 'Umrandet']]} />
          <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), label: '', url: '' })} addLabel="Button hinzufügen" max={12} columns={[{ key: 'label', placeholder: 'Beschriftung', className: '0.8fr' }, { key: 'url', placeholder: 'https://…', type: 'url' }]} />
        </div>
      );
      break;
    case 'marquee':
      specific = (
        <div className="space-y-3">
          <Field label="Text">
            <RichTextArea rows={2} value={m.text} onChange={(v) => set('text', v)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Tempo: ${m.speed}`} htmlFor={`${id}-speed`}>
              <input id={`${id}-speed`} type="range" min={1} max={20} value={m.speed} onChange={(e) => set('speed', Number(e.target.value))} className="w-full accent-violet-400" />
            </Field>
            <Field label="Richtung">
              <Segment label="Richtung" value={m.direction} onChange={(v) => set('direction', v)} options={[['left', '← Links'], ['right', 'Rechts →']]} />
            </Field>
          </div>
        </div>
      );
      break;
    case 'divider':
      specific = <Segment label="Trenner" value={m.look} onChange={(v) => set('look', v)} options={[['line', 'Linie'], ['dots', '• • •'], ['hearts', '♥ ♥ ♥'], ['stars', '✦ ✦ ✦'], ['space', 'Abstand']]} />;
      break;
    case 'ranking':
      specific = (
        <div className="space-y-3">
          <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), label: '', name: '', value: '' })} addLabel="Platz hinzufügen" max={15} columns={[{ key: 'label', placeholder: 'Etikett (z. B. #1 King)', className: '1fr' }, { key: 'name', placeholder: 'Name' }, { key: 'value', placeholder: 'Wert', className: '0.6fr' }]} />
          <Field label="Hinweis darunter">
            <RichTextArea rows={2} value={m.footer} onChange={(v) => set('footer', v)} />
          </Field>
        </div>
      );
      break;
    case 'features':
      specific = (
        <div className="space-y-3">
          <Segment label="Spalten" value={m.columns} onChange={(v) => set('columns', v)} options={[[1, '1 Spalte'], [2, '2 Spalten'], [3, '3 Spalten']]} />
          <CardListEditor items={m.items} onChange={(v) => set('items', v)} itemLabel="Karte" addLabel="Karte hinzufügen" create={() => ({ ...row(), emoji: '⭐', title: '', text: '' })} fields={[{ key: 'emoji', label: 'Emoji' }, { key: 'title', label: 'Titel' }, { key: 'text', label: 'Text', type: 'rich' }]} />
        </div>
      );
      break;
    case 'chips':
      specific = <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), emoji: '', label: '', link: '' })} addLabel="Chip hinzufügen" max={40} columns={[{ key: 'emoji', placeholder: 'Emoji', className: '3rem' }, { key: 'label', placeholder: 'Beschriftung' }, { key: 'link', placeholder: 'Link (optional)', type: 'url', className: '0.9fr' }]} />;
      break;
    case 'products':
      specific = (
        <div className="space-y-3">
          <Segment label="Spalten" value={m.columns} onChange={(v) => set('columns', v)} options={[[1, '1 Spalte'], [2, '2 Spalten'], [3, '3 Spalten']]} />
          <CardListEditor
            items={m.items}
            onChange={(v) => set('items', v)}
            itemLabel="Produkt"
            addLabel="Produkt hinzufügen"
            max={9}
            create={() => ({ ...row(), brand: '', badge: '', title: '', text: '', button: 'Zum Angebot', url: '' })}
            fields={[{ key: 'brand', label: 'Marke' }, { key: 'badge', label: 'Plakette' }, { key: 'title', label: 'Titel', span: 2 }, { key: 'text', label: 'Beschreibung', type: 'rich' }, { key: 'button', label: 'Button-Text' }, { key: 'url', label: 'Link', type: 'url' }]}
          />
        </div>
      );
      break;
    case 'levels':
      specific = (
        <div className="space-y-3">
          <Field label={`Anzahl Balken: ${m.maxLevel}`} htmlFor={`${id}-max`}>
            <input id={`${id}-max`} type="range" min={3} max={12} value={m.maxLevel} onChange={(e) => set('maxLevel', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
          <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), label: '', level: 1, info: '' })} addLabel="Stufe hinzufügen" max={12} columns={[{ key: 'label', placeholder: 'Bezeichnung' }, { key: 'level', placeholder: 'Level', type: 'number' }, { key: 'info', placeholder: 'Info rechts', className: '0.8fr' }]} />
          <Field label="Tipp-Box darunter">
            <RichTextArea rows={2} value={m.tip} onChange={(v) => set('tip', v)} />
          </Field>
        </div>
      );
      break;
    case 'cards':
      specific = (
        <div className="space-y-3">
          <Field label="Hinweis über den Karten" htmlFor={`${id}-hint`}>
            <input id={`${id}-hint`} className={builderInput} value={m.hint} onChange={(e) => set('hint', e.target.value)} />
          </Field>
          <CardListEditor
            items={m.items}
            onChange={(v) => set('items', v)}
            itemLabel="Karte"
            addLabel="Karte hinzufügen"
            max={20}
            create={() => ({ ...row(), imageUrl: '', tag: '', price: '', title: '', button: 'Ansehen', url: '' })}
            fields={[{ key: 'imageUrl', label: 'Bild-URL', type: 'url', span: 2 }, { key: 'tag', label: 'Etikett' }, { key: 'price', label: 'Preis' }, { key: 'title', label: 'Titel', span: 2 }, { key: 'button', label: 'Button-Text' }, { key: 'url', label: 'Link', type: 'url' }]}
          />
        </div>
      );
      break;
  }

  return (
    <div className="space-y-4">
      {head}
      {specific}
      {m.type !== 'divider' && (
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-violet-400" checked={!!m.highlight} onChange={(e) => set('highlight', e.target.checked)} />
          Box mit Akzentfarbe hervorheben
        </label>
      )}
    </div>
  );
}

/* ---------- Stil einer Box ---------- */

function Toggle({ on, onClick, label, children, className = '' }: { on: boolean; onClick: () => void; label: string; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} title={label} className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm transition-colors ${on ? 'bg-violet-500 text-white' : 'text-slate-300 hover:bg-white/10'} ${className}`}>
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-white/10 p-3">
      <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-200">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

const ALIGNS: [Align, string, string][] = [
  ['left', '⇤', 'Linksbündig'],
  ['center', '↔', 'Zentriert'],
  ['right', '⇥', 'Rechtsbündig'],
  ['justify', '☰', 'Blocksatz'],
];

export function StyleEditor({ module: m, onChange }: { module: BioModule; onChange: (m: BioModule) => void }) {
  const id = useId();
  const s = m.style ?? {};
  const set = <K extends keyof BoxStyle>(key: K, value: BoxStyle[K]) => onChange({ ...m, style: { ...s, [key]: value } } as BioModule);
  const toggle = (key: 'bold' | 'italic' | 'underline' | 'strike' | 'uppercase' | 'textShadow' | 'titleUppercase' | 'titleItalic' | 'titleUnderline') => set(key, !s[key]);
  const num = (v: string, min: number, max: number) => (v === '' ? undefined : Math.max(min, Math.min(max, Number(v))));

  return (
    <div className="space-y-3">
      <Section title="Text">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1" role="toolbar" aria-label="Textstil der Box">
          <Toggle on={!!s.bold} onClick={() => toggle('bold')} label="Fett" className="font-bold">B</Toggle>
          <Toggle on={!!s.italic} onClick={() => toggle('italic')} label="Kursiv" className="italic">I</Toggle>
          <Toggle on={!!s.underline} onClick={() => toggle('underline')} label="Unterstrichen" className="underline">U</Toggle>
          <Toggle on={!!s.strike} onClick={() => toggle('strike')} label="Durchgestrichen" className="line-through">S</Toggle>
          <Toggle on={!!s.uppercase} onClick={() => toggle('uppercase')} label="Großbuchstaben" className="text-[11px] font-bold">AA</Toggle>
          <Toggle on={!!s.textShadow} onClick={() => toggle('textShadow')} label="Leuchtender Text">✦</Toggle>
          <span className="mx-1 h-5 w-px bg-white/10" />
          {ALIGNS.map(([v, icon, label]) => (
            <Toggle key={v} on={m.align === v} onClick={() => onChange({ ...m, align: m.align === v ? undefined : v } as BioModule)} label={label}>
              {icon}
            </Toggle>
          ))}
          <span className="mx-1 h-5 w-px bg-white/10" />
          <ColorPick label="Schriftfarbe" value={s.textColor} onChange={(v) => set('textColor', v)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Schriftart" htmlFor={`${id}-font`}>
            <FontSelect id={`${id}-font`} value={s.font} onChange={(v) => set('font', v)} />
          </Field>
          <Field label={`Schriftgröße: ${s.fontSize ?? 15}px`} htmlFor={`${id}-fs`}>
            <input id={`${id}-fs`} type="range" min={10} max={32} value={s.fontSize ?? 15} onChange={(e) => set('fontSize', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
          <Field label={`Zeichenabstand: ${s.letterSpacing ?? 0}px`} htmlFor={`${id}-ls`}>
            <input id={`${id}-ls`} type="range" min={0} max={8} step={0.5} value={s.letterSpacing ?? 0} onChange={(e) => set('letterSpacing', num(e.target.value, 0, 8))} className="w-full accent-violet-400" />
          </Field>
          <Field label={`Zeilenabstand: ${(s.lineHeight ?? 1.6).toFixed(1)}`} htmlFor={`${id}-lh`}>
            <input id={`${id}-lh`} type="range" min={1} max={2.4} step={0.1} value={s.lineHeight ?? 1.6} onChange={(e) => set('lineHeight', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
        </div>
      </Section>

      {!['divider', 'marquee'].includes(m.type) && (
        <Section title="Überschrift">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
            <Toggle on={!!s.titleItalic} onClick={() => toggle('titleItalic')} label="Überschrift kursiv" className="italic">I</Toggle>
            <Toggle on={!!s.titleUnderline} onClick={() => toggle('titleUnderline')} label="Überschrift unterstrichen" className="underline">U</Toggle>
            <Toggle on={!!s.titleUppercase} onClick={() => toggle('titleUppercase')} label="Überschrift in Großbuchstaben" className="text-[11px] font-bold">AA</Toggle>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <ColorPick label="Farbe der Überschrift" value={s.titleColor} onChange={(v) => set('titleColor', v)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Schriftart" htmlFor={`${id}-tfont`}>
              <FontSelect id={`${id}-tfont`} value={s.titleFont} onChange={(v) => set('titleFont', v)} />
            </Field>
            <Field label={`Größe: ${s.titleSize ?? 24}px`} htmlFor={`${id}-ts`}>
              <input id={`${id}-ts`} type="range" min={12} max={60} value={s.titleSize ?? 24} onChange={(e) => set('titleSize', Number(e.target.value))} className="w-full accent-violet-400" />
            </Field>
          </div>
        </Section>
      )}

      <Section title="Box">
        <Field label="Hintergrund">
          <div className="flex flex-wrap items-center gap-2">
            <Segment label="Hintergrund" value={s.bgMode ?? 'theme'} onChange={(v) => set('bgMode', v)} options={[['theme', 'Design'], ['solid', 'Farbe'], ['gradient', 'Verlauf'], ['transparent', 'Ohne']]} />
            {(s.bgMode === 'solid' || s.bgMode === 'gradient') && <ColorPick label="Hintergrundfarbe 1" value={s.bg1} fallback="#1a0d0d" onChange={(v) => set('bg1', v)} />}
            {s.bgMode === 'gradient' && <ColorPick label="Hintergrundfarbe 2" value={s.bg2} fallback="#3a0f0f" onChange={(v) => set('bg2', v)} />}
          </div>
          {s.bgMode === 'gradient' && (
            <input aria-label="Verlaufswinkel" type="range" min={0} max={360} step={15} value={s.bgAngle ?? 135} onChange={(e) => set('bgAngle', Number(e.target.value))} className="mt-2 w-full accent-violet-400" />
          )}
        </Field>
        <Field label="Rahmen">
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Rahmen-Position" className={`${builderInput} w-auto`} value={s.borderMode ?? 'theme'} onChange={(e) => set('borderMode', e.target.value as BoxStyle['borderMode'])}>
              <option value="theme" className="bg-slate-900">Wie Design</option>
              <option value="none" className="bg-slate-900">Kein Rahmen</option>
              <option value="all" className="bg-slate-900">Rundherum</option>
              <option value="top" className="bg-slate-900">Nur oben</option>
              <option value="left" className="bg-slate-900">Nur links</option>
              <option value="bottom" className="bg-slate-900">Nur unten</option>
            </select>
            {s.borderMode && !['theme', 'none'].includes(s.borderMode) && (
              <>
                <select aria-label="Rahmen-Stil" className={`${builderInput} w-auto`} value={s.borderStyle ?? 'solid'} onChange={(e) => set('borderStyle', e.target.value as BoxStyle['borderStyle'])}>
                  <option value="solid" className="bg-slate-900">Durchgezogen</option>
                  <option value="dashed" className="bg-slate-900">Gestrichelt</option>
                  <option value="dotted" className="bg-slate-900">Gepunktet</option>
                  <option value="double" className="bg-slate-900">Doppelt</option>
                </select>
                <input aria-label="Rahmenstärke" type="number" min={1} max={8} value={s.borderWidth ?? 2} onChange={(e) => set('borderWidth', num(e.target.value, 1, 8))} className={`${builderInput} w-16`} />
                <ColorPick label="Rahmenfarbe" value={s.borderColor} fallback="#ff5a1f" onChange={(v) => set('borderColor', v)} />
              </>
            )}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={`Ecken: ${s.radius ?? 'Design'}${s.radius !== undefined ? 'px' : ''}`} htmlFor={`${id}-r`}>
            <input id={`${id}-r`} type="range" min={0} max={40} value={s.radius ?? 18} onChange={(e) => set('radius', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
          <Field label={`Innenabstand: ${s.padding ?? 22}px`} htmlFor={`${id}-p`}>
            <input id={`${id}-p`} type="range" min={0} max={60} value={s.padding ?? 22} onChange={(e) => set('padding', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
          <Field label={`Leuchten: ${s.glow ?? 0}px`} htmlFor={`${id}-g`}>
            <div className="flex items-center gap-1">
              <input id={`${id}-g`} type="range" min={0} max={60} value={s.glow ?? 0} onChange={(e) => set('glow', Number(e.target.value))} className="w-full accent-violet-400" />
              <ColorPick label="Leuchtfarbe" value={s.glowColor} fallback="#ff5a1f" onChange={(v) => set('glowColor', v)} />
            </div>
          </Field>
        </div>
        <Field label="Akzentfarben dieser Box (Preise, Buttons, Balken)">
          <div className="flex items-center gap-3">
            <ColorPick label="Akzent 1" value={s.accent} fallback="#ff5a1f" onChange={(v) => set('accent', v)} />
            <ColorPick label="Akzent 2" value={s.accent2} fallback="#e11d2e" onChange={(v) => set('accent2', v)} />
          </div>
        </Field>
      </Section>
    </div>
  );
}
