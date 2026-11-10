import { useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { PROFILE } from '../../data';
import { ArrowLeft, DownloadIcon } from '../../icons';
import { navigate } from '../../router';
import { LineChart } from './charts';
import { downloadFinancePdf } from './pdfExport';
import {
  byCategory,
  byToy,
  byWeekday,
  cumulative,
  duration,
  earnings,
  extraStats,
  formatDay,
  inPeriod,
  money,
  num,
  periodFor,
  RANGES,
  startTimeBlocks,
  totals,
  useFinance,
  type RangeId,
} from './financeStore';

function Table({ title, head, rows, right = [] }: { title: string; head: string[]; rows: (string | number)[][]; right?: number[] }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#2a78d6]">{title}</h2>
      {rows.length ? (
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-[#0b0b0b] text-left">
              {head.map((h, i) => (
                <th key={h} scope="col" className={`px-2 py-1.5 font-semibold ${right.includes(i) ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="break-inside-avoid border-b border-[#e7e6e2] even:bg-[#f7f7f5]">
                {r.map((c, j) => (
                  <td key={j} className={`px-2 py-1 ${right.includes(j) ? 'text-right tabular-nums' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-[11px] text-[#77766f]">Keine Daten im Zeitraum.</p>
      )}
    </section>
  );
}

/** Druckoptimierter Finanzbericht (A4) – „Als PDF speichern“ im Druckdialog. */
export function FinanceReport({ query }: { query: URLSearchParams }) {
  const { user, profile } = useAuth();
  const data = useFinance(user?.id ?? 'anon');
  const s = data.settings;
  const range = (RANGES.some((r) => r.id === query.get('range')) ? query.get('range') : '30d') as RangeId;
  const period = useMemo(() => periodFor(range, data.streams), [range, data.streams]);
  const list = useMemo(() => data.streams.filter((x) => inPeriod(x, period.from, period.to)).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)), [data.streams, period]);
  const t = totals(list);
  const cum = useMemo(() => cumulative(list, period.from, period.days, s), [list, period, s]);
  const extra = useMemo(() => extraStats(list, period, data.streams), [list, period, data.streams]);

  useEffect(() => {
    const prev = document.title;
    document.title = `Finanzbericht ${period.from} bis ${period.to}`;
    if (query.get('print') === '1') {
      const id = setTimeout(() => window.print(), 900);
      return () => {
        clearTimeout(id);
        document.title = prev;
      };
    }
    return () => {
      document.title = prev;
    };
  }, [period.from, period.to, query]);

  const kpis: [string, string][] = [
    ['Verdienst', money(earnings(t.tokens, s), s)],
    ['Tokens', num(t.tokens)],
    ['Streams', num(t.streams)],
    ['Stream-Zeit', duration(t.minutes)],
    ['Tokens / Std.', num(t.tokensPerHour)],
    ['Ø Tokens / Stream', num(t.tokensPerStream)],
    ['Neue Follower', num(t.followers)],
    ['Längste Serie', `${extra.longestStreak} Tage`],
  ];

  return (
    <div className="min-h-dvh bg-[#e9e8e4] py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 px-4 print:hidden">
        <button type="button" onClick={() => navigate('/abo-bereich/finanzen')} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#52514e] hover:bg-black/5">
          <ArrowLeft size={15} /> Zurück
        </button>
        <select aria-label="Zeitraum" className="rounded-lg border border-[#c9c8c3] bg-white px-3 py-2 text-sm text-[#0b0b0b]" value={range} onChange={(e) => navigate(`/abo-bereich/finanzen/bericht?range=${e.target.value}`, { replace: true })}>
          {RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <span className="flex-1" />
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-[#c9c8c3] bg-white px-4 py-2 text-sm text-[#0b0b0b] hover:bg-[#f7f7f5]">
          Drucken
        </button>
        <button type="button" onClick={() => downloadFinancePdf(data, range, profile?.displayName ?? '')} className="inline-flex items-center gap-2 rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#256abf]">
          <DownloadIcon size={15} /> PDF herunterladen
        </button>
      </div>

      <article className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[#0b0b0b] shadow-xl print:max-w-none print:p-0 print:shadow-none" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
        <header className="flex items-start justify-between border-b-2 border-[#0b0b0b] pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2a78d6]">{PROFILE.name} · Finanz-Tool</p>
            <h1 className="mt-1 text-2xl font-bold" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
              Finanzbericht
            </h1>
            <p className="text-xs text-[#52514e]">
              {profile?.displayName} · {formatDay(period.from)} – {formatDay(period.to)}
            </p>
          </div>
          <p className="text-right text-[10px] text-[#77766f]">
            Erstellt am
            <br />
            {new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </header>

        <section className="mt-5 grid grid-cols-4 gap-2">
          {kpis.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-[#e7e6e2] p-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#77766f]">{k}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums">{v}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#2a78d6]">Gesamteinnahmen im Verlauf (kumuliert)</h2>
          <div className="rounded-lg border border-[#e7e6e2] p-3">
            <LineChart palette="light" height={220} ariaLabel="Kumulierte Einnahmen" labels={cum.map((c) => c.label)} format={(v) => money(v, s)} series={[{ id: 'now', label: 'Einnahmen', primary: true, values: cum.map((c) => c.value) }]} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-x-6">
          <Table title="Nach Kategorie" head={['Kategorie', 'Streams', 'Tokens', 'TK/Std.']} right={[1, 2, 3]} rows={byCategory(list).map((c) => [c.name, c.streams, num(c.tokens), num(c.tokensPerHour)])} />
          <Table title="Nach Toy" head={['Toy', 'Streams', 'Tokens', 'TK/Std.']} right={[1, 2, 3]} rows={byToy(list).map((c) => [c.name, c.streams, num(c.tokens), num(c.tokensPerHour)])} />
          <Table title="Nach Wochentag" head={['Tag', 'Streams', 'Ø Tokens']} right={[1, 2]} rows={byWeekday(list).map((w) => [w.label, w.streams, num(w.avgTokens)])} />
          <Table title="Nach Startzeit" head={['Startzeit', 'Streams', 'TK/Std.']} right={[1, 2]} rows={startTimeBlocks(list).filter((b) => b.streams).map((b) => [b.label, b.streams, num(b.tokensPerHour)])} />
        </div>

        <Table
          title={`Alle Streams im Zeitraum (${list.length})`}
          head={['Datum', 'Start', 'Länge', 'Kategorie', 'Toys', 'Tokens', 'Verdienst']}
          right={[5, 6]}
          rows={list.map((x) => [formatDay(x.date), x.start || '–', duration(x.durationMin), x.category, x.toys.join(', ') || 'Kein Toy', num(x.tokens), money(earnings(x.tokens, s), s)])}
        />

        <footer className="mt-6 border-t border-[#e7e6e2] pt-2 text-[9px] leading-relaxed text-[#77766f]">
          Verdienst berechnet mit {num(s.payoutPerToken, 3)} USD pro Token{s.currency === 'EUR' ? ` und einem selbst eingetragenen Kurs von 1 USD = ${num(s.usdToEur, 4)} EUR` : ''}. Angaben ohne Gewähr – maßgeblich sind die Abrechnungen der Plattform.
        </footer>
      </article>
    </div>
  );
}
