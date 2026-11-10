import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AlertIcon, CheckIcon, ChevronDown, DownloadIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon, XIcon } from '../../icons';
import { downloadBlob } from '../../lib/download';
import { BarList, ChartCard, ColumnChart } from './charts';
import {
  byCategory,
  byToy,
  byWeekday,
  clearFinance,
  compact,
  deleteStreams,
  duration,
  earnings,
  formatDay,
  importCsv,
  inPeriod,
  loadSampleData,
  money,
  num,
  periodFor,
  RANGES,
  saveStream,
  setCategories,
  setToys,
  timeSeries,
  toCsv,
  today,
  totals,
  updateSettings,
  useFinance,
  type FinanceData,
  type RangeId,
  type StreamEntry,
  type StreamInput,
} from './financeStore';

const input =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-4 focus:ring-sky-400/10';

/* ---------- Gemeinsame Teile ---------- */

export function FinanceNav({ active }: { active: 'overview' | 'streams' | 'settings' }) {
  const items = [
    { id: 'overview', label: 'Auswertung', href: '#/abo-bereich/finanzen' },
    { id: 'streams', label: 'Streams', href: '#/abo-bereich/finanzen/streams' },
    { id: 'settings', label: 'Einstellungen', href: '#/abo-bereich/finanzen/einstellungen' },
  ] as const;
  return (
    <nav aria-label="Finanz-Tool" className="mb-6 inline-flex rounded-2xl border border-white/10 bg-slate-900/60 p-1">
      {items.map((i) => (
        <a
          key={i.id}
          href={i.href}
          aria-current={active === i.id ? 'page' : undefined}
          className={`rounded-xl px-4 py-2 text-sm transition-all ${active === i.id ? 'bg-gradient-to-r from-sky-500 to-blue-600 font-semibold text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white'}`}
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
      <div className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0f18] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-4">
          <h2 className="font-oswald text-xl tracking-wide text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 transition-all hover:rotate-90 hover:bg-white/15">
            <XIcon size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Formular: Stream eintragen/bearbeiten ---------- */

export function StreamForm({ data, entry, onClose }: { data: FinanceData; entry?: StreamEntry; onClose: () => void }) {
  const { user } = useAuth();
  const userId = user?.id ?? 'anon';
  const [form, setForm] = useState<StreamInput>(
    () =>
      entry ?? {
        date: today(),
        start: '',
        durationMin: 120,
        tokens: 0,
        category: data.categories[0] ?? '',
        toys: [],
        followers: 0,
        notes: '',
      },
  );
  const [hours, setHours] = useState(String(Math.floor(form.durationMin / 60)));
  const [mins, setMins] = useState(String(form.durationMin % 60));
  const [newToy, setNewToy] = useState('');
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof StreamInput>(k: K, v: StreamInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const durationMin = (Number(hours) || 0) * 60 + (Number(mins) || 0);
  const tph = durationMin ? form.tokens / (durationMin / 60) : 0;
  const toyOptions = [...new Set([...data.toys, ...form.toys])];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setError('Bitte ein gültiges Datum wählen.');
    if (durationMin <= 0) return setError('Die Stream-Länge muss größer als 0 sein.');
    if (durationMin > 24 * 60) return setError('Ein Stream kann höchstens 24 Stunden dauern.');
    if (!Number.isFinite(form.tokens) || form.tokens < 0) return setError('Bitte eine gültige Token-Anzahl eingeben.');
    const category = form.category === '__new' ? newCat.trim() : form.category;
    if (!category) return setError('Bitte eine Kategorie wählen oder anlegen.');
    saveStream(userId, { ...form, category, durationMin, tokens: Math.round(form.tokens), notes: form.notes.trim().slice(0, 500) }, entry?.id);
    onClose();
  };

  const label = 'mb-1.5 block text-xs font-medium text-slate-300';
  return (
    <Modal title={entry ? 'Stream bearbeiten' : 'Stream eintragen'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Datum *</span>
            <input type="date" className={input} value={form.date} max={today()} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="block">
            <span className={label}>Startzeit</span>
            <input type="time" className={input} value={form.start} onChange={(e) => set('start', e.target.value)} />
          </label>
          <div>
            <span className={label}>Länge *</span>
            <div className="flex items-center gap-1.5">
              <input aria-label="Stunden" inputMode="numeric" className={`${input} text-center`} value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <span className="text-xs text-slate-500">h</span>
              <input aria-label="Minuten" inputMode="numeric" className={`${input} text-center`} value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <span className="text-xs text-slate-500">min</span>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Tokens *</span>
            <input inputMode="numeric" className={input} value={form.tokens || ''} placeholder="0" onChange={(e) => set('tokens', Number(e.target.value.replace(/\D/g, '').slice(0, 9)))} />
          </label>
          <label className="block">
            <span className={label}>Neue Follower</span>
            <input inputMode="numeric" className={input} value={form.followers || ''} placeholder="0" onChange={(e) => set('followers', Number(e.target.value.replace(/\D/g, '').slice(0, 7)))} />
          </label>
          <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-3.5 py-2 text-xs">
            <span className="block text-slate-400">Verdienst</span>
            <span className="block text-lg font-semibold text-white">{money(earnings(form.tokens, data.settings), data.settings)}</span>
            <span className="text-slate-400">{num(tph)} Tokens/Std.</span>
          </div>
        </div>
        <label className="block">
          <span className={label}>Kategorie *</span>
          <select className={input} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {data.categories.map((c) => (
              <option key={c} value={c} className="bg-slate-900">
                {c}
              </option>
            ))}
            <option value="__new" className="bg-slate-900">+ Neue Kategorie …</option>
          </select>
          {form.category === '__new' && <input className={`${input} mt-2`} placeholder="Name der Kategorie" value={newCat} maxLength={40} onChange={(e) => setNewCat(e.target.value)} />}
        </label>
        <div>
          <span className={label}>Benutzte Toys</span>
          <div className="flex flex-wrap gap-2">
            {toyOptions.map((t) => {
              const on = form.toys.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('toys', on ? form.toys.filter((x) => x !== t) : t === 'Kein Toy' ? ['Kein Toy'] : [...form.toys.filter((x) => x !== 'Kein Toy'), t])}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? 'border-sky-400/60 bg-sky-500/20 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}
                >
                  {on && <CheckIcon size={11} className="mr-1 inline" />}
                  {t}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className={input}
              placeholder="Weiteres Toy hinzufügen …"
              value={newToy}
              maxLength={40}
              onChange={(e) => setNewToy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newToy.trim()) set('toys', [...form.toys.filter((x) => x !== 'Kein Toy'), newToy.trim()]);
                  setNewToy('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newToy.trim()) set('toys', [...form.toys.filter((x) => x !== 'Kein Toy'), newToy.trim()]);
                setNewToy('');
              }}
              aria-label="Toy hinzufügen"
              className="grid w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
            >
              <PlusIcon size={16} />
            </button>
          </div>
        </div>
        <label className="block">
          <span className={label}>Notiz</span>
          <textarea rows={2} maxLength={500} className={`${input} resize-none`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="z. B. Goal erreicht, Thema der Show …" />
        </label>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            <AlertIcon size={15} /> {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
            Abbrechen
          </button>
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
            <CheckIcon size={16} /> {entry ? 'Speichern' : 'Eintragen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Auswertung ---------- */

function Delta({ now, prev, invert = false }: { now: number; prev: number | undefined; invert?: boolean }) {
  if (prev === undefined) return null;
  if (!prev) return now ? <span className="text-[11px] text-slate-500">neu im Zeitraum</span> : null;
  const pct = ((now - prev) / prev) * 100;
  const up = pct >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`text-[11px] font-medium ${good ? 'text-emerald-300' : 'text-rose-300'}`}>
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {num(pct, 0)} % <span className="font-normal text-slate-500">vs. Vorperiode</span>
    </span>
  );
}

function Kpi({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      <div className="mt-1 min-h-4">{delta}</div>
    </div>
  );
}

export function FinanceDashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anon';
  const data = useFinance(userId);
  const s = data.settings;
  const [range, setRange] = useState<RangeId>('30d');
  const [form, setForm] = useState(false);

  const period = useMemo(() => periodFor(range, data.streams), [range, data.streams]);
  const current = useMemo(() => data.streams.filter((x) => inPeriod(x, period.from, period.to)), [data.streams, period]);
  const previous = useMemo(() => (period.prevFrom ? data.streams.filter((x) => inPeriod(x, period.prevFrom!, period.prevTo!)) : null), [data.streams, period]);
  const t = totals(current);
  const p = previous ? totals(previous) : undefined;
  const series = useMemo(() => timeSeries(current, period), [current, period]);
  const cats = useMemo(() => byCategory(current), [current]);
  const toys = useMemo(() => byToy(current), [current]);
  const weekdays = useMemo(() => byWeekday(current), [current]);
  const top = useMemo(() => [...current].sort((a, b) => b.tokens - a.tokens).slice(0, 5), [current]);

  const monthPeriod = periodFor('month', data.streams);
  const monthTokens = data.streams.filter((x) => inPeriod(x, monthPeriod.from, monthPeriod.to)).reduce((a, x) => a + x.tokens, 0);
  const goalPct = s.monthlyGoal ? Math.min(100, (monthTokens / s.monthlyGoal) * 100) : 0;

  const bestCat = [...cats].filter((c) => c.minutes >= 60).sort((a, b) => b.tokensPerHour - a.tokensPerHour)[0];
  const bestToy = [...toys].filter((c) => c.name !== 'Kein Toy' && c.minutes >= 60).sort((a, b) => b.tokensPerHour - a.tokensPerHour)[0];
  const bestDay = [...weekdays].filter((w) => w.streams).sort((a, b) => b.avgTokens - a.avgTokens)[0];

  if (!data.streams.length) {
    return (
      <div>
        <FinanceNav active="overview" />
        <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <p className="font-oswald text-2xl text-white">Noch keine Streams eingetragen</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Trage nach jedem Stream Tokens, Länge, Kategorie und Toys ein – hier siehst du dann, was sich am meisten lohnt.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">
              <PlusIcon size={16} /> Ersten Stream eintragen
            </button>
            <button type="button" onClick={() => loadSampleData(userId)} className="rounded-xl border border-white/15 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">
              Beispieldaten laden
            </button>
          </div>
        </div>
        {form && <StreamForm data={data} onClose={() => setForm(false)} />}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <FinanceNav active="overview" />
        <button type="button" onClick={() => setForm(true)} className="mb-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40">
          <PlusIcon size={16} /> Stream eintragen
        </button>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Zeitraum">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={range === r.id}
            onClick={() => setRange(r.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors ${range === r.id ? 'border-sky-400/60 bg-sky-500/20 font-semibold text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}
          >
            {r.label}
          </button>
        ))}
        <span className="ml-auto shrink-0 self-center text-[11px] text-slate-500">
          {formatDay(period.from)} – {formatDay(period.to)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Verdienst" value={money(earnings(t.tokens, s), s)} sub={`${num(s.payoutPerToken, 3)} USD / Token`} delta={<Delta now={t.tokens} prev={p?.tokens} />} />
        <Kpi label="Tokens" value={compact(t.tokens)} delta={<Delta now={t.tokens} prev={p?.tokens} />} />
        <Kpi label="Streams" value={num(t.streams)} delta={<Delta now={t.streams} prev={p?.streams} />} />
        <Kpi label="Stream-Zeit" value={duration(t.minutes)} delta={<Delta now={t.minutes} prev={p?.minutes} />} />
        <Kpi label="Tokens / Std." value={num(t.tokensPerHour)} sub={`${money(earnings(t.tokensPerHour, s), s)} pro Std.`} delta={<Delta now={t.tokensPerHour} prev={p?.tokensPerHour} />} />
        <Kpi label="Ø pro Stream" value={num(t.tokensPerStream)} sub={`${num(t.followers)} neue Follower`} delta={<Delta now={t.tokensPerStream} prev={p?.tokensPerStream} />} />
      </div>

      {s.monthlyGoal > 0 && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="Monatsziel">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-white">Monatsziel</span>
            <span className="tabular-nums text-slate-300">
              {num(monthTokens)} / {num(s.monthlyGoal)} Tokens · {num(goalPct)} %
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(goalPct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#3987e5] transition-all duration-700" style={{ width: `${goalPct}%` }} />
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title={`Tokens pro ${series.unit}`}
            subtitle={`${num(t.tokens)} Tokens im Zeitraum`}
            table={{ head: [series.unit, 'Tokens', 'Streams', 'Zeit'], rows: series.buckets.map((b) => [b.label, num(b.tokens), b.streams, duration(b.minutes)]) }}
          >
            <ColumnChart
              ariaLabel={`Tokens pro ${series.unit}`}
              format={(v) => `${num(v)} TK`}
              data={series.buckets.map((b) => ({ label: b.label, value: b.tokens, details: [`${b.streams} Stream${b.streams === 1 ? '' : 's'} · ${duration(b.minutes)}`, money(earnings(b.tokens, s), s)] }))}
            />
          </ChartCard>
        </div>
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5" aria-label="Erkenntnisse">
          <h3 className="font-oswald text-lg tracking-wide text-white">Erkenntnisse</h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="rounded-xl bg-white/[0.04] p-3">
              <span className="block text-[11px] uppercase tracking-wider text-slate-500">Lukrativste Kategorie</span>
              <span className="text-white">{bestCat ? bestCat.name : '–'}</span>
              {bestCat && <span className="block text-xs text-slate-400">{num(bestCat.tokensPerHour)} Tokens/Std. · {bestCat.streams} Streams</span>}
            </li>
            <li className="rounded-xl bg-white/[0.04] p-3">
              <span className="block text-[11px] uppercase tracking-wider text-slate-500">Stärkstes Toy</span>
              <span className="text-white">{bestToy ? bestToy.name : '–'}</span>
              {bestToy && <span className="block text-xs text-slate-400">{num(bestToy.tokensPerHour)} Tokens/Std. · {bestToy.streams} Streams</span>}
            </li>
            <li className="rounded-xl bg-white/[0.04] p-3">
              <span className="block text-[11px] uppercase tracking-wider text-slate-500">Bester Wochentag</span>
              <span className="text-white">{bestDay ? bestDay.label : '–'}</span>
              {bestDay && <span className="block text-xs text-slate-400">Ø {num(bestDay.avgTokens)} Tokens pro Stream</span>}
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">Kategorien & Toys zählen erst ab 1 Stunde Stream-Zeit im Zeitraum.</p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tokens nach Kategorie" subtitle="Summe im Zeitraum" table={{ head: ['Kategorie', 'Tokens', 'Streams', 'Tokens/Std.'], rows: cats.map((c) => [c.name, num(c.tokens), c.streams, num(c.tokensPerHour)]) }}>
          <BarList ariaLabel="Tokens nach Kategorie" format={(v) => `${num(v)} TK`} data={cats.map((c) => ({ label: c.name, value: c.tokens, details: [`${c.streams} Streams · ${duration(c.minutes)}`, `${num(c.tokensPerHour)} Tokens/Std.`] }))} />
        </ChartCard>
        <ChartCard
          title="Toys: Tokens pro Stunde"
          subtitle="Streams mit mehreren Toys zählen bei jedem Toy"
          table={{ head: ['Toy', 'Tokens/Std.', 'Streams', 'Tokens'], rows: toys.map((c) => [c.name, num(c.tokensPerHour), c.streams, num(c.tokens)]) }}
        >
          <BarList
            ariaLabel="Tokens pro Stunde je Toy"
            format={(v) => `${num(v)} TK/h`}
            data={[...toys].sort((a, b) => b.tokensPerHour - a.tokensPerHour).map((c) => ({ label: c.name, value: Math.round(c.tokensPerHour), details: [`${c.streams} Streams · ${duration(c.minutes)}`, `${num(c.tokens)} Tokens gesamt`] }))}
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ø Tokens pro Stream nach Wochentag" table={{ head: ['Tag', 'Ø Tokens', 'Streams'], rows: weekdays.map((w) => [w.label, num(w.avgTokens), w.streams]) }}>
          <ColumnChart ariaLabel="Durchschnittliche Tokens pro Stream nach Wochentag" height={200} format={(v) => `${num(v)} TK`} data={weekdays.map((w) => ({ label: w.label, value: Math.round(w.avgTokens), details: [`${w.streams} Stream${w.streams === 1 ? '' : 's'}`] }))} />
        </ChartCard>
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5" aria-labelledby="top-streams">
          <div className="mb-3 flex items-center justify-between">
            <h3 id="top-streams" className="font-oswald text-lg tracking-wide text-white">
              Top-Streams
            </h3>
            <a href="#/abo-bereich/finanzen/streams" className="text-xs text-sky-300 hover:underline">
              Alle Streams
            </a>
          </div>
          <ol className="space-y-2">
            {top.map((x, i) => (
              <li key={x.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {formatDay(x.date)} · {x.category}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {duration(x.durationMin)} · {x.toys.join(', ') || 'Kein Toy'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-white">{num(x.tokens)} TK</span>
                  <span className="block text-xs text-slate-500">{money(earnings(x.tokens, s), s)}</span>
                </span>
              </li>
            ))}
            {!top.length && <li className="py-6 text-center text-sm text-slate-500">Keine Streams im Zeitraum.</li>}
          </ol>
        </section>
      </div>

      {form && <StreamForm data={data} onClose={() => setForm(false)} />}
    </div>
  );
}

/* ---------- Stream-Tabelle ---------- */

type SortKey = 'date' | 'durationMin' | 'tokens' | 'tph' | 'category';

export function FinanceStreams() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anon';
  const data = useFinance(userId);
  const s = data.settings;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [toy, setToy] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [editing, setEditing] = useState<StreamEntry | 'new' | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [limit, setLimit] = useState(25);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tphOf = (x: StreamEntry) => (x.durationMin ? x.tokens / (x.durationMin / 60) : 0);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.streams.filter(
      (x) =>
        (!cat || x.category === cat) &&
        (!toy || x.toys.includes(toy) || (toy === 'Kein Toy' && !x.toys.length)) &&
        (!from || x.date >= from) &&
        (!to || x.date <= to) &&
        (!needle || `${x.notes} ${x.category} ${x.toys.join(' ')} ${x.date}`.toLowerCase().includes(needle)),
    );
    const val = (x: StreamEntry) => (sort.key === 'tph' ? tphOf(x) : sort.key === 'date' ? `${x.date} ${x.start}` : x[sort.key]);
    return [...list].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * sort.dir;
    });
  }, [data.streams, q, cat, toy, from, to, sort]);
  const sum = totals(rows);
  const filtered = rows.length !== data.streams.length;
  const allVisibleSelected = rows.length > 0 && rows.slice(0, limit).every((r) => selected.has(r.id));

  const th = (key: SortKey, label: string, align = 'text-left') => (
    <th scope="col" className={`px-3 py-3 font-medium ${align}`} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((p) => ({ key, dir: p.key === key ? (p.dir === 1 ? -1 : 1) : key === 'category' ? 1 : -1 }))} className="inline-flex items-center gap-1 hover:text-white">
        {label}
        {sort.key === key && <ChevronDown size={12} className={sort.dir === 1 ? 'rotate-180' : ''} />}
      </button>
    </th>
  );

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { added, skipped } = importCsv(userId, await file.text());
      setNotice({ ok: true, text: `${added} Stream${added === 1 ? '' : 's'} importiert${skipped ? ` · ${skipped} bereits vorhanden, übersprungen` : ''}.` });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Import fehlgeschlagen.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <FinanceNav active="streams" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadBlob(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }), `streams-${today()}.csv`)} disabled={!rows.length} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40">
            <DownloadIcon size={15} /> CSV
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-white/5">
            <UploadIcon size={15} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onImport(e.target.files?.[0])} />
          <button type="button" onClick={() => setEditing('new')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40">
            <PlusIcon size={16} /> Stream eintragen
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className={`mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${notice.ok ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>
          {notice.ok ? <CheckIcon size={14} /> : <AlertIcon size={14} />} {notice.text}
        </p>
      )}

      {/* Filter */}
      <div className="mb-4 grid gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <SearchIcon size={15} className="text-slate-500" />
          <span className="sr-only">Suchen</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Notizen, Kategorie, Toy …" className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
        </label>
        <select aria-label="Kategorie filtern" className={`${input} py-2`} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="" className="bg-slate-900">Alle Kategorien</option>
          {data.categories.map((c) => (
            <option key={c} value={c} className="bg-slate-900">
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Toy filtern" className={`${input} py-2`} value={toy} onChange={(e) => setToy(e.target.value)}>
          <option value="" className="bg-slate-900">Alle Toys</option>
          {data.toys.map((c) => (
            <option key={c} value={c} className="bg-slate-900">
              {c}
            </option>
          ))}
        </select>
        <input type="date" aria-label="Von" className={`${input} py-2`} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" aria-label="Bis" className={`${input} py-2`} value={to} onChange={(e) => setTo(e.target.value)} />
        <button
          type="button"
          disabled={!q && !cat && !toy && !from && !to}
          onClick={() => (setQ(''), setCat(''), setToy(''), setFrom(''), setTo(''))}
          className="rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          Zurücksetzen
        </button>
      </div>

      {/* Summen der Auswahl */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-400">
        <span>
          <b className="text-white">{rows.length}</b> {filtered ? `von ${data.streams.length} ` : ''}Streams
        </span>
        <span>
          <b className="tabular-nums text-white">{num(sum.tokens)}</b> Tokens
        </span>
        <span>
          <b className="tabular-nums text-white">{money(earnings(sum.tokens, s), s)}</b>
        </span>
        <span>
          <b className="text-white">{duration(sum.minutes)}</b>
        </span>
        <span>
          Ø <b className="tabular-nums text-white">{num(sum.tokensPerHour)}</b> TK/Std.
        </span>
        {selected.size > 0 && (
          <span className="ml-auto flex items-center gap-2">
            {selected.size} ausgewählt
            <button type="button" onClick={() => setConfirm([...selected])} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/25">
              <TrashIcon size={13} /> Löschen
            </button>
          </span>
        )}
      </div>

      {/* Tabelle (Desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 md:block">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Alle sichtbaren auswählen"
                  className="h-4 w-4 accent-sky-400"
                  checked={allVisibleSelected}
                  onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(rows.slice(0, limit).map((r) => r.id)))}
                />
              </th>
              {th('date', 'Datum')}
              {th('durationMin', 'Länge', 'text-right')}
              {th('tokens', 'Tokens', 'text-right')}
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Verdienst
              </th>
              {th('tph', 'TK/Std.', 'text-right')}
              {th('category', 'Kategorie')}
              <th scope="col" className="px-3 py-3 text-left font-medium">
                Toys
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((x) => (
              <tr key={x.id} className={`border-t border-white/5 transition-colors hover:bg-white/[0.03] ${selected.has(x.id) ? 'bg-sky-500/[0.06]' : ''}`}>
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Stream vom ${formatDay(x.date)} auswählen`}
                    className="h-4 w-4 accent-sky-400"
                    checked={selected.has(x.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(x.id)) n.delete(x.id);
                        else n.add(x.id);
                        return n;
                      })
                    }
                  />
                </td>
                <td className="px-3 py-2.5 text-slate-200">
                  {formatDay(x.date)}
                  {x.start && <span className="block text-xs text-slate-500">{x.start} Uhr</span>}
                  {x.notes && (
                    <span className="block max-w-[14rem] truncate text-xs text-slate-500" title={x.notes}>
                      {x.notes}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{duration(x.durationMin)}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-white">{num(x.tokens)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{money(earnings(x.tokens, s), s)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{num(tphOf(x))}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">{x.category}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex flex-wrap gap-1">
                    {(x.toys.length ? x.toys : ['Kein Toy']).map((t) => (
                      <span key={t} className="rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] text-slate-300">
                        {t}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <button type="button" onClick={() => setEditing(x)} aria-label={`Stream vom ${formatDay(x.date)} bearbeiten`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
                    <PencilIcon size={14} />
                  </button>
                  <button type="button" onClick={() => setConfirm([x.id])} aria-label={`Stream vom ${formatDay(x.date)} löschen`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/15 hover:text-rose-300">
                    <TrashIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="px-6 py-10 text-center text-sm text-slate-500">{data.streams.length ? 'Keine Streams passen zu den Filtern.' : 'Noch keine Streams eingetragen.'}</p>}
      </div>

      {/* Karten (Mobil) */}
      <ul className="space-y-2 md:hidden">
        {rows.slice(0, limit).map((x) => (
          <li key={x.id} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{formatDay(x.date)}</p>
                <p className="text-xs text-slate-500">
                  {x.start ? `${x.start} Uhr · ` : ''}
                  {duration(x.durationMin)} · {x.category}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums text-white">{num(x.tokens)} TK</p>
                <p className="text-xs text-slate-500">{money(earnings(x.tokens, s), s)}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-slate-400">{x.toys.join(', ') || 'Kein Toy'}</span>
              <span className="flex shrink-0 gap-1">
                <button type="button" onClick={() => setEditing(x)} aria-label="Bearbeiten" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10">
                  <PencilIcon size={14} />
                </button>
                <button type="button" onClick={() => setConfirm([x.id])} aria-label="Löschen" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/15 hover:text-rose-300">
                  <TrashIcon size={14} />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {rows.length > limit && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => setLimit((l) => l + 25)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/5">
            Weitere {Math.min(25, rows.length - limit)} anzeigen
          </button>
        </div>
      )}

      {editing && <StreamForm data={data} entry={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {confirm && (
        <Modal title={confirm.length === 1 ? 'Stream löschen' : `${confirm.length} Streams löschen`} onClose={() => setConfirm(null)}>
          <p className="text-sm text-slate-300">{confirm.length === 1 ? 'Dieser Eintrag wird endgültig gelöscht.' : 'Die ausgewählten Einträge werden endgültig gelöscht.'}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => {
                deleteStreams(userId, confirm);
                setSelected((prev) => new Set([...prev].filter((id) => !confirm.includes(id))));
                setConfirm(null);
              }}
              className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
            >
              Löschen
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Einstellungen ---------- */

function ListManager({ title, items, onChange, protectedItems = [] }: { title: string; items: string[]; onChange: (v: string[]) => void; protectedItems?: string[] }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().slice(0, 40);
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft('');
  };
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
      <h3 className="font-oswald text-lg tracking-wide text-white">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((t) => (
          <li key={t} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-3 pr-1 text-xs text-slate-200">
            {t}
            {!protectedItems.includes(t) && (
              <button type="button" onClick={() => onChange(items.filter((x) => x !== t))} aria-label={`${t} entfernen`} className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-rose-500/15 hover:text-rose-300">
                <XIcon size={11} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input className={input} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Neuer Eintrag …" />
        <button type="button" onClick={add} aria-label={`${title}: hinzufügen`} className="grid w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">
          <PlusIcon size={16} />
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Entfernen ändert keine bereits eingetragenen Streams.</p>
    </section>
  );
}

export function FinanceSettingsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anon';
  const data = useFinance(userId);
  const s = data.settings;
  const [confirmClear, setConfirmClear] = useState(false);
  const decimal = (v: string) => Number(v.replace(',', '.'));

  return (
    <div>
      <FinanceNav active="settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <h3 className="font-oswald text-lg tracking-wide text-white">Verdienst-Berechnung</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">Auszahlung pro Token (USD)</span>
              <input inputMode="decimal" className={input} defaultValue={String(s.payoutPerToken).replace('.', ',')} onBlur={(e) => decimal(e.target.value) > 0 && updateSettings(userId, { payoutPerToken: decimal(e.target.value) })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">Anzeige-Währung</span>
              <select className={input} value={s.currency} onChange={(e) => updateSettings(userId, { currency: e.target.value as 'USD' | 'EUR' })}>
                <option value="USD" className="bg-slate-900">US-Dollar ($)</option>
                <option value="EUR" className="bg-slate-900">Euro (€)</option>
              </select>
            </label>
            {s.currency === 'EUR' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-300">Kurs: 1 USD = … EUR</span>
                <input inputMode="decimal" className={input} defaultValue={String(s.usdToEur).replace('.', ',')} onBlur={(e) => decimal(e.target.value) > 0 && updateSettings(userId, { usdToEur: decimal(e.target.value) })} />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">Monatsziel (Tokens, 0 = aus)</span>
              <input inputMode="numeric" className={input} defaultValue={s.monthlyGoal || ''} placeholder="0" onBlur={(e) => updateSettings(userId, { monthlyGoal: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </label>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Chaturbate zahlt Broadcastern üblicherweise 0,05 USD pro Token – prüfe deine eigenen Konditionen. Der Euro-Kurs wird nicht automatisch aktualisiert; trage ihn bei Bedarf selbst ein.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <h3 className="font-oswald text-lg tracking-wide text-white">Daten</h3>
          <p className="mt-2 text-sm text-slate-400">
            {data.streams.length} Streams gespeichert. Die Daten liegen im Demo-Modus nur in diesem Browser – sichere sie regelmäßig per CSV-Export unter „Streams“.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => loadSampleData(userId)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5">
              Beispieldaten hinzufügen
            </button>
            {confirmClear ? (
              <span className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    clearFinance(userId);
                    setConfirmClear(false);
                  }}
                  className="rounded-xl bg-rose-500 px-4 py-2.5 font-semibold text-white"
                >
                  Wirklich alles löschen
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className="rounded-xl px-3 py-2.5 text-slate-300 hover:bg-white/5">
                  Abbrechen
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} disabled={!data.streams.length} className="rounded-xl border border-rose-400/30 px-4 py-2.5 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-30">
                Alle Daten löschen
              </button>
            )}
          </div>
        </section>

        <ListManager title="Kategorien" items={data.categories} onChange={(v) => setCategories(userId, v)} />
        <ListManager title="Toys" items={data.toys} onChange={(v) => setToys(userId, v)} protectedItems={['Kein Toy']} />
      </div>
    </div>
  );
}
