import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Schlanke SVG-Diagramme für das Finanz-Tool (dunkle Oberfläche).
 * Regeln: eine Serie = eine Farbe, Balken ≤ 24 px mit 4 px gerundetem Ende,
 * Haarlinien-Raster, sparsame Direktbeschriftung, Tooltip per Hover/Fokus, Tabellenansicht.
 */
export const VIZ = {
  series: '#3987e5', // Kategorie-Slot 1 (Dunkelmodus)
  seriesSoft: 'rgba(57,135,229,0.12)',
  grid: 'rgba(255,255,255,0.08)',
  text: '#f0efec',
  textSecondary: '#c3c2b7',
  textMuted: '#8d8c86',
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

/** Saubere Achsenwerte (1, 2, 2,5, 5 × 10^n). */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

const tickLabel = (v: number) => (v >= 10000 ? `${(v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}K` : v.toLocaleString('de-DE'));

/** Balken mit 4 px gerundetem Datenende, eckig an der Basislinie. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export interface ColumnDatum {
  label: string;
  value: number;
  /** Zusätzliche Zeilen im Tooltip */
  details?: string[];
}

export function ColumnChart({ data, height = 230, format, ariaLabel }: { data: ColumnDatum[]; height?: number; format: (v: number) => string; ariaLabel: string }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 46;
  const padB = 26;
  const padT = 18;
  const innerW = Math.max(0, w - padL - 4);
  const innerH = height - padB - padT;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band * 0.62));
  const every = Math.max(1, Math.ceil(44 / Math.max(band, 1)));
  const maxIdx = data.findIndex((d) => d.value === max && max > 0);
  const y = (v: number) => padT + innerH - (v / top) * innerH;

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - 4} y1={y(t)} y2={y(t)} stroke={VIZ.grid} strokeWidth={1} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={VIZ.textMuted}>
                {tickLabel(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = padL + i * band + (band - barW) / 2;
            const h = (d.value / top) * innerH;
            return (
              <g key={d.label + i}>
                {d.value > 0 && <path d={columnPath(x, y(d.value), barW, h)} fill={VIZ.series} opacity={hover === null || hover === i ? 1 : 0.45} />}
                {i === maxIdx && (
                  <text x={x + barW / 2} y={y(d.value) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ.text}>
                    {format(d.value)}
                  </text>
                )}
                {i % every === 0 && (
                  <text x={padL + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={VIZ.textMuted}>
                    {d.label}
                  </text>
                )}
                {/* Trefferfläche: ganze Spalte, größer als der Balken */}
                <rect
                  x={padL + i * band}
                  y={padT}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.label}: ${format(d.value)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  style={{ outline: 'none' }}
                />
              </g>
            );
          })}
          <line x1={padL} x2={w - 4} y1={padT + innerH} y2={padT + innerH} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
        </svg>
      )}
      {hover !== null && data[hover] && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0b0f18]/95 px-3 py-2 text-xs shadow-xl"
          style={{ left: Math.min(Math.max(padL + hover * band + band / 2, 80), w - 80), top: Math.max(0, y(data[hover].value) - 70) }}
        >
          <p className="font-semibold" style={{ color: VIZ.text }}>
            {data[hover].label}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5" style={{ color: VIZ.textSecondary }}>
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: VIZ.series }} /> {format(data[hover].value)}
          </p>
          {data[hover].details?.map((t) => (
            <p key={t} style={{ color: VIZ.textMuted }}>
              {t}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  details?: string[];
}

/** Horizontale Balken – Name links, Wert an der Balkenspitze. */
export function BarList({ data, format, ariaLabel, empty = 'Keine Daten im Zeitraum.' }: { data: BarDatum[]; format: (v: number) => string; ariaLabel: string; empty?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-8 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2.5" aria-label={ariaLabel}>
      {data.map((d, i) => (
        <li
          key={d.label}
          tabIndex={0}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          className="relative grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-lg px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
        >
          <span className="truncate text-sm" style={{ color: VIZ.textSecondary }} title={d.label}>
            {d.label}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="block h-4 rounded-r-[4px] transition-opacity"
              style={{ width: `${max ? Math.max(1.5, (d.value / max) * 82) : 0}%`, background: VIZ.series, opacity: hover === null || hover === i ? 1 : 0.45 }}
            />
            <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: VIZ.text }}>
              {format(d.value)}
            </span>
          </span>
          {hover === i && d.details?.length ? (
            <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-10 mt-1 rounded-xl border border-white/10 bg-[#0b0f18]/95 px-3 py-2 text-xs shadow-xl">
              <span className="block font-semibold" style={{ color: VIZ.text }}>
                {d.label}
              </span>
              {d.details.map((t) => (
                <span key={t} className="block" style={{ color: VIZ.textMuted }}>
                  {t}
                </span>
              ))}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Karte mit Titel und umschaltbarer Tabellenansicht. */
export function ChartCard({ title, subtitle, children, table, right }: { title: string; subtitle?: string; children: ReactNode; table?: { head: string[]; rows: (string | number)[][] }; right?: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={id} className="font-oswald text-lg tracking-wide text-white">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          {table && (
            <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/5">
              {asTable ? 'Diagramm' : 'Tabelle'}
            </button>
          )}
        </div>
      </div>
      {asTable && table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                {table.head.map((h) => (
                  <th key={h} scope="col" className="px-2 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-white/5">
                  {r.map((c, j) => (
                    <td key={j} className={`px-2 py-1.5 ${j ? 'tabular-nums text-slate-200' : 'text-slate-300'}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/* ---------- Linien-Diagramm (kumuliert) ---------- */

export const PALETTES = {
  dark: { series: '#3987e5', compare: '#8d8c86', grid: 'rgba(255,255,255,0.08)', axis: 'rgba(255,255,255,0.18)', text: '#f0efec', textSecondary: '#c3c2b7', textMuted: '#8d8c86', surface: '#0f1420' },
  light: { series: '#2a78d6', compare: '#8a8984', grid: '#e7e6e2', axis: '#c9c8c3', text: '#0b0b0b', textSecondary: '#52514e', textMuted: '#77766f', surface: '#ffffff' },
} as const;

export interface LineSeries {
  id: string;
  label: string;
  /** Primäre Serie bekommt Flächenfüllung, Endpunkt & Direktlabel */
  primary?: boolean;
  values: number[];
}

export function LineChart({
  series,
  labels,
  format,
  ariaLabel,
  height = 280,
  palette = 'dark',
  tooltipExtra,
}: {
  series: LineSeries[];
  labels: string[];
  format: (v: number) => string;
  ariaLabel: string;
  height?: number;
  palette?: keyof typeof PALETTES;
  tooltipExtra?: (index: number) => string | undefined;
}) {
  const P = PALETTES[palette];
  const { ref, w } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const padL = 56;
  const padR = 18;
  const padT = 22;
  const padB = 28;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;
  const max = Math.max(0, ...series.flatMap((s) => s.values));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const primary = series.find((s) => s.primary) ?? series[0];
  const lastIdx = n - 1;
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 70))));
  const gradId = useId().replace(/:/g, '');
  const color = (s: LineSeries) => (s.primary ? P.series : P.compare);

  const onMove = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - padL;
    const i = Math.round((rel / Math.max(1, innerW)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-4 text-xs" aria-label="Legende" style={{ color: P.textSecondary }}>
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-5 rounded" style={{ background: color(s), height: 2 }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={ref} className="relative" style={{ height }}>
        {w > 0 && n > 0 && (
          <svg
            width={w}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            className="outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
            onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
              if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
              if (e.key === 'Escape') setHover(null);
            }}
            onBlur={() => setHover(null)}
          >
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={P.series} stopOpacity={0.18} />
                <stop offset="100%" stopColor={P.series} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={P.grid} strokeWidth={1} />
                <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={P.textMuted}>
                  {format(t)}
                </text>
              </g>
            ))}
            {labels.map((l, i) =>
              i % every === 0 || i === lastIdx ? (
                <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle'} fontSize={11} fill={P.textMuted}>
                  {l}
                </text>
              ) : null,
            )}
            <line x1={padL} x2={w - padR} y1={padT + innerH} y2={padT + innerH} stroke={P.axis} strokeWidth={1} />
            {/* Fläche nur unter der primären Serie */}
            <path d={`${path(primary.values)} L${x(lastIdx)},${padT + innerH} L${x(0)},${padT + innerH} Z`} fill={`url(#${gradId})`} />
            {series
              .filter((s) => !s.primary)
              .map((s) => (
                <path key={s.id} d={path(s.values)} fill="none" stroke={color(s)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
              ))}
            <path d={path(primary.values)} fill="none" stroke={P.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* Endpunkt mit Ring in Oberflächenfarbe + Direktlabel */}
            <circle cx={x(lastIdx)} cy={y(primary.values[lastIdx])} r={5} fill={P.series} stroke={P.surface} strokeWidth={2} />
            <text x={x(lastIdx) - 8} y={y(primary.values[lastIdx]) - 12} textAnchor="end" fontSize={12} fontWeight={700} fill={P.text}>
              {format(primary.values[lastIdx])}
            </text>
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke={P.axis} strokeWidth={1} />
                {series.map((s) => (
                  <circle key={s.id} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={color(s)} stroke={P.surface} strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
        )}
        {hover !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-xl border px-3 py-2 text-xs shadow-xl"
            style={{
              left: Math.min(Math.max(x(hover) + 12, 0), Math.max(0, w - 190)),
              background: palette === 'dark' ? 'rgba(11,15,24,0.95)' : '#ffffff',
              borderColor: palette === 'dark' ? 'rgba(255,255,255,0.1)' : '#e7e6e2',
            }}
          >
            <p className="font-semibold" style={{ color: P.text }}>
              {labels[hover]}
            </p>
            {series.map((s) => (
              <p key={s.id} className="mt-0.5 flex items-center gap-1.5" style={{ color: P.textSecondary }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: color(s) }} />
                {s.label}: <b style={{ color: P.text }}>{format(s.values[hover])}</b>
              </p>
            ))}
            {tooltipExtra?.(hover) && <p style={{ color: P.textMuted }}>{tooltipExtra(hover)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
