/**
 * Social Hub – Posts, Likes, Kommentare, Umfragen und Follows aller Mitglieder (Server).
 * Bilder werden als Dateien hochgeladen (siehe lib/api.ts → uploadFile).
 */
import { getProfile, listProfiles, type Profile } from '../../auth/userDirectory';
import { CREATOR_ID } from '../../config/admin';
import { api } from '../../lib/api';
import { remoteResource } from '../../lib/remote';
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

export interface SocialState {
  version: 1;
  posts: SocialPost[];
  /** userId → IDs, denen dieser User folgt */
  follows: Record<string, string[]>;
}

export const MAX_POST_LENGTH = 2000;
export const MAX_IMAGES = 4;

export const DEFAULT_DESIGN: PostDesign = { bg: 'none', size: 16, align: 'left' };

/* ---------- Hashtags & Erwähnungen ---------- */

const TAG_RE = /(^|[^\p{L}\d_&#])#([\p{L}\d_]{2,30})/gu;
export const extractTags = (text: string) => [...new Set([...text.matchAll(TAG_RE)].map((m) => m[2].toLowerCase()))].slice(0, 15);

const empty = (): SocialState => ({ version: 1, posts: [], follows: {} });

/** Social-Daten vom Server (nur Posts, die man sehen darf). */
export const socialResource = remoteResource<SocialState>('/social', empty, 20000);
const read = () => socialResource.get();
const apply = (state: SocialState) => socialResource.set(state);

export const useSocial = (): SocialState => socialResource.use();

/* ---------- Posts ---------- */

export interface PostInput {
  text: string;
  design: PostDesign;
  images: string[];
  poll: Poll | null;
  visibility: SocialPost['visibility'];
}

const toServer = (input: PostInput) => ({
  ...input,
  text: input.text.slice(0, MAX_POST_LENGTH),
  poll: input.poll ? { endsAt: input.poll.endsAt, options: input.poll.options.map(({ id, text }) => ({ id, text })) } : null,
});

export async function savePost(_authorId: string, input: PostInput, id?: string): Promise<SocialPost> {
  const res = id ? await api.put<{ id: string; state: SocialState }>(`/social/posts/${id}`, toServer(input)) : await api.post<{ id: string; state: SocialState }>('/social/posts', toServer(input));
  apply(res.state);
  return res.state.posts.find((p) => p.id === res.id)!;
}

export async function deletePost(id: string) {
  apply(await api.del<SocialState>(`/social/posts/${id}`));
}

const patchLocal = (id: string, fn: (p: SocialPost) => SocialPost) => apply({ ...read(), posts: read().posts.map((p) => (p.id === id ? fn(p) : p)) });
const act = (path: string, body: unknown = {}) =>
  api
    .post<SocialState>(path, body)
    .then(apply)
    .catch((err) => {
      socialResource.refresh();
      alert(err instanceof Error ? err.message : 'Aktion fehlgeschlagen.');
    });

export function toggleLike(postId: string, userId: string) {
  patchLocal(postId, (p) => ({ ...p, likes: p.likes.includes(userId) ? p.likes.filter((x) => x !== userId) : [...p.likes, userId] }));
  return act(`/social/posts/${postId}/like`);
}

export function addComment(postId: string, _authorId: string, text: string) {
  const t = text.trim().slice(0, 500);
  if (!t) return Promise.resolve();
  return act(`/social/posts/${postId}/comments`, { text: t });
}

export const deleteComment = (postId: string, commentId: string) =>
  api
    .del<SocialState>(`/social/posts/${postId}/comments/${commentId}`)
    .then(apply)
    .catch(() => socialResource.refresh());

export function vote(postId: string, optionId: string, userId: string) {
  patchLocal(postId, (p) => (p.poll ? { ...p, poll: { ...p.poll, options: p.poll.options.map((o) => ({ ...o, votes: o.id === optionId ? [...o.votes.filter((v) => v !== userId), userId] : o.votes.filter((v) => v !== userId) })) } } : p));
  return act(`/social/posts/${postId}/vote`, { optionId });
}

/* ---------- Folgen ---------- */

export function toggleFollow(userId: string, targetId: string) {
  if (userId === targetId) return Promise.resolve();
  const s = read();
  const list = s.follows[userId] ?? [];
  apply({ ...s, follows: { ...s.follows, [userId]: list.includes(targetId) ? list.filter((x) => x !== targetId) : [...list, targetId] } });
  return act(`/social/follow/${targetId}`);
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
