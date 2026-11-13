/**
 * Ablage für mehrere Bio-Profile pro Benutzer (auf dem Server gespeichert).
 * Enthält Ordner, Favoriten-Themes, Versionen und Import/Export.
 */
import { readJSON, uid } from '../../lib/localStore';
import { bioExportSchema, bioLibrarySchema } from '../../lib/schemas';
import { defineUserStore, describeIssues } from '../../lib/store';
import type { BioModule, BioProject } from './types';

export interface ProjectVersion {
  id: string;
  label: string;
  savedAt: string;
  project: BioProject;
}

export interface StoredProject {
  id: string;
  name: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
  project: BioProject;
  versions: ProjectVersion[];
}

export interface BioLibrary {
  version: 1;
  projects: StoredProject[];
  folders: string[];
  favoriteThemes: string[];
}

export const MAX_VERSIONS = 15;
export const DEFAULT_FOLDER = 'Allgemein';

const key = (userId: string) => `bb_bio_library_${userId}`;
const legacyKey = (userId: string) => `bb_bio_project_${userId}`;

const empty = (): BioLibrary => ({ version: 1, projects: [], folders: [DEFAULT_FOLDER], favoriteThemes: [] });

/** Ältere Version: Trenner-Art lag im Feld „style“ (heute: Box-Stil). */
export function migrateProject(p: BioProject): BioProject {
  const modules = (p.modules ?? []).map((m) => {
    const legacy = m as unknown as { type: string; style?: unknown };
    if (legacy.type === 'divider' && typeof legacy.style === 'string') return { ...m, look: legacy.style, style: undefined } as BioModule;
    return m;
  });
  return { ...p, version: 1, modules };
}

/** Startzustand – übernimmt ein einzelnes Profil aus der Vorversion (feste ID, damit Links stabil bleiben). */
function initialLibrary(userId: string): BioLibrary {
  const fresh = empty();
  const legacy = readJSON<BioProject | null>(legacyKey(userId), null);
  if (legacy?.version === 1 && Array.isArray(legacy.modules)) {
    const now = new Date().toISOString();
    fresh.projects.push({ id: 'bio-legacy-1', name: 'Mein Profil', folder: DEFAULT_FOLDER, createdAt: now, updatedAt: legacy.updatedAt || now, project: migrateProject(legacy), versions: [] });
  }
  return fresh;
}

const migrateLibrary = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as BioLibrary).projects)) return raw;
  const lib = raw as BioLibrary;
  return { ...lib, projects: lib.projects.map((p) => ({ ...p, project: migrateProject(p.project), versions: (p.versions ?? []).map((v) => ({ ...v, project: migrateProject(v.project) })) })) };
};

const stores = new Map<string, ReturnType<typeof libraryStoreFor>>();
function libraryStoreFor(userId: string) {
  return defineUserStore<BioLibrary>('bb_bio_library_', { schema: bioLibrarySchema, fallback: () => initialLibrary(userId), migrate: migrateLibrary });
}
const storeOf = (userId: string) => {
  if (!stores.has(userId)) stores.set(userId, libraryStoreFor(userId));
  return stores.get(userId)!;
};

export const readLibrary = (userId: string): BioLibrary => storeOf(userId).forUser(userId).read();
const write = (userId: string, lib: BioLibrary) => storeOf(userId).forUser(userId).write(lib);
const update = (userId: string, fn: (lib: BioLibrary) => BioLibrary) => storeOf(userId).forUser(userId).update(fn);
export const useLibrary = (userId: string): BioLibrary => storeOf(userId).use(userId);

export const getProject = (userId: string, id: string) => readLibrary(userId).projects.find((p) => p.id === id);

export function createProject(userId: string, name: string, project: BioProject, folder = DEFAULT_FOLDER): StoredProject {
  const now = new Date().toISOString();
  const entry: StoredProject = { id: uid('bio-'), name: name.trim() || 'Neues Profil', folder, createdAt: now, updatedAt: now, project: migrateProject(project), versions: [] };
  update(userId, (lib) => ({ ...lib, projects: [entry, ...lib.projects], folders: lib.folders.includes(folder) ? lib.folders : [...lib.folders, folder] }));
  return entry;
}

const patch = (userId: string, id: string, fn: (p: StoredProject) => StoredProject) =>
  update(userId, (lib) => ({ ...lib, projects: lib.projects.map((p) => (p.id === id ? fn(p) : p)) }));

export const saveProjectData = (userId: string, id: string, project: BioProject) => patch(userId, id, (p) => ({ ...p, project, updatedAt: new Date().toISOString() }));
export const renameProject = (userId: string, id: string, name: string) => patch(userId, id, (p) => ({ ...p, name: name.trim() || p.name, updatedAt: new Date().toISOString() }));
export const moveProject = (userId: string, id: string, folder: string) =>
  update(userId, (lib) => ({ ...lib, folders: lib.folders.includes(folder) ? lib.folders : [...lib.folders, folder], projects: lib.projects.map((p) => (p.id === id ? { ...p, folder } : p)) }));
export const deleteProject = (userId: string, id: string) => update(userId, (lib) => ({ ...lib, projects: lib.projects.filter((p) => p.id !== id) }));

export function duplicateProject(userId: string, id: string, name?: string): StoredProject | undefined {
  const src = getProject(userId, id);
  if (!src) return undefined;
  return createProject(userId, name ?? `${src.name} (Kopie)`, JSON.parse(JSON.stringify(src.project)) as BioProject, src.folder);
}

export function saveVersion(userId: string, id: string, label: string) {
  patch(userId, id, (p) => ({
    ...p,
    versions: [{ id: uid('ver-'), label: label.trim() || `Version ${p.versions.length + 1}`, savedAt: new Date().toISOString(), project: JSON.parse(JSON.stringify(p.project)) }, ...p.versions].slice(0, MAX_VERSIONS),
  }));
}
export const deleteVersion = (userId: string, id: string, versionId: string) => patch(userId, id, (p) => ({ ...p, versions: p.versions.filter((v) => v.id !== versionId) }));

/* ---------- Ordner & Favoriten ---------- */

export function addFolder(userId: string, name: string) {
  const n = name.trim().slice(0, 40);
  if (!n) return;
  update(userId, (lib) => (lib.folders.includes(n) ? lib : { ...lib, folders: [...lib.folders, n] }));
}
export function renameFolder(userId: string, from: string, to: string) {
  const n = to.trim().slice(0, 40);
  if (!n || from === n) return;
  update(userId, (lib) => ({
    ...lib,
    folders: lib.folders.includes(n) ? lib.folders.filter((f) => f !== from) : lib.folders.map((f) => (f === from ? n : f)),
    projects: lib.projects.map((p) => (p.folder === from ? { ...p, folder: n } : p)),
  }));
}
/** Ordner löschen – enthaltene Profile wandern nach „Allgemein“. */
export function deleteFolder(userId: string, name: string) {
  if (name === DEFAULT_FOLDER) return;
  update(userId, (lib) => ({
    ...lib,
    folders: lib.folders.filter((f) => f !== name),
    projects: lib.projects.map((p) => (p.folder === name ? { ...p, folder: DEFAULT_FOLDER } : p)),
  }));
}
export const toggleFavoriteTheme = (userId: string, themeId: string) =>
  update(userId, (lib) => ({ ...lib, favoriteThemes: lib.favoriteThemes.includes(themeId) ? lib.favoriteThemes.filter((t) => t !== themeId) : [...lib.favoriteThemes, themeId] }));

/* ---------- Export & Import ---------- */

export interface ExportFile {
  format: 'barebastian-bio';
  version: 1;
  exportedAt: string;
  profiles: { name: string; folder: string; project: BioProject }[];
}

export function exportProjects(userId: string, ids: string[]): string {
  const lib = readLibrary(userId);
  const file: ExportFile = {
    format: 'barebastian-bio',
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles: lib.projects.filter((p) => ids.includes(p.id)).map((p) => ({ name: p.name, folder: p.folder, project: p.project })),
  };
  return JSON.stringify(file, null, 2);
}

/** Importiert Profile aus einer Export-Datei. Liefert die Anzahl. */
export function importProjects(userId: string, json: string): number {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const parsed = bioExportSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Diese Datei ist kein gültiges Bio-Profil (${describeIssues(parsed.error)}).`);
  for (const p of (raw as ExportFile).profiles) createProject(userId, p.name || 'Importiert', migrateProject(p.project), p.folder || DEFAULT_FOLDER);
  return parsed.data.profiles.length;
}
