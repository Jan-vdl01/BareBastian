/**
 * Design-Themes und Schriften für den Chaturbate-Bio-Baukasten.
 * Jedes Theme liefert Design-Tokens, die der Renderer als Inline-CSS ausgibt.
 * Jede Box kann diese Werte über ihren eigenen Stil überschreiben.
 */

export type FontId =
  | 'sans'
  | 'helvetica'
  | 'verdana'
  | 'tahoma'
  | 'rounded'
  | 'segoe'
  | 'serif'
  | 'times'
  | 'palatino'
  | 'garamond'
  | 'mono'
  | 'console'
  | 'bold'
  | 'black'
  | 'comic';

/** Nur systemweit verfügbare Schriften – Chaturbate erlaubt keine eingebundenen Webfonts. */
export const FONTS: Record<FontId, { label: string; css: string; group: 'Serifenlos' | 'Serif' | 'Monospace' | 'Display' }> = {
  sans: { label: 'Arial', css: 'Arial, Helvetica, sans-serif', group: 'Serifenlos' },
  helvetica: { label: 'Helvetica', css: 'Helvetica, Arial, sans-serif', group: 'Serifenlos' },
  verdana: { label: 'Verdana', css: 'Verdana, Geneva, sans-serif', group: 'Serifenlos' },
  tahoma: { label: 'Tahoma', css: 'Tahoma, Geneva, sans-serif', group: 'Serifenlos' },
  rounded: { label: 'Trebuchet MS', css: "'Trebuchet MS', Verdana, sans-serif", group: 'Serifenlos' },
  segoe: { label: 'Segoe UI / System', css: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", group: 'Serifenlos' },
  serif: { label: 'Georgia', css: "Georgia, 'Times New Roman', serif", group: 'Serif' },
  times: { label: 'Times New Roman', css: "'Times New Roman', Times, serif", group: 'Serif' },
  palatino: { label: 'Palatino', css: "'Palatino Linotype', Palatino, 'Book Antiqua', serif", group: 'Serif' },
  garamond: { label: 'Garamond', css: "Garamond, 'EB Garamond', Georgia, serif", group: 'Serif' },
  mono: { label: 'Courier New', css: "'Courier New', Courier, monospace", group: 'Monospace' },
  console: { label: 'Lucida Console', css: "'Lucida Console', Monaco, monospace", group: 'Monospace' },
  bold: { label: 'Impact', css: "Impact, 'Arial Black', Arial, sans-serif", group: 'Display' },
  black: { label: 'Arial Black', css: "'Arial Black', Gadget, Arial, sans-serif", group: 'Display' },
  comic: { label: 'Comic Sans MS', css: "'Comic Sans MS', 'Comic Sans', cursive", group: 'Display' },
};

export const fontCss = (id: string | undefined, fallback: FontId = 'sans') => (FONTS[id as FontId] ?? FONTS[fallback]).css;

export interface ThemeTokens {
  /** Hintergrund der Box (Farbe oder Verlauf) */
  boxBg: string;
  boxBorder: string;
  /** Optionale Akzentkante oben (wie „glühende“ Oberkante) */
  boxBorderTop?: string;
  boxShadow: string;
  text: string;
  muted: string;
  heading: string;
  headline: string;
  headlineShadow: string;
  innerBg: string;
  innerBorder: string;
  pillBg: string;
  pillText: string;
  eyebrowBg: string;
  eyebrowBorder: string;
  eyebrowText: string;
  buttonBg: string;
  buttonText: string;
  buttonShadow: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  description: string;
  accent: string;
  accent2: string;
  font: FontId;
  headingFont: FontId;
  radius: number;
  tokens: (a: string, b: string) => ThemeTokens;
}

const HEX = /^#[0-9a-f]{6}$/i;
export const safeHex = (value: string | undefined, fallback: string) => (value && HEX.test(value) ? value : fallback);

export function rgba(hex: string, alpha: number): string {
  const h = safeHex(hex, '#888888').slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Bausteine für dunkle Themes */
const dark = (o: { bg: string; text?: string; muted?: string; a: string; b: string; top?: boolean; glow?: number; inner?: string }): ThemeTokens => ({
  boxBg: o.bg,
  boxBorder: `1px solid ${rgba(o.a, 0.28)}`,
  boxBorderTop: o.top ? `2px solid ${o.a}` : undefined,
  boxShadow: o.glow ? `0 0 ${o.glow}px ${rgba(o.a, 0.25)}` : 'none',
  text: o.text ?? '#f3f1f4',
  muted: o.muted ?? 'rgba(243,241,244,0.72)',
  heading: o.a,
  headline: '#ffffff',
  headlineShadow: `0 0 18px ${rgba(o.a, 0.6)}`,
  innerBg: o.inner ?? 'rgba(255,255,255,0.05)',
  innerBorder: `1px solid ${rgba(o.a, 0.3)}`,
  pillBg: `linear-gradient(90deg,${o.a},${o.b})`,
  pillText: '#ffffff',
  eyebrowBg: rgba(o.a, 0.12),
  eyebrowBorder: `1px solid ${rgba(o.a, 0.45)}`,
  eyebrowText: o.a,
  buttonBg: `linear-gradient(90deg,${o.a},${o.b})`,
  buttonText: '#ffffff',
  buttonShadow: `0 4px 16px ${rgba(o.a, 0.4)}`,
  chipBg: 'rgba(255,255,255,0.05)',
  chipBorder: `1px solid ${rgba(o.a, 0.35)}`,
  chipText: o.text ?? '#f3f1f4',
});

/** Bausteine für helle Themes */
const light = (o: { bg: string; text: string; muted: string; a: string; b: string; inner: string; border: string }): ThemeTokens => ({
  boxBg: o.bg,
  boxBorder: `1px solid ${o.border}`,
  boxShadow: `0 6px 24px ${rgba(o.a, 0.12)}`,
  text: o.text,
  muted: o.muted,
  heading: o.a,
  headline: o.text,
  headlineShadow: 'none',
  innerBg: o.inner,
  innerBorder: `1px solid ${o.border}`,
  pillBg: rgba(o.a, 0.14),
  pillText: o.a,
  eyebrowBg: rgba(o.a, 0.1),
  eyebrowBorder: `1px solid ${rgba(o.a, 0.35)}`,
  eyebrowText: o.a,
  buttonBg: `linear-gradient(90deg,${o.a},${o.b})`,
  buttonText: '#ffffff',
  buttonShadow: `0 4px 14px ${rgba(o.a, 0.3)}`,
  chipBg: '#ffffff',
  chipBorder: `1px solid ${o.border}`,
  chipText: o.text,
});

export const THEMES: ThemeDef[] = [
  {
    id: 'inferno',
    name: 'Inferno Studio',
    description: 'Glühendes Rot-Orange auf Dunkelrot – dein Profil-Look',
    accent: '#ff5a1f',
    accent2: '#e11d2e',
    font: 'segoe',
    headingFont: 'black',
    radius: 18,
    tokens: (a, b) => ({
      ...dark({ bg: 'linear-gradient(180deg,#2a0f0d 0%,#170a0a 55%,#120909 100%)', a, b, top: true, glow: 22, inner: 'rgba(120,20,20,0.28)' }),
      heading: '#ffffff',
      headlineShadow: `0 0 24px ${rgba(a, 0.55)}`,
      eyebrowText: a,
      pillBg: `linear-gradient(90deg,${b},${a})`,
      buttonBg: `linear-gradient(90deg,${b},${a})`,
    }),
  },
  {
    id: 'neon',
    name: 'Neon Night',
    description: 'Cyan & Violett, leuchtend',
    accent: '#22d3ee',
    accent2: '#a855f7',
    font: 'sans',
    headingFont: 'sans',
    radius: 18,
    tokens: (a, b) => ({ ...dark({ bg: 'linear-gradient(160deg,#0a0a12 0%,#140a24 100%)', a, b, glow: 18 }), pillText: '#0a0a12' }),
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    description: 'Schwarz & Gold, luxuriös',
    accent: '#d4af37',
    accent2: '#f5d77a',
    font: 'serif',
    headingFont: 'palatino',
    radius: 6,
    tokens: (a, b) => ({ ...dark({ bg: 'linear-gradient(180deg,#0d0d0d,#171310)', a, b, top: true }), heading: a, pillText: '#1a1405', buttonText: '#1a1405' }),
  },
  {
    id: 'cyber',
    name: 'Cyber Grid',
    description: 'Magenta & Cyan, Terminal-Look',
    accent: '#00ffd5',
    accent2: '#ff2bd6',
    font: 'console',
    headingFont: 'console',
    radius: 2,
    tokens: (a, b) => ({
      ...dark({ bg: 'linear-gradient(135deg,#05010d 0%,#0f0524 100%)', a, b, glow: 26 }),
      boxBorder: `1px solid ${a}`,
      headlineShadow: `2px 2px 0 ${b}, -2px -2px 0 ${a}`,
      pillText: '#05010d',
      buttonText: '#05010d',
    }),
  },
  {
    id: 'lava',
    name: 'Lava Lamp',
    description: 'Violett trifft Orange',
    accent: '#ff7a18',
    accent2: '#af002d',
    font: 'rounded',
    headingFont: 'bold',
    radius: 24,
    tokens: (a, b) => dark({ bg: 'linear-gradient(135deg,#2b0a3d 0%,#3d0a2a 50%,#4a1505 100%)', a, b, glow: 20 }),
  },
  {
    id: 'toxic',
    name: 'Toxic Lime',
    description: 'Schwarz & Neon-Grün',
    accent: '#a3ff12',
    accent2: '#16f2b4',
    font: 'verdana',
    headingFont: 'black',
    radius: 12,
    tokens: (a, b) => ({ ...dark({ bg: '#0b0f08', a, b, top: true, glow: 16 }), pillText: '#0b0f08', buttonText: '#0b0f08' }),
  },
  {
    id: 'royal',
    name: 'Royal Velvet',
    description: 'Tiefes Violett mit Gold',
    accent: '#c9a227',
    accent2: '#7b2ff7',
    font: 'palatino',
    headingFont: 'palatino',
    radius: 14,
    tokens: (a, b) => dark({ bg: 'linear-gradient(160deg,#1b0b33 0%,#2d0f4a 100%)', a, b, glow: 14 }),
  },
  {
    id: 'forest',
    name: 'Forest Lounge',
    description: 'Dunkelgrün, ruhig & warm',
    accent: '#7bd389',
    accent2: '#e9c46a',
    font: 'tahoma',
    headingFont: 'serif',
    radius: 16,
    tokens: (a, b) => dark({ bg: 'linear-gradient(180deg,#0e1f17,#0a1611)', a, b }),
  },
  {
    id: 'noir',
    name: 'Monochrome Noir',
    description: 'Schwarz-Weiß, editorial',
    accent: '#ffffff',
    accent2: '#9ca3af',
    font: 'helvetica',
    headingFont: 'times',
    radius: 0,
    tokens: (a, b) => ({ ...dark({ bg: '#0a0a0a', a, b }), boxBorder: '1px solid #2a2a2a', heading: '#ffffff', headlineShadow: 'none', pillBg: '#ffffff', pillText: '#0a0a0a', buttonBg: '#ffffff', buttonText: '#0a0a0a', buttonShadow: 'none' }),
  },
  {
    id: 'retro',
    name: 'Retro Arcade',
    description: 'Pixel-Vibes, Pink & Gelb',
    accent: '#ff5ecf',
    accent2: '#ffd84d',
    font: 'mono',
    headingFont: 'mono',
    radius: 0,
    tokens: (a, b) => ({ ...dark({ bg: '#1d1135', a, b }), boxBorder: `2px dashed ${a}`, heading: b, headline: a, headlineShadow: `3px 3px 0 ${b}`, pillBg: a, pillText: '#1d1135' }),
  },
  {
    id: 'gradient',
    name: 'Sunset Glow',
    description: 'Farbverlauf mit Glas-Karten',
    accent: '#6366f1',
    accent2: '#ec4899',
    font: 'rounded',
    headingFont: 'rounded',
    radius: 22,
    tokens: (a, b) => ({
      ...dark({ bg: `linear-gradient(135deg,${a} 0%,${b} 100%)`, a: '#ffffff', b: '#ffffff' }),
      boxBorder: '1px solid rgba(255,255,255,0.3)',
      text: '#ffffff',
      muted: 'rgba(255,255,255,0.88)',
      heading: '#ffffff',
      headlineShadow: '0 2px 14px rgba(0,0,0,0.25)',
      innerBg: 'rgba(255,255,255,0.14)',
      innerBorder: '1px solid rgba(255,255,255,0.3)',
      pillBg: '#ffffff',
      pillText: a,
      buttonBg: '#ffffff',
      buttonText: a,
      eyebrowText: '#ffffff',
    }),
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum Pop',
    description: 'Pastell-Pink, verspielt',
    accent: '#ff4fa3',
    accent2: '#8b5cf6',
    font: 'comic',
    headingFont: 'rounded',
    radius: 26,
    tokens: (a, b) => light({ bg: 'linear-gradient(180deg,#fff0f7,#ffe3f1)', text: '#4a1d36', muted: '#8a5674', a, b, inner: '#ffffff', border: '#ffc6e2' }),
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    description: 'Hell, Türkis & Blau',
    accent: '#0891b2',
    accent2: '#2563eb',
    font: 'segoe',
    headingFont: 'segoe',
    radius: 18,
    tokens: (a, b) => light({ bg: 'linear-gradient(180deg,#ecfeff,#e0f2fe)', text: '#0c3546', muted: '#476978', a, b, inner: '#ffffff', border: '#bae6fd' }),
  },
  {
    id: 'ice',
    name: 'Ice Glass',
    description: 'Frostig, klar & modern',
    accent: '#3b82f6',
    accent2: '#06b6d4',
    font: 'helvetica',
    headingFont: 'helvetica',
    radius: 20,
    tokens: (a, b) => ({ ...light({ bg: 'linear-gradient(160deg,#f8fbff,#eaf2ff)', text: '#0f172a', muted: '#475569', a, b, inner: 'rgba(255,255,255,0.8)', border: '#dbe7fb' }), boxShadow: `0 10px 30px ${rgba(a, 0.15)}` }),
  },
  {
    id: 'minimal',
    name: 'Clean',
    description: 'Weiß, ruhig & modern',
    accent: '#2563eb',
    accent2: '#0ea5e9',
    font: 'sans',
    headingFont: 'sans',
    radius: 14,
    tokens: (a, b) => light({ bg: '#ffffff', text: '#1f2933', muted: '#52606d', a, b, inner: '#f7f8fa', border: '#e4e7eb' }),
  },
  {
    id: 'elegant',
    name: 'Elegance',
    description: 'Creme, Serifen & Gold',
    accent: '#b08d57',
    accent2: '#d4b483',
    font: 'serif',
    headingFont: 'garamond',
    radius: 6,
    tokens: (a, b) => ({ ...light({ bg: '#fbf7f1', text: '#3b3029', muted: '#7a6a5d', a, b, inner: '#ffffff', border: rgba(a, 0.3) }), pillText: '#6b5232' }),
  },
];

export const getTheme = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export const COLOR_PRESETS: [string, string][] = [
  ['#ff5a1f', '#e11d2e'],
  ['#22d3ee', '#a855f7'],
  ['#6366f1', '#ec4899'],
  ['#f97316', '#facc15'],
  ['#10b981', '#06b6d4'],
  ['#ef4444', '#f472b6'],
  ['#d4af37', '#f5d77a'],
  ['#2563eb', '#0ea5e9'],
  ['#a3ff12', '#16f2b4'],
  ['#ff5ecf', '#ffd84d'],
];
