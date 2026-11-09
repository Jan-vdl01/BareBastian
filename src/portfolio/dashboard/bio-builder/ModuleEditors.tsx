import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, PlusIcon, SparkleIcon, TrashIcon } from '../../icons';
import { uid } from '../../lib/localStore';
import { isHttpsUrl } from './renderChaturbate';
import type { Align, BioModule, Row } from './types';

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

/* ---------- Generischer Listen-Editor ---------- */

interface ColumnDef<T> {
  key: keyof T & string;
  placeholder: string;
  type?: 'text' | 'number' | 'url';
  className?: string;
}

function ListEditor<T extends Row>({ items, onChange, columns, create, addLabel, max = 30 }: { items: T[]; onChange: (items: T[]) => void; columns: ColumnDef<T>[]; create: () => T; addLabel: string; max?: number }) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const update = (id: string, key: keyof T, value: string) =>
    onChange(items.map((x) => (x.id === id ? { ...x, [key]: columns.find((c) => c.key === key)?.type === 'number' ? Number(value.replace(/\D/g, '').slice(0, 7)) : value } : x)));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.id} className="flex items-start gap-1.5">
          <div className="flex shrink-0 flex-col">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben" className="grid h-5 w-6 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20">
              <ChevronDown size={14} className="rotate-180" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Nach unten" className="grid h-5 w-6 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20">
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: columns.map((c) => (c.type === 'number' ? '5.5rem' : c.className ?? '1fr')).join(' ') }}>
            {columns.map((c) => {
              const value = String(item[c.key] ?? '');
              return (
                <div key={c.key} className="min-w-0">
                  <input
                    aria-label={c.placeholder}
                    inputMode={c.type === 'number' ? 'numeric' : undefined}
                    type={c.type === 'url' ? 'url' : 'text'}
                    className={`${builderInput} ${c.type === 'url' && urlWarn(value) ? 'border-amber-300/50' : ''}`}
                    value={c.type === 'number' && value === '0' ? '' : value}
                    placeholder={c.placeholder}
                    onChange={(e) => update(item.id, c.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => onChange(items.filter((x) => x.id !== item.id))} aria-label="Eintrag entfernen" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300">
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

/* ---------- Textvorschläge ---------- */

const SUGGESTIONS = [
  'Hey, schön dass du da bist! 👋 Ich bin gesprächig, entspannt und immer für einen Spaß zu haben. Schreib mir gern im Chat – ich freu mich auf dich!',
  'Willkommen in meinem Raum ✨ Hier geht es um gute Laune, ehrliche Gespräche und eine entspannte Atmosphäre. Bleib ein bisschen und sag Hallo!',
  'Hi! Ich bin neu hier und freue mich über jeden, der vorbeischaut. Erzähl mir von deinem Tag – ich höre gern zu 😊',
  'Hey there! 👋 Thanks for stopping by. I love chatting, good music and making new friends. Say hi in chat!',
  'Welcome to my room ✨ Relax, have fun and be kind – that’s all I ask. Don’t forget to follow!',
];

/* ---------- Modul-spezifische Felder ---------- */

export function ModuleEditor({ module: m, onChange }: { module: BioModule; onChange: (m: BioModule) => void }) {
  const id = useId();
  const [suggestion, setSuggestion] = useState(0);
  const set = <K extends string>(key: K, value: unknown) => onChange({ ...m, [key]: value } as BioModule);
  const row = () => ({ id: uid('r-') });
  const hasTitle = !['header', 'marquee', 'divider'].includes(m.type);

  const common = (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      {hasTitle ? (
        <Field label="Überschrift" htmlFor={`${id}-title`}>
          <input id={`${id}-title`} className={builderInput} value={m.title} onChange={(e) => set('title', e.target.value)} placeholder="Optional" />
        </Field>
      ) : (
        <span />
      )}
      <Field label="Ausrichtung" htmlFor={`${id}-align`}>
        <select id={`${id}-align`} className={builderInput} value={m.align ?? ''} onChange={(e) => set('align', (e.target.value || undefined) as Align | undefined)}>
          <option value="" className="bg-slate-900">Wie Design</option>
          <option value="center" className="bg-slate-900">Zentriert</option>
          <option value="left" className="bg-slate-900">Links</option>
        </select>
      </Field>
      {m.type !== 'divider' && (
        <label className="flex h-9 cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-violet-400" checked={!!m.highlight} onChange={(e) => set('highlight', e.target.checked)} />
          Hervorheben
        </label>
      )}
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
          <Field label="Slogan" htmlFor={`${id}-tag`}>
            <input id={`${id}-tag`} className={builderInput} value={m.tagline} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
          <Field label="Banner-Bild (URL)" warn={urlWarn(m.bannerUrl)} hint="Breites Bild, z. B. 1200 × 400" htmlFor={`${id}-banner`}>
            <input id={`${id}-banner`} type="url" className={builderInput} value={m.bannerUrl} onChange={(e) => set('bannerUrl', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Profilbild (URL)" warn={urlWarn(m.avatarUrl)} hint="Quadratisch, wird rund dargestellt" htmlFor={`${id}-avatar`}>
            <input id={`${id}-avatar`} type="url" className={builderInput} value={m.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      );
      break;
    case 'facts':
      specific = <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), label: '', value: '' })} addLabel="Info hinzufügen" columns={[{ key: 'label', placeholder: 'Bezeichnung', className: '0.8fr' }, { key: 'value', placeholder: 'Wert' }]} />;
      break;
    case 'text':
      specific = (
        <Field label="Text" htmlFor={`${id}-text`}>
          <textarea id={`${id}-text`} rows={5} maxLength={3000} className={`${builderInput} resize-y`} value={m.text} onChange={(e) => set('text', e.target.value)} placeholder="Schreib etwas über dich …" />
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                set('text', SUGGESTIONS[suggestion % SUGGESTIONS.length]);
                setSuggestion((s) => s + 1);
              }}
              className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline"
            >
              <SparkleIcon size={12} /> Textvorschlag einfügen
            </button>
            <span className="text-[11px] text-slate-500">{m.text.length} Zeichen · Zeilenumbrüche werden übernommen</span>
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
          <Field label="Spalten">
            <div className="inline-flex rounded-lg border border-white/10 p-0.5">
              {([2, 3, 4] as const).map((c) => (
                <button key={c} type="button" onClick={() => set('columns', c)} className={`rounded-md px-3 py-1 text-xs ${m.columns === c ? 'bg-white/10 font-semibold text-white' : 'text-slate-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <ListEditor items={m.images} onChange={(v) => set('images', v)} create={() => ({ ...row(), url: '', link: '' })} addLabel="Bild hinzufügen" max={12} columns={[{ key: 'url', placeholder: 'Bild-URL (https://…)', type: 'url' }, { key: 'link', placeholder: 'Link (optional)', type: 'url', className: '0.7fr' }]} />
        </div>
      );
      break;
    case 'tipMenu':
      specific = (
        <div className="space-y-3">
          <ListEditor
            items={m.items}
            onChange={(v) => set('items', v)}
            create={() => ({ ...row(), emoji: '⭐', label: '', tokens: 0 })}
            addLabel="Aktion hinzufügen"
            columns={[{ key: 'emoji', placeholder: 'Emoji', className: '3.2rem' }, { key: 'label', placeholder: 'Aktion' }, { key: 'tokens', placeholder: 'Tokens', type: 'number' }]}
          />
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-violet-400" checked={m.sortByPrice} onChange={(e) => set('sortByPrice', e.target.checked)} />
            Nach Preis sortieren
          </label>
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
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-4">
            <Field label="Beschreibung" htmlFor={`${id}-gtext`}>
              <input id={`${id}-gtext`} className={builderInput} value={m.text} onChange={(e) => set('text', e.target.value)} />
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
      specific = <ListEditor items={m.items} onChange={(v) => set('items', v)} create={() => ({ ...row(), label: '', url: '' })} addLabel="Button hinzufügen" max={10} columns={[{ key: 'label', placeholder: 'Beschriftung', className: '0.8fr' }, { key: 'url', placeholder: 'https://…', type: 'url' }]} />;
      break;
    case 'marquee':
      specific = (
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem]">
          <Field label="Text" htmlFor={`${id}-mtext`}>
            <input id={`${id}-mtext`} className={builderInput} value={m.text} onChange={(e) => set('text', e.target.value)} />
          </Field>
          <Field label={`Tempo: ${m.speed}`} htmlFor={`${id}-speed`}>
            <input id={`${id}-speed`} type="range" min={1} max={20} value={m.speed} onChange={(e) => set('speed', Number(e.target.value))} className="w-full accent-violet-400" />
          </Field>
          <Field label="Richtung" htmlFor={`${id}-dir`}>
            <select id={`${id}-dir`} className={builderInput} value={m.direction} onChange={(e) => set('direction', e.target.value)}>
              <option value="left" className="bg-slate-900">← Links</option>
              <option value="right" className="bg-slate-900">Rechts →</option>
            </select>
          </Field>
        </div>
      );
      break;
    case 'divider':
      specific = (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['line', 'Linie'],
              ['dots', '• • •'],
              ['hearts', '♥ ♥ ♥'],
              ['stars', '✦ ✦ ✦'],
              ['space', 'Abstand'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" onClick={() => set('style', v)} className={`rounded-lg border px-3 py-1.5 text-xs ${m.style === v ? 'border-violet-400/60 bg-violet-400/10 text-violet-100' : 'border-white/10 text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      );
      break;
  }

  return (
    <div className="space-y-4">
      {specific}
      {common}
    </div>
  );
}
