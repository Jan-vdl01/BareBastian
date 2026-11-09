import { uid } from '../../lib/localStore';
import { getTemplate } from '../bio/designTemplates';
import {
  CalendarIcon,
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
    create: () => ({ id: uid('mod-'), type: 'links', title: 'Folge mir', items: [{ id: r(), label: 'Instagram', url: '' }] }),
  },
  {
    type: 'marquee',
    label: 'Lauftext',
    description: 'Scrollende Laufschrift',
    icon: PlayIcon,
    create: () => ({ id: uid('mod-'), type: 'marquee', title: '', text: 'Willkommen! Folge mir, um keinen Stream zu verpassen ❤️', speed: 6, direction: 'left' }),
  },
  {
    type: 'divider',
    label: 'Trenner',
    description: 'Linie, Symbole oder Abstand',
    icon: SparkleIcon,
    create: () => ({ id: uid('mod-'), type: 'divider', title: '', style: 'line' }),
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

export function defaultTheme(): BioTheme {
  const t = getTemplate('neon');
  return { preset: t.id, accent: t.accent, accent2: t.accent2, font: t.font, radius: t.radius, align: 'center', layout: 'cards', emojis: true };
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  types: ModuleType[];
}

export const STARTERS: StarterTemplate[] = [
  { id: 'complete', name: 'Komplett', description: 'Alle wichtigen Bereiche', types: ['header', 'marquee', 'facts', 'text', 'schedule', 'tipMenu', 'goal', 'wishList', 'rules'] },
  { id: 'compact', name: 'Kompakt', description: 'Kopf, Text & Tip-Menü', types: ['header', 'text', 'tipMenu'] },
  { id: 'visual', name: 'Bildstark', description: 'Mit Bildbox & Galerie', types: ['header', 'image', 'text', 'gallery', 'tipMenu', 'wishList'] },
  { id: 'empty', name: 'Leer', description: 'Selbst zusammenstellen', types: [] },
];

export function projectFromStarter(starter: StarterTemplate, name: string, theme = defaultTheme()): BioProject {
  const modules = starter.types.map((t) => {
    const m = createModule(t);
    if (m.type === 'header') m.name = name || m.name;
    if (m.type === 'text') m.text = 'Hey, schön dass du da bist! Ich bin gesprächig, entspannt und immer für einen Spaß zu haben. Schreib mir gern im Chat.';
    return m;
  });
  return { version: 1, theme, modules, updatedAt: new Date().toISOString() };
}
