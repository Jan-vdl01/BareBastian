import type { FontId, TemplateId } from '../bio/designTemplates';

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
  | 'divider';

export type Align = 'center' | 'left';

interface Base<T extends ModuleType> {
  id: string;
  type: T;
  /** Ausgeblendete Module bleiben gespeichert, erscheinen aber nicht im HTML. */
  hidden?: boolean;
  title: string;
  align?: Align;
  /** Hebt das Modul mit Akzentfarbe hervor. */
  highlight?: boolean;
}

export interface Row {
  id: string;
}

export type HeaderModule = Base<'header'> & { name: string; tagline: string; bannerUrl: string; avatarUrl: string };
export type FactsModule = Base<'facts'> & { items: (Row & { label: string; value: string })[] };
export type TextModule = Base<'text'> & { text: string };
export type ImageModule = Base<'image'> & { url: string; alt: string; caption: string; link: string; width: number };
export type GalleryModule = Base<'gallery'> & { images: (Row & { url: string; link: string })[]; columns: 2 | 3 | 4 };
export type TipMenuModule = Base<'tipMenu'> & { items: (Row & { label: string; tokens: number; emoji: string })[]; sortByPrice: boolean };
export type WishListModule = Base<'wishList'> & { items: (Row & { label: string; link: string })[] };
export type ScheduleModule = Base<'schedule'> & { items: (Row & { day: string; time: string })[]; note: string };
export type GoalModule = Base<'goal'> & { text: string; current: number; target: number; unit: string };
export type RulesModule = Base<'rules'> & { items: (Row & { text: string })[]; numbered: boolean };
export type LinksModule = Base<'links'> & { items: (Row & { label: string; url: string })[] };
export type MarqueeModule = Base<'marquee'> & { text: string; speed: number; direction: 'left' | 'right' };
export type DividerModule = Base<'divider'> & { style: 'line' | 'dots' | 'hearts' | 'stars' | 'space' };

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
  | DividerModule;

export interface BioTheme {
  preset: TemplateId;
  accent: string;
  accent2: string;
  font: FontId;
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
