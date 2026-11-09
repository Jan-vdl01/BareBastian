import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { AlertIcon, CheckIcon, CopyIcon, DownloadIcon, PlusIcon, TrashIcon } from '../icons';
import { checkBio } from './bio/chaturbateRules';
import {
  generateBio,
  LANGUAGE_OPTIONS,
  PERSONALITY_OPTIONS,
  type BioInput,
  type BioLanguage,
  type BioTone,
  type TipMenuItem,
} from './bio/generateBio';

const STORAGE_KEY = 'bb_bio_generator';

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_INPUT: BioInput = {
  stageName: 'Bastian',
  age: '',
  region: 'Deutschland',
  language: 'both',
  tone: 'friendly',
  emojis: true,
  spokenLanguages: ['Deutsch', 'Englisch'],
  interestedIn: '',
  bodyType: '',
  personality: ['funny', 'chill', 'talkative'],
  hobbies: 'Gym, Gaming und gute Musik',
  schedule: 'Mi, Fr & Sa ab 21 Uhr (MEZ)',
  aboutExtra: '',
  includeRoomRules: true,
  tipMenu: [
    { id: uid(), label: 'Hallo sagen', tokens: 10 },
    { id: uid(), label: 'Song-Wunsch', tokens: 50 },
    { id: uid(), label: 'Outfit-Wechsel', tokens: 100 },
  ],
  wishList: ['Neues Ringlicht für das Studio', 'Gaming-Headset'],
  hashtags: ['german', 'gamer', 'chill', 'fit'],
  goal: 'Willkommen! Goal: 500 tk für den Studio-Ausbau',
};

function loadInput(): BioInput {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_INPUT, ...(JSON.parse(raw) as Partial<BioInput>) } : DEFAULT_INPUT;
  } catch {
    return DEFAULT_INPUT;
  }
}

/* ---------- kleine UI-Bausteine ---------- */

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-cyan-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-cyan-400/10';

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
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

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
      <h2 className="mb-4 font-oswald text-lg tracking-wide text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
        active ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid rounded-xl border border-white/10 bg-white/[0.03] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2 py-2 text-xs transition-all duration-200 ${value === o.value ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text, label = 'Kopieren' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40 ${
        copied ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? 'Kopiert' : label}
    </button>
  );
}

function OutputBlock({ title, text, mono = false, extra }: { title: string; text: string; mono?: boolean; extra?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <div className="flex items-center gap-2">
          {extra}
          <CopyButton text={text} />
        </div>
      </div>
      <pre className={`max-h-80 overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed text-slate-200 ${mono ? 'font-mono text-xs' : 'font-sans'}`}>
        {text || <span className="text-slate-600">– leer –</span>}
      </pre>
    </div>
  );
}

/* ---------- Seite ---------- */

export function BioGeneratorPage() {
  const id = useId();
  const [input, setInput] = useState<BioInput>(loadInput);
  const [htmlMode, setHtmlMode] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [wishDraft, setWishDraft] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  const set = <K extends keyof BioInput>(key: K, value: BioInput[K]) => setInput((s) => ({ ...s, [key]: value }));
  const toggleIn = (key: 'spokenLanguages' | 'personality', value: string) =>
    set(key, input[key].includes(value) ? input[key].filter((v) => v !== value) : [...input[key], value]);

  const output = useMemo(() => generateBio(input), [input]);

  const ageNum = Number(input.age);
  const ageError = !input.age.trim() ? 'Bitte gib dein Alter an.' : !Number.isInteger(ageNum) || ageNum < 18 ? 'Du musst mindestens 18 Jahre alt sein.' : ageNum > 99 ? 'Bitte ein gültiges Alter angeben.' : null;

  const allText = [output.aboutMe, output.tipMenu, output.wishList, output.roomSubject, input.interestedIn, input.bodyType, input.region, input.stageName].join('\n');
  const results = checkBio(allText);
  const errors = results.filter((r) => r.matches.length && r.rule.severity === 'error').length + (ageError ? 1 : 0);
  const warnings = results.filter((r) => r.matches.length && r.rule.severity === 'warning').length;

  const updateTip = (tipId: string, patch: Partial<TipMenuItem>) => set('tipMenu', input.tipMenu.map((t) => (t.id === tipId ? { ...t, ...patch } : t)));

  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#+/, '').replace(/\s+/g, '');
    if (tag && !input.hashtags.includes(tag) && input.hashtags.length < 5) set('hashtags', [...input.hashtags, tag]);
    setTagDraft('');
  };
  const addWish = () => {
    if (wishDraft.trim()) set('wishList', [...input.wishList, wishDraft.trim()]);
    setWishDraft('');
  };

  const download = () => {
    const parts = [
      `CHATURBATE-BIO – ${input.stageName}`,
      '',
      '== PROFILFELDER ==',
      ...output.fields.map((f) => `${f.label}: ${f.value}`),
      '',
      '== ABOUT ME ==',
      output.aboutMe,
      '',
      '== ABOUT ME (HTML) ==',
      output.aboutMeHtml,
      '',
      '== TIP-MENÜ ==',
      output.tipMenu,
      '',
      '== WISH LIST ==',
      output.wishList,
      '',
      '== RAUM-TITEL ==',
      output.roomSubject,
    ];
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chaturbate-bio-${(input.stageName || 'profil').toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Formular */}
      <div className="space-y-5">
        <Card title="Basisdaten">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Anzeigename" htmlFor={`${id}-name`}>
              <input id={`${id}-name`} className={inputCls} value={input.stageName} onChange={(e) => set('stageName', e.target.value)} />
            </Field>
            <Field label="Alter (18+)" htmlFor={`${id}-age`}>
              <input
                id={`${id}-age`}
                inputMode="numeric"
                className={`${inputCls} ${ageError && input.age ? 'border-rose-400/60' : ''}`}
                value={input.age}
                onChange={(e) => set('age', e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="z. B. 24"
              />
            </Field>
            <Field label="Region" hint="Nur Land/Region – keine genaue Adresse." htmlFor={`${id}-region`}>
              <input id={`${id}-region`} className={inputCls} value={input.region} onChange={(e) => set('region', e.target.value)} />
            </Field>
            <Field label="Interessiert an" htmlFor={`${id}-int`}>
              <input id={`${id}-int`} className={inputCls} value={input.interestedIn} onChange={(e) => set('interestedIn', e.target.value)} placeholder="z. B. Männer, Frauen" />
            </Field>
            <Field label="Körperbau" htmlFor={`${id}-body`}>
              <input id={`${id}-body`} className={inputCls} value={input.bodyType} onChange={(e) => set('bodyType', e.target.value)} placeholder="z. B. sportlich" />
            </Field>
          </div>
          <Field label="Gesprochene Sprachen">
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <Chip key={l} active={input.spokenLanguages.includes(l)} onClick={() => toggleIn('spokenLanguages', l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </Field>
        </Card>

        <Card title="Persönlichkeit & Inhalt">
          <Field label="So bist du (Mehrfachauswahl)">
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_OPTIONS.map((p) => (
                <Chip key={p.id} active={input.personality.includes(p.id)} onClick={() => toggleIn('personality', p.id)}>
                  {p.de}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Hobbys" htmlFor={`${id}-hob`}>
            <input id={`${id}-hob`} className={inputCls} value={input.hobbies} onChange={(e) => set('hobbies', e.target.value)} />
          </Field>
          <Field label="Stream-Zeiten" htmlFor={`${id}-sched`}>
            <input id={`${id}-sched`} className={inputCls} value={input.schedule} onChange={(e) => set('schedule', e.target.value)} />
          </Field>
          <Field label="Eigener Zusatztext (optional)" htmlFor={`${id}-extra`}>
            <textarea id={`${id}-extra`} rows={3} className={`${inputCls} resize-none`} value={input.aboutExtra} onChange={(e) => set('aboutExtra', e.target.value)} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={input.includeRoomRules} onChange={(e) => set('includeRoomRules', e.target.checked)} />
            Raumregeln anhängen
          </label>
        </Card>

        <Card title="Stil">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sprache der Bio">
              <Segmented<BioLanguage>
                label="Sprache der Bio"
                value={input.language}
                onChange={(v) => set('language', v)}
                options={[
                  { value: 'de', label: 'Deutsch' },
                  { value: 'en', label: 'English' },
                  { value: 'both', label: 'Beide' },
                ]}
              />
            </Field>
            <Field label="Tonalität">
              <Segmented<BioTone>
                label="Tonalität"
                value={input.tone}
                onChange={(v) => set('tone', v)}
                options={[
                  { value: 'friendly', label: 'Freundlich' },
                  { value: 'playful', label: 'Frech' },
                  { value: 'classy', label: 'Elegant' },
                ]}
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={input.emojis} onChange={(e) => set('emojis', e.target.checked)} />
            Emojis verwenden
          </label>
        </Card>

        <Card title="Tip-Menü">
          <ul className="space-y-2">
            {input.tipMenu.map((t) => (
              <li key={t.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                <input
                  aria-label="Tokens"
                  inputMode="numeric"
                  className={inputCls}
                  value={t.tokens || ''}
                  onChange={(e) => updateTip(t.id, { tokens: Number(e.target.value.replace(/\D/g, '').slice(0, 6)) })}
                  placeholder="tk"
                />
                <input aria-label="Aktion" className={inputCls} value={t.label} onChange={(e) => updateTip(t.id, { label: e.target.value })} placeholder="Aktion" />
                <button
                  type="button"
                  aria-label="Eintrag entfernen"
                  onClick={() => set('tipMenu', input.tipMenu.filter((x) => x.id !== t.id))}
                  className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <TrashIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => set('tipMenu', [...input.tipMenu, { id: uid(), label: '', tokens: 0 }])}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-3.5 py-2 text-sm text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
          >
            <PlusIcon size={16} /> Eintrag hinzufügen
          </button>
        </Card>

        <Card title="Wunschliste & Raum-Titel">
          <Field label="Wunschliste">
            <ul className="mb-2 space-y-1.5">
              {input.wishList.map((w, i) => (
                <li key={`${w}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                  {w}
                  <button type="button" aria-label={`${w} entfernen`} onClick={() => set('wishList', input.wishList.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-300">
                    <TrashIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input className={inputCls} value={wishDraft} onChange={(e) => setWishDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWish())} placeholder="Wunsch hinzufügen + Enter" />
              <button type="button" onClick={addWish} aria-label="Wunsch hinzufügen" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"><PlusIcon size={16} /></button>
            </div>
          </Field>
          <Field label="Raum-Titel / Goal" htmlFor={`${id}-goal`}>
            <input id={`${id}-goal`} className={inputCls} value={input.goal} onChange={(e) => set('goal', e.target.value)} />
          </Field>
          <Field label="Hashtags (max. 5)">
            <div className="mb-2 flex flex-wrap gap-2">
              {input.hashtags.map((t) => (
                <button key={t} type="button" onClick={() => set('hashtags', input.hashtags.filter((x) => x !== t))} className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-200 transition-colors hover:bg-rose-500/15 hover:text-rose-200" aria-label={`#${t} entfernen`}>
                  #{t} ×
                </button>
              ))}
            </div>
            <input
              className={inputCls}
              value={tagDraft}
              disabled={input.hashtags.length >= 5}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag())}
              placeholder={input.hashtags.length >= 5 ? 'Maximum erreicht' : 'Hashtag + Enter'}
            />
          </Field>
        </Card>
      </div>

      {/* Ergebnis */}
      <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-oswald text-lg tracking-wide text-white">Regel-Check</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                errors ? 'bg-rose-500/15 text-rose-300' : warnings ? 'bg-amber-400/15 text-amber-200' : 'bg-emerald-400/15 text-emerald-300'
              }`}
            >
              {errors ? `${errors} ${errors > 1 ? 'Verstöße' : 'Verstoß'}` : warnings ? `${warnings} Hinweis${warnings > 1 ? 'e' : ''}` : 'Alles in Ordnung'}
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            <RuleRow ok={!ageError} severity="error" title="Mindestalter 18 Jahre" hint={ageError ?? 'Alter angegeben und volljährig.'} />
            {results.map((r) => (
              <RuleRow key={r.rule.id} ok={r.matches.length === 0} severity={r.rule.severity} title={r.rule.title} hint={r.rule.hint} matches={r.matches} />
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Die Prüfung basiert auf bekannten Chaturbate-Regeln und ersetzt nicht die offiziellen Richtlinien. Bitte vor dem Veröffentlichen die aktuellen Chaturbate-Terms prüfen.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-oswald text-lg tracking-wide text-white">Deine Bio</h2>
            <button
              type="button"
              onClick={download}
              disabled={errors > 0}
              title={errors > 0 ? 'Erst alle Verstöße beheben' : undefined}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DownloadIcon size={14} /> Als .txt speichern
            </button>
          </div>

          {output.fields.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Profilfelder</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                {output.fields.map((f) => (
                  <div key={f.label} className="contents">
                    <dt className="text-slate-500">{f.label}</dt>
                    <dd className="text-slate-200">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <OutputBlock
            title="About Me"
            text={htmlMode ? output.aboutMeHtml : output.aboutMe}
            mono={htmlMode}
            extra={
              <button type="button" onClick={() => setHtmlMode((m) => !m)} className="rounded-lg px-2 py-1 text-[11px] text-cyan-300 hover:bg-cyan-400/10">
                {htmlMode ? 'Als Text' : 'Als HTML'}
              </button>
            }
          />
          <OutputBlock title="Tip-Menü" text={output.tipMenu} />
          <OutputBlock title="Wish List" text={output.wishList} />
          <OutputBlock title="Raum-Titel" text={output.roomSubject} />
        </section>
      </div>
    </div>
  );
}

function RuleRow({ ok, severity, title, hint, matches = [] }: { ok: boolean; severity: 'error' | 'warning'; title: string; hint: string; matches?: string[] }) {
  const color = ok ? 'text-emerald-300 bg-emerald-400/10' : severity === 'error' ? 'text-rose-300 bg-rose-500/10' : 'text-amber-200 bg-amber-400/10';
  return (
    <li className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors ${ok ? '' : severity === 'error' ? 'bg-rose-500/[0.06]' : 'bg-amber-400/[0.05]'}`}>
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${color}`}>{ok ? <CheckIcon size={13} /> : <AlertIcon size={13} />}</span>
      <div className="min-w-0 text-sm">
        <p className={ok ? 'text-slate-300' : 'font-medium text-white'}>{title}</p>
        {!ok && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
        {!ok && matches.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {matches.slice(0, 6).map((m) => (
              <code key={m} className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-slate-200">{m}</code>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}
