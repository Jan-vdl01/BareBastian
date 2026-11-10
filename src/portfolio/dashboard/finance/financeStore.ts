/**
 * Finanz-Tool: Einnahmen pro Stream (Demo: localStorage, pro Benutzer getrennt).
 */
import { readJSON, uid, useStoredValue, writeJSON } from '../../lib/localStore';

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

const key = (userId: string) => `bb_finance_${userId}`;

const empty = (): FinanceData => ({
  version: 1,
  settings: { payoutPerToken: 0.05, currency: 'USD', usdToEur: 0.92, monthlyGoal: 0 },
  categories: [...DEFAULT_CATEGORIES],
  toys: [...DEFAULT_TOYS],
  streams: [],
});

export function readFinance(userId: string): FinanceData {
  const d = readJSON<FinanceData | null>(key(userId), null);
  return d?.version === 1 ? { ...empty(), ...d, settings: { ...empty().settings, ...d.settings } } : empty();
}

export function useFinance(userId: string): FinanceData {
  const d = useStoredValue<FinanceData | null>(key(userId), null);
  return d?.version === 1 ? { ...empty(), ...d, settings: { ...empty().settings, ...d.settings } } : empty();
}

const update = (userId: string, fn: (d: FinanceData) => FinanceData) => writeJSON(key(userId), fn(readFinance(userId)));

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
export const clearFinance = (userId: string) => writeJSON(key(userId), empty());

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

/** Importiert eine mit diesem Tool exportierte CSV-Datei. Bereits vorhandene Einträge werden übersprungen. */
export function importCsv(userId: string, text: string): { added: number; skipped: number } {
  const known = new Set(readFinance(userId).streams.map(fingerprint));
  let skipped = 0;
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length || !lines[0].startsWith('Datum')) throw new Error('Unbekanntes Format – bitte eine aus dem Finanz-Tool exportierte CSV-Datei verwenden.');
  let n = 0;
  for (const line of lines.slice(1)) {
    const [date, start, dur, tokens, category, toys, followers, notes] = parseCsvLine(line);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) continue;
    const entry = {
      date,
      start: /^\d{2}:\d{2}$/.test(start ?? '') ? start : '',
      durationMin: Math.max(0, Number(dur) || 0),
      tokens: Math.max(0, Math.round(Number(tokens) || 0)),
      category: (category ?? '').trim(),
      toys: (toys ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      followers: Math.max(0, Math.round(Number(followers) || 0)),
      notes: notes ?? '',
    };
    const fp = fingerprint(entry);
    if (known.has(fp)) {
      skipped++;
      continue;
    }
    known.add(fp);
    saveStream(userId, entry);
    n++;
  }
  if (!n && !skipped) throw new Error('Keine gültigen Zeilen gefunden.');
  return { added: n, skipped };
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
