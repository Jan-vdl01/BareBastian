/**
 * Finanzbericht als echte PDF-Datei (jsPDF + jspdf-autotable).
 * Vektor-Diagramm, durchsuchbarer Text, automatische Seitenumbrüche, Seitenzahlen.
 */
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { PROFILE } from '../../data';
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
  type FinanceData,
  type RangeId,
} from './financeStore';

const BLUE: [number, number, number] = [42, 120, 214];
const INK: [number, number, number] = [11, 11, 11];
const MUTED: [number, number, number] = [119, 118, 111];
const GRID: [number, number, number] = [231, 230, 226];

/** Standard-PDF-Schriften können nur WinAnsi – Emojis & Sonderzeichen entfernen. */
const ALLOWED_EXTRA = '€–—„“”‚‘’•…ØøÄÖÜäöüß';
export const pdfText = (s: string | number) =>
  String(s)
    .replace(/[  ]/g, ' ')
    .replace(/[^\u0000-ÿ]/g, (c) => (ALLOWED_EXTRA.includes(c) ? c : ''))
    .replace(/\s{2,}/g, ' ')
    .trim();

function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((x) => x >= raw) ?? raw;
  const t: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) t.push(v);
  if (t[t.length - 1] < max) t.push(t[t.length - 1] + step);
  return t;
}

export function downloadFinancePdf(data: FinanceData, range: RangeId, ownerName: string) {
  const s = data.settings;
  const period = periodFor(range, data.streams);
  const list = data.streams.filter((x) => inPeriod(x, period.from, period.to)).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const t = totals(list);
  const extra = extraStats(list, period, data.streams);
  const cum = cumulative(list, period.from, period.days, s);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const CW = W - M * 2;
  let y = M;

  // Kopf
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...BLUE);
  doc.text(pdfText(`${PROFILE.name} · FINANZ-TOOL`), M, y + 2, { charSpace: 0.6 });
  doc.setFontSize(20).setTextColor(...INK).text('Finanzbericht', M, y + 11);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED);
  doc.text(pdfText(`${ownerName} · ${formatDay(period.from)} – ${formatDay(period.to)} · ${RANGES.find((r) => r.id === range)?.label ?? ''}`), M, y + 17);
  doc.setFontSize(7.5).text(pdfText(`Erstellt am ${new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`), W - M, y + 2, { align: 'right' });
  y += 21;
  doc.setDrawColor(...INK).setLineWidth(0.5).line(M, y, W - M, y);
  y += 6;

  // Kennzahlen (4 × 2)
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
  const kw = (CW - 3 * 3) / 4;
  kpis.forEach(([k, v], i) => {
    const x = M + (i % 4) * (kw + 3);
    const yy = y + Math.floor(i / 4) * 17;
    doc.setDrawColor(...GRID).setLineWidth(0.3).roundedRect(x, yy, kw, 14, 1.5, 1.5);
    doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(...MUTED).text(pdfText(k.toUpperCase()), x + 3, yy + 4.5);
    doc.setFontSize(12).setTextColor(...INK).text(pdfText(v), x + 3, yy + 11);
  });
  y += 36;

  // Kumuliertes Liniendiagramm (Vektor)
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...BLUE).text('GESAMTEINNAHMEN IM VERLAUF (KUMULIERT)', M, y);
  y += 3;
  const ch = 62;
  doc.setDrawColor(...GRID).setLineWidth(0.3).roundedRect(M, y, CW, ch, 1.5, 1.5);
  const px = M + 18;
  const pw = CW - 24;
  const py = y + 7;
  const ph = ch - 16;
  const max = Math.max(0, ...cum.map((c) => c.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const X = (i: number) => px + (cum.length <= 1 ? pw / 2 : (i / (cum.length - 1)) * pw);
  const Y = (v: number) => py + ph - (v / top) * ph;
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED);
  for (const tk of ticks) {
    doc.setDrawColor(...GRID).setLineWidth(0.2).line(px, Y(tk), px + pw, Y(tk));
    doc.text(pdfText(money(tk, s)), px - 2, Y(tk) + 1, { align: 'right' });
  }
  if (cum.length) {
    // Fläche
    const pts = cum.map((c, i) => [X(i), Y(c.value)] as [number, number]);
    const area: [number, number][] = [...pts, [X(cum.length - 1), py + ph], [X(0), py + ph]];
    doc.setFillColor(219, 232, 248);
    doc.lines(
      area.slice(1).map((p, i) => [p[0] - area[i][0], p[1] - area[i][1]]),
      area[0][0],
      area[0][1],
      [1, 1],
      'F',
      true,
    );
    // Linie
    doc.setDrawColor(...BLUE).setLineWidth(0.6);
    doc.lines(
      pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]),
      pts[0][0],
      pts[0][1],
      [1, 1],
      'S',
      false,
    );
    const last = pts[pts.length - 1];
    doc.setFillColor(...BLUE).setDrawColor(255, 255, 255).setLineWidth(0.6).circle(last[0], last[1], 1.2, 'FD');
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...INK).text(pdfText(money(cum[cum.length - 1].value, s)), last[0] - 2, last[1] - 2.5, { align: 'right' });
    // X-Beschriftung
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED);
    const every = Math.max(1, Math.ceil(cum.length / 8));
    cum.forEach((c, i) => {
      const nearEnd = i !== cum.length - 1 && cum.length - 1 - i < every * 0.7;
      if ((i % every === 0 && !nearEnd) || i === cum.length - 1) doc.text(pdfText(c.label), X(i), py + ph + 4.5, { align: i === 0 ? 'left' : i === cum.length - 1 ? 'right' : 'center' });
    });
  }
  y += ch + 8;

  // Tabellen
  const table = (title: string, head: string[], body: (string | number)[][], opts: { x?: number; width?: number; startY?: number; right?: number[] } = {}) => {
    const startY = opts.startY ?? y;
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...BLUE).text(pdfText(title.toUpperCase()), opts.x ?? M, startY);
    autoTable(doc, {
      startY: startY + 2,
      margin: { left: opts.x ?? M, right: opts.width ? W - (opts.x ?? M) - opts.width : M },
      tableWidth: opts.width ?? 'auto',
      head: [head.map(pdfText)],
      body: body.length ? body.map((r) => r.map(pdfText)) : [[{ content: 'Keine Daten im Zeitraum', colSpan: head.length, styles: { textColor: MUTED, fontStyle: 'italic' } }]],
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.6, textColor: INK, lineColor: GRID },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      columnStyles: Object.fromEntries((opts.right ?? []).map((c) => [c, { halign: 'right' as const }])),
      didParseCell: (hook) => {
        if (hook.section === 'head' && (opts.right ?? []).includes(hook.column.index)) hook.cell.styles.halign = 'right';
      },
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  const half = (CW - 6) / 2;
  const a1 = table('Nach Kategorie', ['Kategorie', 'Streams', 'Tokens', 'TK/Std.'], byCategory(list).map((c) => [c.name, c.streams, num(c.tokens), num(c.tokensPerHour)]), { width: half, right: [1, 2, 3] });
  const a2 = table('Nach Toy', ['Toy', 'Streams', 'Tokens', 'TK/Std.'], byToy(list).map((c) => [c.name, c.streams, num(c.tokens), num(c.tokensPerHour)]), { x: M + half + 6, width: half, startY: y, right: [1, 2, 3] });
  y = Math.max(a1, a2) + 9;
  if (y > 250) {
    doc.addPage();
    y = M + 4;
  }
  const b1 = table('Nach Wochentag', ['Tag', 'Streams', 'Ø Tokens'], byWeekday(list).map((w) => [w.label, w.streams, num(w.avgTokens)]), { width: half, right: [1, 2] });
  const b2 = table('Nach Startzeit', ['Startzeit', 'Streams', 'TK/Std.'], startTimeBlocks(list).filter((b) => b.streams).map((b) => [b.label, b.streams, num(b.tokensPerHour)]), { x: M + half + 6, width: half, startY: y, right: [1, 2] });
  y = Math.max(b1, b2) + 9;
  if (y > 260) {
    doc.addPage();
    y = M + 4;
  }
  table(
    `Alle Streams im Zeitraum (${list.length})`,
    ['Datum', 'Start', 'Länge', 'Kategorie', 'Toys', 'Tokens', 'Verdienst'],
    list.map((x) => [formatDay(x.date), x.start || '–', duration(x.durationMin), x.category, x.toys.join(', ') || 'Kein Toy', num(x.tokens), money(earnings(x.tokens, s), s)]),
    { right: [5, 6] },
  );

  // Fußzeile mit Seitenzahlen
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...GRID).setLineWidth(0.2).line(M, H - 10, W - M, H - 10);
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED);
    doc.text(
      pdfText(`Verdienst berechnet mit ${num(s.payoutPerToken, 3)} USD pro Token${s.currency === 'EUR' ? ` und 1 USD = ${num(s.usdToEur, 4)} EUR (manuell)` : ''}. Angaben ohne Gewähr.`),
      M,
      H - 6,
    );
    doc.text(`Seite ${i} von ${pages}`, W - M, H - 6, { align: 'right' });
  }

  doc.setProperties({ title: `Finanzbericht ${period.from} bis ${period.to}`, author: pdfText(ownerName), creator: `${PROFILE.name} Finanz-Tool` });
  doc.save(`Finanzbericht_${period.from}_bis_${period.to}.pdf`);
}
