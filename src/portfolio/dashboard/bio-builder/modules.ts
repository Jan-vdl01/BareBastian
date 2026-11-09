import { uid } from '../../lib/localStore';
import { getTheme } from './themes';
import {
  CalendarIcon,
  CrownIcon,
  FileText,
  GemIcon,
  HeartIcon,
  ImageIcon,
  LibraryIcon,
  LinkIcon,
  PlayIcon,
  SparkleIcon,
  UserIcon,
  type IconComponent,
} from '../../icons';
import type { BioModule, BioProject, BioTheme, ModuleType } from './types';

export interface ModuleDef {
  type: ModuleType;
  label: string;
  description: string;
  icon: IconComponent;
  create: () => BioModule;
}

const r = () => uid('r-');

export const MODULE_CATALOG: ModuleDef[] = [
  {
    type: 'header',
    label: 'Kopfbereich',
    description: 'Name, Slogan, Banner & Profilbild',
    icon: UserIcon,
    create: () => ({ id: uid('mod-'), type: 'header', title: '', name: 'Dein Name', tagline: 'Willkommen in meinem Raum!', bannerUrl: '', avatarUrl: '' }),
  },
  {
    type: 'facts',
    label: 'Steckbrief',
    description: 'Infos als Badges (Alter, Sprachen …)',
    icon: SparkleIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'facts',
      title: 'Über mich',
      items: [
        { id: r(), label: 'Alter', value: '' },
        { id: r(), label: 'Sprachen', value: 'Deutsch, English' },
        { id: r(), label: 'Aus', value: 'Deutschland' },
      ],
    }),
  },
  { type: 'text', label: 'Textbox', description: 'Freier Text mit Überschrift', icon: FileText, create: () => ({ id: uid('mod-'), type: 'text', title: 'Über mich', text: '' }) },
  {
    type: 'image',
    label: 'Bildbox',
    description: 'Ein Bild mit Bildunterschrift & Link',
    icon: ImageIcon,
    create: () => ({ id: uid('mod-'), type: 'image', title: '', url: '', alt: '', caption: '', link: '', width: 100 }),
  },
  {
    type: 'gallery',
    label: 'Bildergalerie',
    description: 'Mehrere Bilder im Raster',
    icon: LibraryIcon,
    create: () => ({ id: uid('mod-'), type: 'gallery', title: 'Galerie', columns: 3, images: [{ id: r(), url: '', link: '' }] }),
  },
  {
    type: 'tipMenu',
    label: 'Tip-Menü',
    description: 'Aktionen mit Token-Preisen',
    icon: GemIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'tipMenu',
      title: 'Tip-Menü',
      sortByPrice: true,
      items: [
        { id: r(), emoji: '👋', label: 'Hallo sagen', tokens: 10 },
        { id: r(), emoji: '🎵', label: 'Song-Wunsch', tokens: 50 },
        { id: r(), emoji: '👕', label: 'Outfit-Wechsel', tokens: 100 },
      ],
    }),
  },
  {
    type: 'wishList',
    label: 'Wishlist',
    description: 'Wünsche, optional mit Link',
    icon: HeartIcon,
    create: () => ({ id: uid('mod-'), type: 'wishList', title: 'Wishlist', items: [{ id: r(), label: 'Neues Ringlicht', link: '' }] }),
  },
  {
    type: 'schedule',
    label: 'Stream-Zeiten',
    description: 'Wochentage & Uhrzeiten',
    icon: CalendarIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'schedule',
      title: 'Live-Zeiten',
      note: 'Alle Zeiten in MEZ',
      items: [
        { id: r(), day: 'Mittwoch', time: '21:00' },
        { id: r(), day: 'Freitag', time: '21:00' },
        { id: r(), day: 'Samstag', time: '22:00' },
      ],
    }),
  },
  {
    type: 'goal',
    label: 'Goal',
    description: 'Ziel mit Fortschrittsbalken',
    icon: SparkleIcon,
    create: () => ({ id: uid('mod-'), type: 'goal', title: 'Aktuelles Goal', text: 'Neues Studio-Licht', current: 320, target: 500, unit: 'tk' }),
  },
  {
    type: 'rules',
    label: 'Raumregeln',
    description: 'Regeln für den Chat',
    icon: FileText,
    create: () => ({
      id: uid('mod-'),
      type: 'rules',
      title: 'Raumregeln',
      numbered: false,
      items: [
        { id: r(), text: 'Bleib respektvoll – zu mir und allen im Chat.' },
        { id: r(), text: 'Keine Forderungen, kein Spam.' },
        { id: r(), text: 'Keine persönlichen Infos teilen oder erfragen.' },
      ],
    }),
  },
  {
    type: 'links',
    label: 'Link-Buttons',
    description: 'Buttons zu erlaubten Zielen',
    icon: LinkIcon,
    create: () => ({ id: uid('mod-'), type: 'links', title: 'Folge mir', variant: 'pill', items: [{ id: r(), label: 'Instagram', url: '' }] }),
  },
  {
    type: 'marquee',
    label: 'Lauftext',
    description: 'Scrollende Laufschrift',
    icon: PlayIcon,
    create: () => ({ id: uid('mod-'), type: 'marquee', title: '', text: 'Willkommen! Folge mir, um keinen Stream zu verpassen ❤️', speed: 6, direction: 'left' }),
  },
  {
    type: 'ranking',
    label: 'Rangliste',
    description: 'Hall of Fame, Top-Tipper',
    icon: CrownIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'ranking',
      eyebrow: 'Room Hall of Fame',
      title: 'Top Stream Kings',
      footer: 'Tippe groß, um dir deinen Platz zu sichern!',
      items: [
        { id: r(), label: '#1 King of the Room', name: '@name1', value: '2.112 TK' },
        { id: r(), label: '2nd Place', name: '@name2', value: '1.154 TK' },
        { id: r(), label: '3rd Place', name: '@name3', value: '956 TK' },
      ],
    }),
  },
  {
    type: 'features',
    label: 'Feature-Karten',
    description: 'Karten mit Emoji, Titel & Text',
    icon: LibraryIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'features',
      eyebrow: 'Private Shows',
      title: 'Was dich erwartet',
      columns: 3,
      items: [
        { id: r(), emoji: '🎮', title: 'Interaktiv', text: 'Du steuerst die Show mit deinen Tips.' },
        { id: r(), emoji: '🗣️', title: 'Zweisprachig', text: 'Ich spreche Deutsch & Englisch.' },
        { id: r(), emoji: '🎵', title: 'Song-Wünsche', text: 'Deine Musik läuft im Stream.' },
      ],
    }),
  },
  {
    type: 'chips',
    label: 'Chip-Wolke',
    description: 'Kleine Etiketten, optional verlinkt',
    icon: SparkleIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'chips',
      eyebrow: 'Mein Setup',
      title: '',
      items: [
        { id: r(), emoji: '🎧', label: 'Headset', link: '' },
        { id: r(), emoji: '💡', label: 'Ringlicht', link: '' },
        { id: r(), emoji: '🎥', label: '4K-Kamera', link: '' },
      ],
    }),
  },
  {
    type: 'products',
    label: 'Produkt-Karten',
    description: 'Empfehlungen mit Button',
    icon: GemIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'products',
      eyebrow: 'Official Partner Showcase',
      title: 'Mein Studio-Equipment',
      columns: 3,
      items: [
        { id: r(), brand: 'Marke', badge: 'Favorit', title: 'Produkt 1', text: 'Kurze Beschreibung des Produkts.', button: 'Zum Angebot', url: '' },
        { id: r(), brand: 'Marke', badge: 'Bestseller', title: 'Produkt 2', text: 'Kurze Beschreibung des Produkts.', button: 'Zum Angebot', url: '' },
      ],
    }),
  },
  {
    type: 'levels',
    label: 'Level-Balken',
    description: 'Stufen, z. B. für Toy-Reaktionen',
    icon: PlayIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'levels',
      eyebrow: 'Real-Time Control',
      title: 'Tip-Level',
      maxLevel: 10,
      tip: 'Jeder Tip löst automatisch die passende Stufe aus!',
      items: [
        { id: r(), label: 'LVL 1: 1–14 TK', level: 2, info: '3s · Low' },
        { id: r(), label: 'LVL 2: 15–49 TK', level: 4, info: '10s · Medium' },
        { id: r(), label: 'LVL 3: 50–99 TK', level: 6, info: '20s · Medium+' },
        { id: r(), label: 'LVL 4: 100–299 TK', level: 8, info: '30s · High' },
        { id: r(), label: 'LVL 5: 300+ TK', level: 10, info: '90s · Ultra' },
      ],
    }),
  },
  {
    type: 'cards',
    label: 'Karten-Slider',
    description: 'Seitlich scrollbare Bild-Karten',
    icon: ImageIcon,
    create: () => ({
      id: uid('mod-'),
      type: 'cards',
      eyebrow: 'On-Demand',
      title: 'Meine Videos',
      hint: 'Seitlich wischen, um alle zu sehen →',
      items: [
        { id: r(), imageUrl: '', tag: 'Neu', price: '100 TK', title: 'Video 1', button: 'Ansehen', url: '' },
        { id: r(), imageUrl: '', tag: 'Bestseller', price: '120 TK', title: 'Video 2', button: 'Ansehen', url: '' },
        { id: r(), imageUrl: '', tag: 'Exklusiv', price: '180 TK', title: 'Video 3', button: 'Ansehen', url: '' },
      ],
    }),
  },
  {
    type: 'divider',
    label: 'Trenner',
    description: 'Linie, Symbole oder Abstand',
    icon: SparkleIcon,
    create: () => ({ id: uid('mod-'), type: 'divider', title: '', look: 'line' }),
  },
];

export const getModuleDef = (type: ModuleType) => MODULE_CATALOG.find((d) => d.type === type)!;

export const createModule = (type: ModuleType) => getModuleDef(type).create();

/** Modul duplizieren – inkl. neuer IDs für alle Zeilen. */
export function cloneModule(m: BioModule): BioModule {
  const copy = JSON.parse(JSON.stringify(m)) as BioModule & { items?: { id: string }[]; images?: { id: string }[] };
  copy.id = uid('mod-');
  copy.items?.forEach((x) => (x.id = r()));
  copy.images?.forEach((x) => (x.id = r()));
  return copy;
}

export function defaultTheme(id = 'inferno'): BioTheme {
  const t = getTheme(id);
  return { preset: t.id, accent: t.accent, accent2: t.accent2, font: t.font, headingFont: t.headingFont, radius: t.radius, align: 'center', layout: 'cards', emojis: true };
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  types: ModuleType[];
}

export const STARTERS: StarterTemplate[] = [
  { id: 'studio', name: 'Studio-Profil', description: 'Wie dein aktueller Look', types: ['header', 'text', 'links', 'ranking', 'features', 'chips', 'tipMenu', 'levels', 'cards', 'products', 'rules'] },
  { id: 'complete', name: 'Komplett', description: 'Alle wichtigen Bereiche', types: ['header', 'marquee', 'facts', 'text', 'schedule', 'tipMenu', 'goal', 'wishList', 'rules'] },
  { id: 'compact', name: 'Kompakt', description: 'Kopf, Text & Tip-Menü', types: ['header', 'text', 'tipMenu'] },
  { id: 'visual', name: 'Bildstark', description: 'Mit Bildbox & Galerie', types: ['header', 'image', 'text', 'gallery', 'tipMenu', 'wishList'] },
  { id: 'empty', name: 'Leer', description: 'Selbst zusammenstellen', types: [] },
];

export function projectFromStarter(starter: StarterTemplate, name: string, theme = defaultTheme()): BioProject {
  const modules = starter.types.map((t) => {
    const m = createModule(t);
    if (m.type === 'header') m.name = name || m.name;
    if (m.type === 'text') {
      m.text = 'Hey, schön dass du da bist! Ich bin [b]gesprächig[/b], entspannt und immer für einen Spaß zu haben. Folge mir, um keinen Stream zu verpassen!';
      if (starter.id === 'studio') {
        m.eyebrow = 'Hamburg, DE • Live Studio';
        m.title = `${name || 'Dein Name'} // Live Studio 🔥`;
      }
    }
    if (starter.id === 'studio' && m.type === 'header') {
      m.tagline = 'Willkommen in meinem Raum!';
    }
    if (starter.id === 'studio' && m.type === 'links') {
      m.variant = 'cta';
      m.title = '';
      m.items = [{ id: r(), label: 'Besuche meine Website', url: '' }];
    }
    if (starter.id === 'studio' && m.type === 'tipMenu') {
      m.eyebrow = 'Live Action Menu';
      m.title = 'Interaktives Tip-Menü';
      m.columns = 2;
      m.highlightFrom = 500;
      m.items = [
        { id: r(), category: '01 // Chat & Basics', emoji: '💬', label: 'Hallo sagen', tokens: 1 },
        { id: r(), category: '01 // Chat & Basics', emoji: '📩', label: 'Private Nachricht', tokens: 10 },
        { id: r(), category: '02 // Wünsche', emoji: '🎵', label: 'Song-Wunsch', tokens: 25 },
        { id: r(), category: '02 // Wünsche', emoji: '👕', label: 'Outfit-Wechsel', tokens: 100 },
        { id: r(), category: '03 // VIP', emoji: '💎', label: 'Große Überraschung', tokens: 500 },
      ];
    }
    return m;
  });
  return { version: 1, theme, modules, updatedAt: new Date().toISOString() };
}
