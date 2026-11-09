import { CREATOR_ID } from '../config/admin';
import { PROFILE } from '../data';
import { readJSON, uid, useStoredValue, writeJSON } from '../lib/localStore';

/**
 * Öffentliche Mitgliederprofile (wie bei Social Media).
 * E-Mail-Adressen werden getrennt gespeichert und nie in Profilen angezeigt.
 */
export type Role = 'member' | 'admin';

export interface Profile {
  id: string;
  displayName: string;
  username: string;
  avatar?: string;
  cover?: string;
  bio: string;
  location: string;
  website: string;
  pronouns: string;
  interests: string[];
  socials: { instagram?: string; x?: string; telegram?: string };
  joinedAt: string;
  role: Role;
  isDemo?: boolean;
}

export interface Account {
  id: string;
  email: string;
  passwordHash: string | null; // null = Login über Google/GitHub (Demo)
  provider: 'password' | 'google' | 'github';
}

const PROFILES_KEY = 'bb_profiles';
const ACCOUNTS_KEY = 'bb_accounts';

const creatorProfile = (): Profile => ({
  id: CREATOR_ID,
  displayName: PROFILE.name,
  username: 'barebastian',
  bio: PROFILE.bio,
  location: 'Hamburg',
  website: '',
  pronouns: '',
  interests: ['Content Creation', 'Live-Streams', 'Gym', 'Gaming'],
  socials: { instagram: 'bare.bastian', x: 'Bare_Bastian', telegram: 'Bare_Bastian' },
  joinedAt: '2024-01-01T00:00:00.000Z',
  role: 'admin',
});

const demo = (id: string, displayName: string, username: string, bio: string, location: string, interests: string[], joinedAt: string): Profile => ({
  id,
  displayName,
  username,
  bio,
  location,
  website: '',
  pronouns: '',
  interests,
  socials: {},
  joinedAt,
  role: 'member',
  isDemo: true,
});

const SEED: Profile[] = [
  creatorProfile(),
  demo('demo-lukas', 'Lukas', 'lukas.hh', 'Hamburger Jung · Gym & Techno', 'Hamburg', ['Gym', 'Techno', 'Reisen'], '2026-03-14T10:00:00.000Z'),
  demo('demo-mia', 'Mia', 'mia_creates', 'Fotografin & Kaffee-Junkie ☕', 'Berlin', ['Fotografie', 'Kunst', 'Kaffee'], '2026-05-02T10:00:00.000Z'),
  demo('demo-tom', 'Tom', 'tom.gaming', 'Zocker, Streamer, Nachteule 🎮', 'Köln', ['Gaming', 'Streams', 'Pizza'], '2026-06-21T10:00:00.000Z'),
  demo('demo-jonas', 'Jonas', 'jonas.fit', 'Laufen, Kochen, gute Gespräche', 'München', ['Laufen', 'Kochen', 'Podcasts'], '2026-08-09T10:00:00.000Z'),
];

function readProfiles(): Record<string, Profile> {
  const stored = readJSON<Record<string, Profile> | null>(PROFILES_KEY, null);
  if (stored) return stored;
  const seeded = Object.fromEntries(SEED.map((p) => [p.id, p]));
  writeJSON(PROFILES_KEY, seeded);
  return seeded;
}

export const getProfile = (id: string): Profile | undefined => readProfiles()[id];
export const listProfiles = (): Profile[] => Object.values(readProfiles());

export function saveProfile(profile: Profile) {
  const all = readProfiles();
  all[profile.id] = profile;
  writeJSON(PROFILES_KEY, all);
}

export function isUsernameTaken(username: string, exceptId: string) {
  const u = username.toLowerCase();
  return listProfiles().some((p) => p.id !== exceptId && p.username.toLowerCase() === u);
}

export function uniqueUsername(base: string, exceptId = ''): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20) || 'mitglied';
  let name = clean;
  for (let i = 2; isUsernameTaken(name, exceptId); i++) name = `${clean}${i}`;
  return name;
}

export function findAccountByEmail(email: string): Account | undefined {
  const all = readJSON<Record<string, Account>>(ACCOUNTS_KEY, {});
  return all[email.toLowerCase()];
}

export function createAccount(email: string, passwordHash: string | null, provider: Account['provider']): Profile {
  const id = uid('u-');
  const accounts = readJSON<Record<string, Account>>(ACCOUNTS_KEY, {});
  accounts[email.toLowerCase()] = { id, email: email.toLowerCase(), passwordHash, provider };
  writeJSON(ACCOUNTS_KEY, accounts);
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const profile: Profile = {
    id,
    displayName: local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Mitglied',
    username: uniqueUsername(email.split('@')[0]),
    bio: '',
    location: '',
    website: '',
    pronouns: '',
    interests: [],
    socials: {},
    joinedAt: new Date().toISOString(),
    role: 'member',
  };
  saveProfile(profile);
  return profile;
}

/** Stellt sicher, dass das Creator-Profil existiert (z. B. nach dem Löschen von Browserdaten). */
export function ensureCreatorProfile(): Profile {
  const existing = getProfile(CREATOR_ID);
  if (existing) return existing;
  const p = creatorProfile();
  saveProfile(p);
  return p;
}

export function useProfiles(): Record<string, Profile> {
  const stored = useStoredValue<Record<string, Profile> | null>(PROFILES_KEY, null);
  return stored ?? readProfiles();
}

export function useProfile(id: string | undefined): Profile | undefined {
  const all = useProfiles();
  return id ? all[id] : undefined;
}
