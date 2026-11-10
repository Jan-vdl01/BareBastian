/**
 * zod-Schemas für alle gespeicherten Daten.
 * Bewusst tolerant (optionale Felder, unbekannte Felder erlaubt), damit ältere Datenstände gültig bleiben –
 * aber streng genug, um beschädigte oder fremde Daten zu erkennen.
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format JJJJ-MM-TT erwartet');
const id = z.string().min(1);

/* ---------- Finanzen ---------- */

export const streamEntrySchema = z.object({
  id,
  date: isoDate,
  start: z.string(),
  durationMin: z.number().min(0).max(24 * 60),
  tokens: z.number().min(0),
  category: z.string(),
  toys: z.array(z.string()),
  followers: z.number().min(0).optional(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const financeSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    payoutPerToken: z.number().positive(),
    currency: z.enum(['USD', 'EUR']),
    usdToEur: z.number().positive(),
    monthlyGoal: z.number().min(0),
  }),
  categories: z.array(z.string()),
  toys: z.array(z.string()),
  streams: z.array(streamEntrySchema),
});

/** Eine Zeile aus dem CSV-Import (vor dem Speichern). */
export const csvRowSchema = z.object({
  date: isoDate,
  start: z.string().regex(/^(\d{2}:\d{2})?$/, 'Startzeit als HH:MM erwartet'),
  durationMin: z.number().min(1, 'Dauer muss größer 0 sein').max(24 * 60, 'Dauer über 24 Stunden'),
  tokens: z.number().int().min(0),
  category: z.string().min(1, 'Kategorie fehlt'),
  toys: z.array(z.string()),
  followers: z.number().int().min(0),
  notes: z.string().max(500),
});

/* ---------- Social Hub ---------- */

const pollSchema = z.object({
  options: z.array(z.object({ id, text: z.string(), votes: z.array(z.string()) })).min(2),
  endsAt: z.string().nullable(),
});

export const socialPostSchema = z.object({
  id,
  authorId: id,
  text: z.string().max(5000),
  design: z.object({ bg: z.string(), size: z.number().min(8).max(80), align: z.enum(['left', 'center', 'right']), textColor: z.string().optional(), font: z.string().optional() }),
  images: z.array(z.string()).max(4),
  poll: pollSchema.nullable(),
  tags: z.array(z.string()),
  visibility: z.enum(['public', 'followers']),
  likes: z.array(z.string()),
  comments: z.array(z.object({ id, authorId: id, text: z.string(), createdAt: z.string() })),
  createdAt: z.string(),
  editedAt: z.string().optional(),
});

export const socialSchema = z.object({
  version: z.literal(1),
  posts: z.array(socialPostSchema),
  follows: z.record(z.string(), z.array(z.string())),
});

/* ---------- Chat ---------- */

export const chatSchema = z.array(z.object({ id, from: id, to: id, text: z.string(), at: z.string(), readAt: z.string().optional() }));

/* ---------- Profile ---------- */

export const profileSchema = z.object({
  id,
  displayName: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  cover: z.string().optional(),
  bio: z.string(),
  location: z.string(),
  website: z.string(),
  pronouns: z.string(),
  interests: z.array(z.string()),
  socials: z.object({ instagram: z.string().optional(), x: z.string().optional(), telegram: z.string().optional() }),
  joinedAt: z.string(),
  role: z.enum(['member', 'admin']),
  isDemo: z.boolean().optional(),
});
export const profilesSchema = z.record(z.string(), profileSchema);

/* ---------- Bio-Designer ---------- */

export const MODULE_TYPES = [
  'header', 'facts', 'text', 'image', 'gallery', 'tipMenu', 'wishList', 'schedule', 'goal', 'rules',
  'links', 'marquee', 'divider', 'ranking', 'features', 'chips', 'products', 'levels', 'cards',
] as const;

export const bioProjectSchema = z.object({
  version: z.literal(1),
  theme: z.object({ preset: z.string(), accent: z.string(), accent2: z.string(), font: z.string(), radius: z.number(), align: z.string(), layout: z.enum(['cards', 'joined']), emojis: z.boolean() }),
  modules: z.array(z.object({ id, type: z.enum(MODULE_TYPES), title: z.string() })),
  updatedAt: z.string(),
});

export const bioLibrarySchema = z.object({
  version: z.literal(1),
  projects: z.array(
    z.object({
      id,
      name: z.string(),
      folder: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      project: bioProjectSchema,
      versions: z.array(z.object({ id, label: z.string(), savedAt: z.string(), project: bioProjectSchema })),
    }),
  ),
  folders: z.array(z.string()),
  favoriteThemes: z.array(z.string()),
});

export const bioExportSchema = z.object({
  format: z.literal('barebastian-bio'),
  version: z.literal(1),
  exportedAt: z.string(),
  profiles: z.array(z.object({ name: z.string(), folder: z.string(), project: bioProjectSchema })).min(1, 'Die Datei enthält keine Profile'),
});

/* ---------- Bibliothek (content.json) ---------- */

export const contentSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  videos: z.array(z.object({ id, title: z.string(), description: z.string(), duration: z.string(), date: z.string(), category: z.string(), tags: z.array(z.string()), src: z.string().optional(), poster: z.string().optional(), hue: z.number() })),
  photos: z.array(z.object({ id, title: z.string(), album: z.string(), date: z.string(), src: z.string().optional(), hue: z.number(), tall: z.boolean().optional() })),
  posts: z.array(z.object({ id, date: z.string(), text: z.string(), photoIds: z.array(z.string()).optional(), videoId: z.string().optional(), likes: z.number() })),
});
