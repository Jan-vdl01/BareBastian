/**
 * Farb- und Schrift-Vorlagen (Themes) für den modularen Bio-Baukasten.
 * Das HTML selbst erzeugt bio-builder/renderChaturbate.ts.
 */

export type TemplateId = 'neon' | 'minimal' | 'gradient' | 'elegant' | 'retro';
export type FontId = 'sans' | 'serif' | 'mono' | 'rounded' | 'bold';
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
