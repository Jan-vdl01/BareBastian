import { api } from '../lib/api';
import { remoteResource } from '../lib/remote';

/**
 * Öffentliche Mitgliederprofile (wie bei Social Media) – vom Server.
 * E-Mail-Adressen sind nie Teil eines Profils.
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
}

export const profilesResource = remoteResource<Record<string, Profile>>('/profiles', () => ({}), 60000);

export const getProfile = (id: string): Profile | undefined => profilesResource.get()[id];
export const listProfiles = (): Profile[] => Object.values(profilesResource.get());

/** Eigenes Profil speichern. Bilder als Data-URL werden vom Server als Datei abgelegt. */
export async function saveProfile(profile: Profile): Promise<Profile> {
  const { id: _id, joinedAt: _j, role: _r, ...input } = profile;
  const saved = await api.put<Profile>('/profiles/me', input);
  profilesResource.set({ ...profilesResource.get(), [saved.id]: saved });
  return saved;
}

export function isUsernameTaken(username: string, exceptId: string) {
  const u = username.toLowerCase();
  return listProfiles().some((p) => p.id !== exceptId && p.username.toLowerCase() === u);
}

export const useProfiles = (): Record<string, Profile> => profilesResource.use();

export function useProfile(id: string | undefined): Profile | undefined {
  const all = useProfiles();
  return id ? all[id] : undefined;
}
