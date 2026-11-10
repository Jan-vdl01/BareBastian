/**
 * Social Hub (Demo: localStorage + IndexedDB für Bilder, geteilt zwischen Konten in diesem Browser).
 */
import { getProfile, listProfiles, type Profile } from '../../auth/userDirectory';
import { CREATOR_ID } from '../../config/admin';
import { readJSON, uid, useStoredValue, writeJSON } from '../../lib/localStore';
import { deleteMedia } from '../../lib/mediaDb';
import type { FontId } from '../bio-builder/themes';

export interface PostDesign {
  /** Hintergrund-Vorlage (siehe POST_BACKGROUNDS) */
  bg: string;
  textColor?: string;
  font?: FontId;
  size: number;
  align: 'left' | 'center' | 'right';
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Poll {
  options: PollOption[];
  endsAt: string | null;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  text: string;
  design: PostDesign;
  images: string[];
  poll: Poll | null;
  tags: string[];
  visibility: 'public' | 'followers';
  likes: string[];
  comments: Comment[];
  createdAt: string;
  editedAt?: string;
}

interface SocialState {
  version: 1;
  posts: SocialPost[];
  /** userId → IDs, denen dieser User folgt */
  follows: Record<string, string[]>;
}

const KEY = 'bb_social';
export const MAX_POST_LENGTH = 2000;
export const MAX_IMAGES = 4;

export const DEFAULT_DESIGN: PostDesign = { bg: 'none', size: 16, align: 'left' };

/* ---------- Hashtags & Erwähnungen ---------- */

const TAG_RE = /(^|[^\p{L}\d_&#])#([\p{L}\d_]{2,30})/gu;
export const extractTags = (text: string) => [...new Set([...text.matchAll(TAG_RE)].map((m) => m[2].toLowerCase()))].slice(0, 15);

/* ---------- Startdaten ---------- */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

function seed(): SocialState {
  const post = (authorId: string, h: number, text: string, design: Partial<PostDesign> = {}, extra: Partial<SocialPost> = {}): SocialPost => ({
    id: uid('sp-'),
    authorId,
    text,
    design: { ...DEFAULT_DESIGN, ...design },
    images: [],
    poll: null,
    tags: extractTags(text),
    visibility: 'public',
    likes: [],
    comments: [],
    createdAt: hoursAgo(h),
    ...extra,
  });
  const posts: SocialPost[] = [
    post(CREATOR_ID, 2, 'Heute Abend ab 21 Uhr live! 🔥 Wer ist dabei? #livestream #heuteabend', { bg: 'fire', size: 24, align: 'center' }, { likes: ['demo-lukas', 'demo-mia', 'demo-tom'] }),
    post('demo-mia', 5, 'Neues Fotoprojekt gestartet 📸 Ich teste gerade Lichtsetups mit nur einer Lampe. Wer hat Tipps? #fotografie #licht'),
    post('demo-tom', 9, 'Was soll ich als Nächstes zocken? 🎮 #gaming', {}, {
      poll: { endsAt: null, options: [
        { id: 'o1', text: 'Horror-Game', votes: ['demo-lukas', 'demo-jonas'] },
        { id: 'o2', text: 'Rennspiel', votes: ['demo-mia'] },
        { id: 'o3', text: 'Retro-Klassiker', votes: [] },
      ] },
      likes: ['demo-jonas'],
    }),
    post('demo-lukas', 14, '[b]Gym-Update:[/b] neuer Rekord beim Kreuzheben 💪 Disziplin schlägt Motivation. #gym #fitness', { bg: 'midnight', size: 20 }, { likes: ['demo-tom', CREATOR_ID] }),
    post('demo-jonas', 20, 'Sonntag = Kochtag. Heute gibt es selbstgemachte Ramen 🍜 Rezept in den Kommentaren? #kochen #sonntag', {}, {
      comments: [{ id: uid('c-'), authorId: 'demo-mia', text: 'Ja bitte! 😍', createdAt: hoursAgo(19) }],
      likes: ['demo-mia'],
    }),
    post(CREATOR_ID, 30, 'Danke für 1.000 Follower! ❤️ Ihr seid die Besten. #danke #community', { bg: 'aurora', size: 26, align: 'center' }, { likes: ['demo-lukas', 'demo-mia', 'demo-tom', 'demo-jonas'] }),
    post('demo-mia', 48, '[i]„Licht ist alles.“[/i] – mein Motto für diese Woche ✨ #fotografie #kunst', { bg: 'paper', size: 22, align: 'center', font: 'serif' }),
    post('demo-tom', 60, 'Nachtschicht mit Pizza und Stream 🍕 Wer ist noch wach? #gaming #nachteule', { bg: 'neon', size: 20 }),
  ];
  return {
    version: 1,
    posts,
    follows: {
      'demo-lukas': [CREATOR_ID, 'demo-tom', 'demo-jonas'],
      'demo-mia': [CREATOR_ID, 'demo-jonas'],
      'demo-tom': [CREATOR_ID, 'demo-lukas'],
      'demo-jonas': [CREATOR_ID, 'demo-mia', 'demo-lukas'],
      [CREATOR_ID]: [],
    },
  };
}

function read(): SocialState {
  const s = readJSON<SocialState | null>(KEY, null);
  if (s?.version === 1) return s;
  const fresh = seed();
  writeJSON(KEY, fresh);
  return fresh;
}

const write = (s: SocialState) => writeJSON(KEY, s);
const update = (fn: (s: SocialState) => SocialState) => write(fn(read()));

export function useSocial(): SocialState {
  const s = useStoredValue<SocialState | null>(KEY, null);
  return s?.version === 1 ? s : read();
}

/** Neue Mitglieder folgen anfangs BAREBASTIAN. */
export function ensureMember(userId: string) {
  const s = read();
  if (!s.follows[userId]) write({ ...s, follows: { ...s.follows, [userId]: userId === CREATOR_ID ? [] : [CREATOR_ID] } });
}

/* ---------- Posts ---------- */

export interface PostInput {
  text: string;
  design: PostDesign;
  images: string[];
  poll: Poll | null;
  visibility: SocialPost['visibility'];
}

export function savePost(authorId: string, input: PostInput, id?: string): SocialPost {
  const now = new Date().toISOString();
  let saved!: SocialPost;
  update((s) => {
    const existing = id ? s.posts.find((p) => p.id === id) : undefined;
    if (existing) {
      saved = { ...existing, ...input, text: input.text.slice(0, MAX_POST_LENGTH), tags: extractTags(input.text), editedAt: now };
      return { ...s, posts: s.posts.map((p) => (p.id === id ? saved : p)) };
    }
    saved = { id: uid('sp-'), authorId, ...input, text: input.text.slice(0, MAX_POST_LENGTH), tags: extractTags(input.text), likes: [], comments: [], createdAt: now };
    return { ...s, posts: [saved, ...s.posts] };
  });
  return saved;
}

export async function deletePost(id: string) {
  const post = read().posts.find((p) => p.id === id);
  if (post) await Promise.all(post.images.map((ref) => deleteMedia(ref).catch(() => undefined)));
  update((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
}

const patchPost = (id: string, fn: (p: SocialPost) => SocialPost) => update((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? fn(p) : p)) }));

export const toggleLike = (postId: string, userId: string) => patchPost(postId, (p) => ({ ...p, likes: p.likes.includes(userId) ? p.likes.filter((x) => x !== userId) : [...p.likes, userId] }));

export function addComment(postId: string, authorId: string, text: string) {
  const t = text.trim().slice(0, 500);
  if (!t) return;
  patchPost(postId, (p) => ({ ...p, comments: [...p.comments, { id: uid('c-'), authorId, text: t, createdAt: new Date().toISOString() }] }));
}
export const deleteComment = (postId: string, commentId: string) => patchPost(postId, (p) => ({ ...p, comments: p.comments.filter((c) => c.id !== commentId) }));

export function vote(postId: string, optionId: string, userId: string) {
  patchPost(postId, (p) =>
    p.poll && (!p.poll.endsAt || new Date(p.poll.endsAt) > new Date())
      ? { ...p, poll: { ...p.poll, options: p.poll.options.map((o) => ({ ...o, votes: o.id === optionId ? [...o.votes.filter((v) => v !== userId), userId] : o.votes.filter((v) => v !== userId) })) } }
      : p,
  );
}

/* ---------- Folgen ---------- */

export function toggleFollow(userId: string, targetId: string) {
  if (userId === targetId) return;
  update((s) => {
    const list = s.follows[userId] ?? [];
    return { ...s, follows: { ...s.follows, [userId]: list.includes(targetId) ? list.filter((x) => x !== targetId) : [...list, targetId] } };
  });
}

export const followingOf = (s: SocialState, userId: string) => s.follows[userId] ?? [];
export const followersOf = (s: SocialState, userId: string) => Object.entries(s.follows).filter(([, l]) => l.includes(userId)).map(([id]) => id);

/** Darf `viewer` diesen Post sehen? */
export const canSee = (s: SocialState, post: SocialPost, viewer: string) => post.visibility === 'public' || post.authorId === viewer || followingOf(s, viewer).includes(post.authorId);

/* ---------- Feeds ---------- */

export function followingFeed(s: SocialState, viewer: string) {
  const f = new Set([...followingOf(s, viewer), viewer]);
  return s.posts.filter((p) => f.has(p.authorId) && canSee(s, p, viewer)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Entdecken: öffentliche Posts nach Engagement & Aktualität, passende Hashtags werden bevorzugt. */
export function exploreFeed(s: SocialState, viewer: string, tag?: string) {
  const myTags = new Set(s.posts.filter((p) => p.authorId === viewer || p.likes.includes(viewer)).flatMap((p) => p.tags));
  const score = (p: SocialPost) => {
    const ageH = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
    const affinity = p.tags.filter((t) => myTags.has(t)).length;
    return (p.likes.length * 2 + p.comments.length * 3 + affinity * 4 + 1) / Math.pow(ageH + 2, 0.8);
  };
  return s.posts
    .filter((p) => p.visibility === 'public' && (!tag || p.tags.includes(tag.toLowerCase())))
    .sort((a, b) => (tag ? b.createdAt.localeCompare(a.createdAt) : score(b) - score(a)));
}

export function trendingTags(s: SocialState, days = 14, limit = 8) {
  const since = Date.now() - days * 86400000;
  const counts = new Map<string, number>();
  for (const p of s.posts) {
    if (new Date(p.createdAt).getTime() < since || p.visibility !== 'public') continue;
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1 + p.likes.length * 0.2);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag, score]) => ({ tag, posts: s.posts.filter((p) => p.tags.includes(tag)).length, score }));
}

export interface Suggestion {
  profile: Profile;
  reason: string;
  score: number;
}

/** Vorschläge: gemeinsame Interessen, ähnliche Hashtags, Freunde von Freunden, Beliebtheit. */
export function suggestions(s: SocialState, viewer: string, limit = 5): Suggestion[] {
  const me = getProfile(viewer);
  const following = new Set(followingOf(s, viewer));
  const myInterests = new Set((me?.interests ?? []).map((i) => i.toLowerCase()));
  const myTags = new Set(s.posts.filter((p) => p.authorId === viewer || p.likes.includes(viewer)).flatMap((p) => p.tags));
  return listProfiles()
    .filter((p) => p.id !== viewer && !following.has(p.id))
    .map((p) => {
      const shared = p.interests.filter((i) => myInterests.has(i.toLowerCase()));
      const theirTags = new Set(s.posts.filter((x) => x.authorId === p.id).flatMap((x) => x.tags));
      const sharedTags = [...theirTags].filter((t) => myTags.has(t));
      const viaFriends = [...following].filter((f) => followingOf(s, f).includes(p.id));
      const followers = followersOf(s, p.id).length;
      const score = shared.length * 3 + sharedTags.length * 2 + viaFriends.length * 1.5 + followers * 0.2 + (p.id === CREATOR_ID ? 1 : 0);
      const reason = shared.length
        ? `Gemeinsame Interessen: ${shared.slice(0, 2).join(', ')}`
        : sharedTags.length
          ? `Postet über #${sharedTags[0]}`
          : viaFriends.length
            ? `Gefolgt von ${getProfile(viaFriends[0])?.displayName ?? 'Kontakten'}`
            : followers
              ? `${followers} Follower in der Community`
              : 'Neu in der Community';
      return { profile: p, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------- Demo-Reaktionen ---------- */

/** Demo-Mitglieder reagieren nach kurzer Zeit auf neue Posts (nur Demo). */
export function scheduleDemoReactions(postId: string) {
  const demos = listProfiles().filter((p) => p.isDemo).sort(() => Math.random() - 0.5);
  demos.slice(0, 1 + Math.floor(Math.random() * 3)).forEach((d, i) => {
    setTimeout(() => {
      const p = read().posts.find((x) => x.id === postId);
      if (p && !p.likes.includes(d.id)) toggleLike(postId, d.id);
    }, 1800 + i * 1400);
  });
  const commenter = demos[0];
  if (commenter && Math.random() < 0.7) {
    const lines = ['Mega! 🔥', 'Richtig stark 👏', 'Bin dabei! 😄', 'Love it ❤️', 'Haha, genau so! 😂'];
    setTimeout(() => {
      if (read().posts.some((x) => x.id === postId)) addComment(postId, commenter.id, lines[Math.floor(Math.random() * lines.length)]);
    }, 4200);
  }
}
