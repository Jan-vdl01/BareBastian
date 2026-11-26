import type { FontId } from './themes';

/** Bausteine einer modularen Chaturbate-Bio. */
export type ModuleType =
  | 'header'
  | 'facts'
  | 'text'
  | 'image'
  | 'gallery'
  | 'tipMenu'
  | 'wishList'
  | 'schedule'
  | 'goal'
  | 'rules'
  | 'links'
  | 'marquee'
  | 'divider'
  | 'ranking'
  | 'features'
  | 'chips'
  | 'products'
  | 'levels'
  | 'cards';

export type Align = 'center' | 'left' | 'right' | 'justify';

/**
 * Individueller Stil einer Box – alles optional.
 * Nicht gesetzte Werte kommen aus dem gewählten Theme.
 */
export interface BoxStyle {
  /* Box */
  bgMode?: 'theme' | 'solid' | 'gradient' | 'transparent';
  bg1?: string;
  bg2?: string;
  bgAngle?: number;
  borderMode?: 'theme' | 'none' | 'all' | 'top' | 'left' | 'bottom';
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double';
  radius?: number;
  padding?: number;
  glow?: number;
  glowColor?: string;
  /** Akzentfarben dieser Box (Preis-Plaketten, Buttons, Balken) */
  accent?: string;
  accent2?: string;
  /* Fließtext */
  font?: FontId;
  fontSize?: number;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  uppercase?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  textShadow?: boolean;
  /* Überschrift */
  titleFont?: FontId;
  titleSize?: number;
  titleColor?: string;
  titleUppercase?: boolean;
  titleItalic?: boolean;
  titleUnderline?: boolean;
}

interface Base<T extends ModuleType> {
  id: string;
  type: T;
  /** Ausgeblendete Module bleiben gespeichert, erscheinen aber nicht im HTML. */
  hidden?: boolean;
  /** Kleines Etikett über der Überschrift (z. B. „ROOM HALL OF FAME“) */
  eyebrow?: string;
  title: string;
  /** Untertitel direkt unter der Überschrift */
  subtitle?: string;
  align?: Align;
  /** Hebt das Modul mit Akzentfarbe hervor. */
  highlight?: boolean;
  style?: BoxStyle;
}

export interface Row {
  id: string;
}

export type HeaderModule = Base<'header'> & { name: string; tagline: string; bannerUrl: string; avatarUrl: string; nameOnBanner?: boolean; nameSize?: number };
export type FactsModule = Base<'facts'> & { items: (Row & { label: string; value: string })[] };
export type TextModule = Base<'text'> & { text: string };
export type ImageModule = Base<'image'> & { url: string; alt: string; caption: string; link: string; width: number };
export type GalleryModule = Base<'gallery'> & { images: (Row & { url: string; link: string })[]; columns: 2 | 3 | 4 };
export type TipMenuModule = Base<'tipMenu'> & {
  items: (Row & { label: string; tokens: number; emoji: string; category?: string })[];
  sortByPrice: boolean;
  columns?: 1 | 2;
  /** Ab diesem Preis wird die Zeile hervorgehoben (0 = aus) */
  highlightFrom?: number;
};
export type WishListModule = Base<'wishList'> & { items: (Row & { label: string; link: string })[] };
export type ScheduleModule = Base<'schedule'> & { items: (Row & { day: string; time: string })[]; note: string };
export type GoalModule = Base<'goal'> & { text: string; current: number; target: number; unit: string };
export type RulesModule = Base<'rules'> & { items: (Row & { text: string })[]; numbered: boolean };
export type LinksModule = Base<'links'> & { items: (Row & { label: string; url: string })[]; variant?: 'pill' | 'cta' | 'chips' | 'outline' };
export type MarqueeModule = Base<'marquee'> & { text: string; speed: number; direction: 'left' | 'right' };
export type DividerModule = Base<'divider'> & { look: 'line' | 'dots' | 'hearts' | 'stars' | 'space' };
export type RankingModule = Base<'ranking'> & { items: (Row & { label: string; name: string; value: string })[]; footer: string };
export type FeaturesModule = Base<'features'> & { items: (Row & { emoji: string; title: string; text: string })[]; columns: 1 | 2 | 3 };
export type ChipsModule = Base<'chips'> & { items: (Row & { emoji: string; label: string; link: string })[] };
export type ProductsModule = Base<'products'> & {
  items: (Row & { brand: string; badge: string; title: string; text: string; button: string; url: string })[];
  columns: 1 | 2 | 3;
};
export type LevelsModule = Base<'levels'> & { items: (Row & { label: string; level: number; info: string })[]; maxLevel: number; tip: string };
export type CardsModule = Base<'cards'> & {
  items: (Row & { imageUrl: string; tag: string; price: string; title: string; button: string; url: string })[];
  hint: string;
};

export type BioModule =
  | HeaderModule
  | FactsModule
  | TextModule
  | ImageModule
  | GalleryModule
  | TipMenuModule
  | WishListModule
  | ScheduleModule
  | GoalModule
  | RulesModule
  | LinksModule
  | MarqueeModule
  | DividerModule
  | RankingModule
  | FeaturesModule
  | ChipsModule
  | ProductsModule
  | LevelsModule
  | CardsModule;

export interface BioTheme {
  preset: string;
  accent: string;
  accent2: string;
  font: FontId;
  headingFont?: FontId;
  radius: number;
  align: Align;
  /** cards = einzelne Karten mit Abstand, joined = durchgehende Fläche */
  layout: 'cards' | 'joined';
  emojis: boolean;
}

export interface BioProject {
  version: 1;
  theme: BioTheme;
  modules: BioModule[];
  updatedAt: string;
}
