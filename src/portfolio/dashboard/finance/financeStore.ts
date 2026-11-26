/**
 * Finanz-Tool: Einnahmen pro Stream (pro Benutzer auf dem Server gespeichert).
 */
import { uid } from '../../lib/localStore';
import { csvRowSchema, financeSchema } from '../../lib/schemas';
import { defineUserStore, describeIssues } from '../../lib/store';

export interface StreamEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM oder leer */
  start: string;
  durationMin: number;
  tokens: number;
  category: string;
  toys: string[];
  followers: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSettings {
  /** Auszahlung pro Token in USD (Chaturbate: üblicherweise 0,05 USD) */
  payoutPerToken: number;
  currency: 'USD' | 'EUR';
  /** Selbst eingetragener Umrechnungskurs USD → EUR */
  usdToEur: number;
  /** Monatsziel in Tokens (0 = aus) */
  monthlyGoal: number;
}

export interface FinanceData {
  version: 1;
  settings: FinanceSettings;
  categories: string[];
  toys: string[];
  streams: StreamEntry[];
}

export const DEFAULT_CATEGORIES = ['Public Show', 'Private Show', 'Spy Show', 'Ticket-/Gruppenshow', 'Fan-Club', 'Cam2Cam'];
export const DEFAULT_TOYS = ['Lovense Edge 2', 'Lovense Solace Pro', 'Fuck-Machine', 'Lovense Lush', 'Dildo', 'Kein Toy'];

const empty = (): FinanceData => ({
  version: 1,
  settings: { payoutPerToken: 0.05, currency: 'USD', usdToEur: 0.92, monthlyGoal: 0 },
  categories: [...DEFAULT_CATEGORIES],
  toys: [...DEFAULT_TOYS],
  streams: [],
});

/** Validierter Speicher pro Benutzer (fehlende Einstellungen werden ergänzt). */
const financeStore = defineUserStore<FinanceData>('bb_finance_', {
  schema: financeSchema,
  fallback: empty,
  migrate: (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const d = raw as Partial<FinanceData>;
    return { ...empty(), ...d, settings: { ...empty().settings, ...(d.settings ?? {}) } };
  },
});

export const readFinance = (userId: string) => financeStore.forUser(userId).read();
export const useFinance = (userId: string) => financeStore.use(userId);
const update = (userId: string, fn: (d: FinanceData) => FinanceData) => financeStore.forUser(userId).update(fn);

export type StreamInput = Omit<StreamEntry, 'id' | 'createdAt' | 'updatedAt'>;

export function saveStream(userId: string, input: StreamInput, id?: string) {
  const now = new Date().toISOString();
  update(userId, (d) => {
    const exists = id && d.streams.some((s) => s.id === id);
    const streams = exists
      ? d.streams.map((s) => (s.id === id ? { ...s, ...input, updatedAt: now } : s))
      : [{ ...input, id: uid('st-'), createdAt: now, updatedAt: now }, ...d.streams];
    // Neue Kategorien/Toys automatisch in die Listen übernehmen
    const categories = input.category && !d.categories.includes(input.category) ? [...d.categories, input.category] : d.categories;
    const toys = [...d.toys, ...input.toys.filter((t) => !d.toys.includes(t))];
    return { ...d, streams, categories, toys };
  });
}

export const deleteStreams = (userId: string, ids: string[]) => update(userId, (d) => ({ ...d, streams: d.streams.filter((s) => !ids.includes(s.id)) }));
export const updateSettings = (userId: string, patch: Partial<FinanceSettings>) => update(userId, (d) => ({ ...d, settings: { ...d.settings, ...patch } }));
export const setCategories = (userId: string, categories: string[]) => update(userId, (d) => ({ ...d, categories }));
export const setToys = (userId: string, toys: string[]) => update(userId, (d) => ({ ...d, toys }));
export const clearFinance = (userId: string) => financeStore.forUser(userId).write(empty());

/* ---------- Formatierung ---------- */

export const earnings = (tokens: number, s: FinanceSettings) => tokens * s.payoutPerToken * (s.currency === 'EUR' ? s.usdToEur : 1);
export const money = (value: number, s: FinanceSettings) => value.toLocaleString('de-DE', { style: 'currency', currency: s.currency, maximumFractionDigits: value >= 1000 ? 0 : 2 });
export const num = (n: number, digits = 0) => n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const compact = (n: number) => (Math.abs(n) >= 10000 ? `${num(n / 1000, 1)}K` : num(n));
export const duration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h ${m ? `${m} min` : ''}`.trim() : `${m} min`;
};
export const formatDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ---------- Zeiträume ---------- */

export type RangeId = '7d' | '30d' | '90d' | 'month' | 'year' | 'all';
export const RANGES: { id: RangeId; label: string }[] = [
  { id: '7d', label: '7 Tage' },
  { id: '30d', label: '30 Tage' },
  { id: '90d', label: '90 Tage' },
  { id: 'month', label: 'Dieser Monat' },
  { id: 'year', label: 'Dieses Jahr' },
  { id: 'all', label: 'Gesamt' },
];

export interface Period {
  from: string;
  to: string;
  prevFrom?: string;
  prevTo?: string;
  days: number;
}

export function periodFor(range: RangeId, streams: StreamEntry[], now = new Date()): Period {
  const to = iso(now);
  const back = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return iso(d);
  };
  const mk = (from: string, days: number): Period => {
    const f = new Date(`${from}T12:00:00`);
    const pt = new Date(f);
    pt.setDate(pt.getDate() - 1);
    const pf = new Date(pt);
    pf.setDate(pf.getDate() - (days - 1));
    return { from, to, prevFrom: iso(pf), prevTo: iso(pt), days };
  };
  switch (range) {
    case '7d':
      return mk(back(6), 7);
    case '30d':
      return mk(back(29), 30);
    case '90d':
      return mk(back(89), 90);
    case 'month': {
      const from = iso(new Date(now.getFullYear(), now.getMonth(), 1));
      return mk(from, now.getDate());
    }
    case 'year': {
      const from = iso(new Date(now.getFullYear(), 0, 1));
      const days = Math.round((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
      return mk(from, days);
    }
    case 'all': {
      const first = streams.reduce((m, s) => (s.date < m ? s.date : m), to);
      const days = Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / 86400000) + 1;
      return { from: first, to, days };
    }
  }
}

export const inPeriod = (s: StreamEntry, from: string, to: string) => s.date >= from && s.date <= to;

/* ---------- Auswertung ---------- */

export interface Totals {
  streams: number;
  tokens: number;
  minutes: number;
  followers: number;
  tokensPerHour: number;
  tokensPerStream: number;
}

export function totals(list: StreamEntry[]): Totals {
  const tokens = list.reduce((a, s) => a + s.tokens, 0);
  const minutes = list.reduce((a, s) => a + s.durationMin, 0);
  return {
    streams: list.length,
    tokens,
    minutes,
    followers: list.reduce((a, s) => a + (s.followers || 0), 0),
    tokensPerHour: minutes ? tokens / (minutes / 60) : 0,
    tokensPerStream: list.length ? tokens / list.length : 0,
  };
}

export interface Bucket {
  key: string;
  label: string;
  tokens: number;
  streams: number;
  minutes: number;
}

/** Zeitreihe: Tage (≤ 31 Tage), Wochen (≤ 182 Tage) oder Monate. */
export function timeSeries(list: StreamEntry[], period: Period): { unit: 'Tag' | 'Woche' | 'Monat'; buckets: Bucket[] } {
  const unit = period.days <= 31 ? 'Tag' : period.days <= 182 ? 'Woche' : 'Monat';
  const buckets = new Map<string, Bucket>();
  const start = new Date(`${period.from}T12:00:00`);
  const end = new Date(`${period.to}T12:00:00`);
  const keyOf = (d: Date) => {
    if (unit === 'Tag') return iso(d);
    if (unit === 'Monat') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = new Date(d);
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); // Montag der Woche
    return iso(m);
  };
  const labelOf = (k: string) => {
    if (unit === 'Monat') return new Date(`${k}-15T12:00:00`).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
    const d = new Date(`${k}T12:00:00`);
    return unit === 'Woche' ? `KW ${weekNumber(d)}` : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = keyOf(d);
    if (!buckets.has(k)) buckets.set(k, { key: k, label: labelOf(k), tokens: 0, streams: 0, minutes: 0 });
  }
  for (const s of list) {
    const k = keyOf(new Date(`${s.date}T12:00:00`));
    const b = buckets.get(k);
    if (b) {
      b.tokens += s.tokens;
      b.streams += 1;
      b.minutes += s.durationMin;
    }
  }
  return { unit, buckets: [...buckets.values()] };
}

function weekNumber(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

export interface GroupStat {
  name: string;
  streams: number;
  tokens: number;
  minutes: number;
  tokensPerHour: number;
  tokensPerStream: number;
}

const group = (list: StreamEntry[], keys: (s: StreamEntry) => string[]): GroupStat[] => {
  const map = new Map<string, GroupStat>();
  for (const s of list) {
    for (const k of keys(s)) {
      const g = map.get(k) ?? { name: k, streams: 0, tokens: 0, minutes: 0, tokensPerHour: 0, tokensPerStream: 0 };
      g.streams += 1;
      g.tokens += s.tokens;
      g.minutes += s.durationMin;
      map.set(k, g);
    }
  }
  return [...map.values()]
    .map((g) => ({ ...g, tokensPerHour: g.minutes ? g.tokens / (g.minutes / 60) : 0, tokensPerStream: g.streams ? g.tokens / g.streams : 0 }))
    .sort((a, b) => b.tokens - a.tokens);
};

export const byCategory = (list: StreamEntry[]) => group(list, (s) => [s.category || 'Ohne Kategorie']);
export const byToy = (list: StreamEntry[]) => group(list, (s) => (s.toys.length ? s.toys : ['Kein Toy']));

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export function byWeekday(list: StreamEntry[]): { label: string; avgTokens: number; streams: number }[] {
  const acc = WEEKDAYS.map((label) => ({ label, tokens: 0, streams: 0 }));
  for (const s of list) {
    const i = (new Date(`${s.date}T12:00:00`).getDay() + 6) % 7;
    acc[i].tokens += s.tokens;
    acc[i].streams += 1;
  }
  return acc.map((a) => ({ label: a.label, streams: a.streams, avgTokens: a.streams ? a.tokens / a.streams : 0 }));
}

/* ---------- CSV ---------- */

const CSV_HEAD = ['Datum', 'Start', 'Dauer (Min)', 'Tokens', 'Kategorie', 'Toys', 'Neue Follower', 'Notiz'];
const esc = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(list: StreamEntry[]): string {
  return [CSV_HEAD.join(';'), ...list.map((s) => [s.date, s.start, s.durationMin, s.tokens, s.category, s.toys.join(', '), s.followers, s.notes].map(esc).join(';'))].join('\r\n');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ';') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const fingerprint = (x: { date: string; start: string; durationMin: number; tokens: number; category: string }) => `${x.date}|${x.start}|${x.durationMin}|${x.tokens}|${x.category}`;

export interface CsvImportResult {
  added: number;
  skipped: number;
  invalid: number;
  errors: string[];
}

/** Importiert eine mit diesem Tool exportierte CSV-Datei. Jede Zeile wird geprüft; vorhandene Einträge werden übersprungen. */
export function importCsv(userId: string, text: string): CsvImportResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length || !lines[0].startsWith('Datum')) throw new Error('Unbekanntes Format – bitte eine aus dem Finanz-Tool exportierte CSV-Datei verwenden.');
  const known = new Set(readFinance(userId).streams.map(fingerprint));
  const result: CsvImportResult = { added: 0, skipped: 0, invalid: 0, errors: [] };
  lines.slice(1).forEach((line, i) => {
    const [date, start, dur, tokens, category, toys, followers, notes] = parseCsvLine(line);
    const parsed = csvRowSchema.safeParse({
      date: (date ?? '').trim(),
      start: (start ?? '').trim(),
      durationMin: Number(dur),
      tokens: Number(tokens),
      category: (category ?? '').trim(),
      toys: (toys ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      followers: Number(followers || 0),
      notes: notes ?? '',
    });
    if (!parsed.success) {
      result.invalid++;
      if (result.errors.length < 5) result.errors.push(`Zeile ${i + 2}: ${describeIssues(parsed.error)}`);
      return;
    }
    const fp = fingerprint(parsed.data);
    if (known.has(fp)) {
      result.skipped++;
      return;
    }
    known.add(fp);
    saveStream(userId, parsed.data);
    result.added++;
  });
  if (!result.added && !result.skipped && !result.invalid) throw new Error('Keine Datenzeilen gefunden.');
  return result;
}

/* ---------- Beispieldaten ---------- */

export function loadSampleData(userId: string) {
  const d = readFinance(userId);
  const rnd = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
  const now = new Date();
  for (let i = 0; i < 46; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() - rnd(0, 120));
    const category = d.categories[Math.random() < 0.6 ? 0 : rnd(1, d.categories.length - 1)];
    const toys = d.toys.filter((t) => t !== 'Kein Toy' && Math.random() < 0.3).slice(0, 2);
    const durationMin = rnd(45, 240);
    const base = category.startsWith('Private') ? 9 : category.startsWith('Ticket') ? 7 : 4;
    saveStream(userId, {
      date: iso(day),
      start: `${String(rnd(18, 23)).padStart(2, '0')}:${['00', '15', '30', '45'][rnd(0, 3)]}`,
      durationMin,
      tokens: Math.round(durationMin * base * (0.6 + Math.random()) * (toys.includes('Fuck-Machine') ? 1.5 : 1)),
      category,
      toys: toys.length ? toys : ['Kein Toy'],
      followers: rnd(0, 60),
      notes: '',
    });
  }
}

/* ---------- Erweiterte Auswertung ---------- */

export interface CumulativePoint {
  /** Tag im Zeitraum (0-basiert) */
  index: number;
  label: string;
  date: string;
  /** kumulierter Verdienst */
  value: number;
  /** Tokens an diesem Tag */
  dayTokens: number;
}

/** Kumulierter Verdienst Tag für Tag im Zeitraum (Monate bei sehr langen Zeiträumen). */
export function cumulative(list: StreamEntry[], from: string, days: number, s: FinanceSettings): CumulativePoint[] {
  const byDay = new Map<string, number>();
  for (const x of list) byDay.set(x.date, (byDay.get(x.date) ?? 0) + x.tokens);
  const out: CumulativePoint[] = [];
  let acc = 0;
  const start = new Date(`${from}T12:00:00`);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = iso(d);
    const t = byDay.get(key) ?? 0;
    acc += earnings(t, s);
    out.push({ index: i, date: key, label: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: days > 366 ? '2-digit' : undefined }), value: acc, dayTokens: t });
  }
  return out;
}

export interface ExtraStats {
  avgDuration: number;
  medianTokens: number;
  longestStreak: number;
  streamsPerWeek: number;
  activeWeeksShare: number;
  tokensPerFollower: number;
  projectedMonthTokens: number | null;
  bestHourBlock: { label: string; tokensPerHour: number } | null;
  bestStream: StreamEntry | null;
}

export function extraStats(list: StreamEntry[], period: Period, all: StreamEntry[], now = new Date()): ExtraStats {
  const sorted = [...list].map((x) => x.tokens).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : 0;
  // längste Serie aufeinanderfolgender Stream-Tage
  const days = [...new Set(list.map((x) => x.date))].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = new Date(`${d}T12:00:00`);
    run = prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }
  // Anteil Wochen mit mind. einem Stream
  const weeks = Math.max(1, Math.ceil(period.days / 7));
  const weekKeys = new Set(list.map((x) => Math.floor((new Date(`${x.date}T12:00:00`).getTime() - new Date(`${period.from}T12:00:00`).getTime()) / (7 * 86400000))));
  const followers = list.reduce((a, x) => a + (x.followers || 0), 0);
  const tokens = list.reduce((a, x) => a + x.tokens, 0);
  // Hochrechnung für den laufenden Monat (auf Basis aller Daten des Monats)
  const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthTokens = all.filter((x) => x.date >= monthStart && x.date <= iso(now)).reduce((a, x) => a + x.tokens, 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = now.getDate() >= 3 ? Math.round((monthTokens / now.getDate()) * daysInMonth) : null;
  // bester Startzeit-Block (3 Stunden) nach Tokens/Std.
  const blocks = startTimeBlocks(list).filter((b) => b.minutes >= 60);
  const best = [...blocks].sort((a, b) => b.tokensPerHour - a.tokensPerHour)[0];
  return {
    avgDuration: list.length ? list.reduce((a, x) => a + x.durationMin, 0) / list.length : 0,
    medianTokens: median,
    longestStreak: longest,
    streamsPerWeek: list.length / (period.days / 7),
    activeWeeksShare: Math.min(1, weekKeys.size / weeks),
    tokensPerFollower: followers ? tokens / followers : 0,
    projectedMonthTokens: projected,
    bestHourBlock: best ? { label: best.label, tokensPerHour: best.tokensPerHour } : null,
    bestStream: list.length ? list.reduce((m, x) => (x.tokens > m.tokens ? x : m), list[0]) : null,
  };
}

/** Tokens pro Stunde nach Startzeit (Blöcke à 3 Stunden). */
export function startTimeBlocks(list: StreamEntry[]) {
  const blocks = Array.from({ length: 8 }, (_, i) => ({ label: `${String(i * 3).padStart(2, '0')}–${String(i * 3 + 3).padStart(2, '0')} Uhr`, tokens: 0, minutes: 0, streams: 0, tokensPerHour: 0 }));
  for (const x of list) {
    if (!/^\d{2}:\d{2}$/.test(x.start)) continue;
    const b = blocks[Math.floor(Number(x.start.slice(0, 2)) / 3)];
    b.tokens += x.tokens;
    b.minutes += x.durationMin;
    b.streams += 1;
  }
  return blocks.map((b) => ({ ...b, tokensPerHour: b.minutes ? b.tokens / (b.minutes / 60) : 0 }));
}

/** Verteilung der Streams nach Token-Spannen. */
export function tokenDistribution(list: StreamEntry[]) {
  if (!list.length) return [];
  const max = Math.max(...list.map((x) => x.tokens));
  const raw = Math.max(1, max / 6);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((v) => v >= raw) ?? raw;
  const n = Math.max(1, Math.ceil((max + 1) / step));
  const buckets = Array.from({ length: n }, (_, i) => ({ label: `${num(i * step)}–${num((i + 1) * step - 1)}`, count: 0 }));
  for (const x of list) buckets[Math.min(n - 1, Math.floor(x.tokens / step))].count += 1;
  return buckets;
}
