/**
 * HTML-Design-Vorlagen für die Chaturbate-Bio („About Me“).
 *
 * Erzeugt reines HTML mit Inline-Styles – ohne <style>, <script>, Klassen oder externe CSS,
 * da Plattformen wie Chaturbate solche Elemente üblicherweise entfernen. Vor dem Veröffentlichen
 * das Ergebnis in der Chaturbate-Vorschau prüfen.
 */
import { buildBlocks, escapeHtml, tagsFromInput, type BioInput, type Block } from './generateBio';

export type TemplateId = 'neon' | 'minimal' | 'gradient' | 'elegant' | 'retro';
export type FontId = 'sans' | 'serif' | 'mono' | 'rounded' | 'bold';
export type DividerId = 'line' | 'dots' | 'hearts' | 'stars' | 'none';

export interface BioDesign {
  template: TemplateId;
  accent: string;
  accent2: string;
  font: FontId;
  radius: number;
  align: 'center' | 'left';
  headline: string;
  tagline: string;
  headerImage: string;
  divider: DividerId;
  sections: {
    about: boolean;
    schedule: boolean;
    tipMenu: boolean;
    wishList: boolean;
    rules: boolean;
    tags: boolean;
  };
}

interface Palette {
  pageBg: string;
  text: string;
  muted: string;
  cardBg: string;
  cardBorder: string;
  heading: string;
  headline: string;
  headlineShadow: string;
  pillBg: string;
  pillText: string;
}

export interface TemplateDef {
  id: TemplateId;
  name: string;
  description: string;
  accent: string;
  accent2: string;
  font: FontId;
  radius: number;
  palette: (a: string, b: string) => Palette;
}

export const FONTS: Record<FontId, { label: string; css: string }> = {
  sans: { label: 'Modern', css: 'Arial, Helvetica, sans-serif' },
  rounded: { label: 'Freundlich', css: '"Trebuchet MS", Verdana, sans-serif' },
  serif: { label: 'Elegant', css: 'Georgia, "Times New Roman", serif' },
  mono: { label: 'Retro', css: '"Courier New", Courier, monospace' },
  bold: { label: 'Kräftig', css: 'Impact, "Arial Black", Arial, sans-serif' },
};

export const COLOR_PRESETS: [string, string][] = [
  ['#22d3ee', '#a855f7'],
  ['#6366f1', '#ec4899'],
  ['#f97316', '#facc15'],
  ['#10b981', '#06b6d4'],
  ['#ef4444', '#f472b6'],
  ['#b08d57', '#d4b483'],
  ['#2563eb', '#0ea5e9'],
  ['#ff5ecf', '#ffd84d'],
];

const HEX = /^#[0-9a-f]{6}$/i;
export const safeHex = (value: string, fallback: string) => (HEX.test(value) ? value : fallback);

export function rgba(hex: string, alpha: number): string {
  const h = safeHex(hex, '#888888').slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'neon',
    name: 'Neon Night',
    description: 'Dunkel mit leuchtenden Akzenten',
    accent: '#22d3ee',
    accent2: '#a855f7',
    font: 'sans',
    radius: 18,
    palette: (a, b) => ({
      pageBg: `linear-gradient(160deg,#0a0a12 0%,#140a24 100%)`,
      text: '#f1f1f7',
      muted: 'rgba(241,241,247,0.72)',
      cardBg: 'rgba(255,255,255,0.04)',
      cardBorder: `1px solid ${rgba(a, 0.45)}`,
      heading: a,
      headline: '#ffffff',
      headlineShadow: `0 0 12px ${rgba(a, 0.85)}, 0 0 30px ${rgba(b, 0.55)}`,
      pillBg: `linear-gradient(90deg,${a},${b})`,
      pillText: '#0a0a12',
    }),
  },
  {
    id: 'minimal',
    name: 'Clean',
    description: 'Hell, ruhig und modern',
    accent: '#2563eb',
    accent2: '#0ea5e9',
    font: 'sans',
    radius: 14,
    palette: (a) => ({
      pageBg: '#ffffff',
      text: '#1f2933',
      muted: '#52606d',
      cardBg: '#f7f8fa',
      cardBorder: '1px solid #e4e7eb',
      heading: a,
      headline: '#111827',
      headlineShadow: 'none',
      pillBg: rgba(a, 0.12),
      pillText: a,
    }),
  },
  {
    id: 'gradient',
    name: 'Sunset Glow',
    description: 'Farbverlauf mit Glas-Karten',
    accent: '#6366f1',
    accent2: '#ec4899',
    font: 'rounded',
    radius: 22,
    palette: (a, b) => ({
      pageBg: `linear-gradient(135deg,${a} 0%,${b} 100%)`,
      text: '#ffffff',
      muted: 'rgba(255,255,255,0.88)',
      cardBg: 'rgba(255,255,255,0.14)',
      cardBorder: '1px solid rgba(255,255,255,0.32)',
      heading: '#ffffff',
      headline: '#ffffff',
      headlineShadow: '0 2px 14px rgba(0,0,0,0.25)',
      pillBg: '#ffffff',
      pillText: a,
    }),
  },
  {
    id: 'elegant',
    name: 'Elegance',
    description: 'Creme, Serifen & Gold',
    accent: '#b08d57',
    accent2: '#d4b483',
    font: 'serif',
    radius: 6,
    palette: (a) => ({
      pageBg: '#fbf7f1',
      text: '#3b3029',
      muted: '#7a6a5d',
      cardBg: '#ffffff',
      cardBorder: `1px solid ${rgba(a, 0.35)}`,
      heading: a,
      headline: '#2b211b',
      headlineShadow: 'none',
      pillBg: rgba(a, 0.14),
      pillText: '#6b5232',
    }),
  },
  {
    id: 'retro',
    name: 'Retro Arcade',
    description: 'Verspielt mit Pixel-Vibes',
    accent: '#ff5ecf',
    accent2: '#ffd84d',
    font: 'mono',
    radius: 0,
    palette: (a, b) => ({
      pageBg: '#1d1135',
      text: '#ffe9f5',
      muted: 'rgba(255,233,245,0.76)',
      cardBg: 'rgba(0,0,0,0.25)',
      cardBorder: `2px dashed ${a}`,
      heading: b,
      headline: a,
      headlineShadow: `3px 3px 0 ${b}`,
      pillBg: a,
      pillText: '#1d1135',
    }),
  },
];

export const getTemplate = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export function defaultDesign(template: TemplateId = 'neon'): BioDesign {
  const t = getTemplate(template);
  return {
    template: t.id,
    accent: t.accent,
    accent2: t.accent2,
    font: t.font,
    radius: t.radius,
    align: 'center',
    headline: '',
    tagline: '',
    headerImage: '',
    divider: 'line',
    sections: { about: true, schedule: true, tipMenu: true, wishList: true, rules: true, tags: true },
  };
}

const HEADINGS = {
  about: { de: 'Über mich', en: 'About me' },
  schedule: { de: 'Live-Zeiten', en: 'Schedule' },
  tipMenu: { de: 'Tip-Menü', en: 'Tip menu' },
  wishList: { de: 'Wunschliste', en: 'Wish list' },
} as const;

/** Prüft, ob eine Bild-URL verwendbar ist (nur https, keine Anführungszeichen). */
export const isSafeImageUrl = (url: string) => /^https:\/\/[^\s"'<>]+$/i.test(url.trim());

export function renderBioDesign(input: BioInput, design: BioDesign): string {
  const t = getTemplate(design.template);
  const a = safeHex(design.accent, t.accent);
  const b = safeHex(design.accent2, t.accent2);
  const p = t.palette(a, b);
  const font = FONTS[design.font]?.css ?? FONTS.sans.css;
  const r = Math.max(0, Math.min(32, Math.round(design.radius)));
  const align = design.align === 'left' ? 'left' : 'center';
  const langs: ('de' | 'en')[] = input.language === 'both' ? ['de', 'en'] : [input.language];
  const blocksByLang = langs.map((l) => ({ lang: l, blocks: buildBlocks(input, l) }));
  const emo = (blk: Block) => (input.emojis && blk.emoji ? `${blk.emoji} ` : '');
  const heading = (key: keyof typeof HEADINGS) => langs.map((l) => HEADINGS[key][l]).join(' · ');

  const divider = (() => {
    switch (design.divider) {
      case 'none':
        return '';
      case 'line':
        return t.id === 'gradient'
          ? `<div style="height:2px;width:60%;margin:22px auto;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent);"></div>`
          : `<div style="height:2px;width:60%;margin:22px auto;background:linear-gradient(90deg,transparent,${a},${b},transparent);"></div>`;
      default: {
        const sym = { dots: '•  •  •', hearts: '♥  ♥  ♥', stars: '✦  ✦  ✦' }[design.divider];
        return `<div style="text-align:center;margin:18px 0;color:${t.id === 'gradient' ? '#ffffff' : a};letter-spacing:6px;font-size:14px;">${sym}</div>`;
      }
    }
  })();

  const card = (title: string, body: string) =>
    `<div style="background:${p.cardBg};border:${p.cardBorder};border-radius:${r}px;padding:18px 20px;margin:14px 0;text-align:${align};">` +
    `<div style="color:${p.heading};font-weight:bold;font-size:15px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">${escapeHtml(title)}</div>` +
    body +
    `</div>`;

  const para = (html: string, muted = false) =>
    `<p style="margin:0 0 10px 0;color:${muted ? p.muted : p.text};font-size:15px;">${html}</p>`;

  const pill = (text: string) =>
    `<span style="display:inline-block;background:${p.pillBg};color:${p.pillText};border-radius:999px;padding:3px 12px;font-size:13px;font-weight:bold;white-space:nowrap;">${escapeHtml(text)}</span>`;

  const parts: string[] = [];

  // Kopfbereich
  if (isSafeImageUrl(design.headerImage)) {
    parts.push(
      `<img src="${escapeHtml(design.headerImage.trim())}" alt="" style="display:block;width:100%;max-width:100%;height:auto;border-radius:${r}px;margin:0 0 20px 0;">`,
    );
  }
  const title = design.headline.trim() || input.stageName.trim() || 'Your Name';
  parts.push(
    `<div style="font-size:38px;line-height:1.15;font-weight:bold;letter-spacing:2px;color:${p.headline};text-shadow:${p.headlineShadow};text-align:${align};">${escapeHtml(title)}</div>`,
  );
  if (design.tagline.trim()) {
    parts.push(`<div style="margin-top:8px;font-size:16px;color:${p.muted};text-align:${align};">${escapeHtml(design.tagline.trim())}</div>`);
  }
  if (design.sections.tags) {
    const tags = tagsFromInput(input);
    if (tags.length) parts.push(`<div style="margin-top:14px;text-align:${align};">${tags.map(pill).join(' ')}</div>`);
  }
  parts.push(divider);

  // Über mich
  if (design.sections.about) {
    const body = blocksByLang
      .map(({ blocks }, i) => {
        const lines = blocks
          .filter((blk) => ['greet', 'intro', 'personality', 'hobbies', 'speaks', 'extra'].includes(blk.key))
          .map((blk) => para(`${emo(blk)}${escapeHtml(blk.text ?? '')}`, blk.key !== 'greet'))
          .join('');
        const sep = i > 0 ? `<div style="height:1px;background:${rgba(a, 0.3)};margin:12px 0;"></div>` : '';
        return sep + lines;
      })
      .join('');
    parts.push(card(heading('about'), body));
  }

  // Live-Zeiten
  if (design.sections.schedule && input.schedule.trim()) {
    parts.push(card(heading('schedule'), para(`${input.emojis ? '📅 ' : ''}${escapeHtml(input.schedule.trim())}`)));
  }

  // Tip-Menü
  const tips = [...input.tipMenu].filter((x) => x.label.trim() && x.tokens > 0).sort((x, y) => x.tokens - y.tokens);
  if (design.sections.tipMenu && tips.length) {
    const rows = tips
      .map(
        (x, i) =>
          `<tr><td style="padding:8px 0;color:${p.text};font-size:15px;text-align:left;${i < tips.length - 1 ? `border-bottom:1px solid ${rgba(a, 0.2)};` : ''}">${escapeHtml(x.label.trim())}</td>` +
          `<td style="padding:8px 0;text-align:right;${i < tips.length - 1 ? `border-bottom:1px solid ${rgba(a, 0.2)};` : ''}">${pill(`${x.tokens} tk`)}</td></tr>`,
      )
      .join('');
    parts.push(card(heading('tipMenu'), `<table style="width:100%;border-collapse:collapse;">${rows}</table>`));
  }

  // Wunschliste
  const wishes = input.wishList.map((w) => w.trim()).filter(Boolean);
  if (design.sections.wishList && wishes.length) {
    parts.push(card(heading('wishList'), wishes.map((w) => para(`${input.emojis ? '🎁 ' : '• '}${escapeHtml(w)}`)).join('')));
  }

  // Raumregeln
  if (design.sections.rules && input.includeRoomRules) {
    const body = blocksByLang
      .map(({ blocks }) => {
        const rules = blocks.find((blk) => blk.key === 'rules');
        return rules ? (rules.items ?? []).map((item) => para(`• ${escapeHtml(item)}`, true)).join('') : '';
      })
      .join(`<div style="height:1px;background:${rgba(a, 0.3)};margin:12px 0;"></div>`);
    const title = blocksByLang.map(({ blocks }) => blocks.find((blk) => blk.key === 'rules')?.title ?? '').filter(Boolean).join(' · ');
    if (body) parts.push(card(`${input.emojis ? '📜 ' : ''}${title}`, body));
  }

  // Abschluss
  parts.push(divider);
  const outro = blocksByLang
    .map(({ blocks }) => blocks.find((blk) => blk.key === 'outro'))
    .filter((blk): blk is Block => Boolean(blk))
    .map((blk) => `<div style="font-weight:bold;color:${p.heading};font-size:16px;margin:4px 0;">${emo(blk)}${escapeHtml(blk.text ?? '')}</div>`)
    .join('');
  parts.push(`<div style="text-align:${align};">${outro}</div>`);

  return (
    `<div style="max-width:680px;margin:0 auto;padding:28px 22px;box-sizing:border-box;background:${p.pageBg};color:${p.text};font-family:${font.replace(/"/g, "'")};border-radius:${r}px;line-height:1.6;text-align:${align};">\n` +
    parts.filter(Boolean).join('\n') +
    `\n</div>`
  );
}
