import { Router } from 'express';
import { z } from 'zod';
import { contentSchema } from '../../src/portfolio/lib/schemas';
import { all, now, one, parseJson, run, tx } from '../db';
import { deleteFileByUrl, FILE_URL_RE, storeDataUrl } from '../files';
import { notifyAdmin } from '../mail';
import { badRequest, EMAIL_RE, forbidden, h, newId, notFound, rateLimit } from '../security';
import { getProfile, listProfiles, requireAccess, requireAdmin, requireLogin, type ProfileData } from '../users';

export const communityRouter = Router();

const MAX_POST_LENGTH = 2000;
const TAG_RE = /(^|[^\p{L}\d_&#])#([\p{L}\d_]{2,30})/gu;
const extractTags = (text: string) => [...new Set([...text.matchAll(TAG_RE)].map((m) => m[2].toLowerCase()))].slice(0, 15);
const writeLimit = rateLimit('write', 60, 60 * 1000, 'Du bist gerade sehr schnell unterwegs. Bitte warte einen Moment.');

/* ================= Profile ================= */

communityRouter.get('/profiles', requireLogin, (_req, res) => {
  res.json(listProfiles());
});

const short = (max: number) => z.string().trim().max(max);
const profileInput = z.object({
  displayName: z.string().trim().min(2, 'Der Anzeigename braucht mindestens 2 Zeichen.').max(40),
  username: z
    .string()
    .trim()
    .min(3, 'Der Benutzername braucht mindestens 3 Zeichen.')
    .max(20)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Benutzername: nur Buchstaben, Zahlen, Punkt und Unterstrich.'),
  avatar: z.string().max(5_000_000).optional(),
  cover: z.string().max(5_000_000).optional(),
  bio: short(300),
  location: short(60),
  website: short(200).refine((v) => !v || /^https?:\/\//i.test(v), 'Die Website muss mit https:// beginnen.'),
  pronouns: short(30),
  interests: z.array(short(30)).max(12),
  socials: z.object({ instagram: short(60).optional(), x: short(60).optional(), telegram: short(60).optional() }),
});

communityRouter.put(
  '/profiles/me',
  requireLogin,
  writeLimit,
  h((req, res) => {
    const parsed = profileInput.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? 'Ungültige Profildaten.');
    const user = req.user!;
    const input = parsed.data;
    if (one('SELECT 1 FROM profiles WHERE username = ? AND user_id != ?', input.username, user.id)) throw badRequest('Dieser Benutzername ist schon vergeben.');
    const old = getProfile(user.id);

    const image = (value: string | undefined, previous: string | undefined) => {
      if (!value) {
        if (previous) deleteFileByUrl(previous, user);
        return undefined;
      }
      if (value === previous) return value;
      if (FILE_URL_RE.test(value)) return value;
      const stored = storeDataUrl(value, user.id, 'avatar');
      if (!stored || !FILE_URL_RE.test(stored)) throw badRequest('Ungültiges Bild.');
      if (previous) deleteFileByUrl(previous, user);
      return stored;
    };

    const { username, ...rest } = input;
    const data: ProfileData = { ...rest, avatar: image(input.avatar, old?.avatar), cover: image(input.cover, old?.cover) };
    run('UPDATE profiles SET username = ?, data = ? WHERE user_id = ?', username, JSON.stringify(data), user.id);
    res.json(getProfile(user.id));
  }),
);

/* ================= Social Hub ================= */

interface PostRow {
  id: string;
  author_id: string;
  text: string;
  design: string;
  images: string;
  poll: string | null;
  tags: string;
  visibility: 'public' | 'followers';
  created_at: string;
  edited_at: string | null;
}

interface StoredPoll {
  options: { id: string; text: string }[];
  endsAt: string | null;
}

function followsMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const r of all<{ follower_id: string; followee_id: string }>('SELECT follower_id, followee_id FROM follows')) (map[r.follower_id] ??= []).push(r.followee_id);
  return map;
}

/** Alle Posts, die `viewer` sehen darf, im Format des Frontends. */
function socialState(viewer: string, isAdmin: boolean) {
  const follows = followsMap();
  const mine = new Set(follows[viewer] ?? []);
  const rows = all<PostRow>('SELECT * FROM posts ORDER BY created_at DESC LIMIT 1000').filter(
    (p) => isAdmin || p.visibility === 'public' || p.author_id === viewer || mine.has(p.author_id),
  );
  const ids = new Set(rows.map((r) => r.id));
  const likes = new Map<string, string[]>();
  for (const l of all<{ post_id: string; user_id: string }>('SELECT post_id, user_id FROM post_likes')) if (ids.has(l.post_id)) (likes.get(l.post_id) ?? likes.set(l.post_id, []).get(l.post_id)!).push(l.user_id);
  const comments = new Map<string, { id: string; authorId: string; text: string; createdAt: string }[]>();
  for (const c of all<{ id: string; post_id: string; author_id: string; text: string; created_at: string }>('SELECT * FROM post_comments ORDER BY created_at')) {
    if (ids.has(c.post_id)) (comments.get(c.post_id) ?? comments.set(c.post_id, []).get(c.post_id)!).push({ id: c.id, authorId: c.author_id, text: c.text, createdAt: c.created_at });
  }
  const votes = new Map<string, { user_id: string; option_id: string }[]>();
  for (const v of all<{ post_id: string; user_id: string; option_id: string }>('SELECT * FROM poll_votes')) if (ids.has(v.post_id)) (votes.get(v.post_id) ?? votes.set(v.post_id, []).get(v.post_id)!).push(v);

  const posts = rows.map((p) => {
    const poll = parseJson<StoredPoll | null>(p.poll, null);
    const pv = votes.get(p.id) ?? [];
    return {
      id: p.id,
      authorId: p.author_id,
      text: p.text,
      design: parseJson(p.design, { bg: 'none', size: 16, align: 'left' }),
      images: parseJson<string[]>(p.images, []),
      poll: poll ? { endsAt: poll.endsAt, options: poll.options.map((o) => ({ ...o, votes: pv.filter((v) => v.option_id === o.id).map((v) => v.user_id) })) } : null,
      tags: parseJson<string[]>(p.tags, []),
      visibility: p.visibility,
      likes: likes.get(p.id) ?? [],
      comments: comments.get(p.id) ?? [],
      createdAt: p.created_at,
      ...(p.edited_at ? { editedAt: p.edited_at } : {}),
    };
  });
  return { version: 1 as const, posts, follows };
}

communityRouter.get('/social', requireAccess, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(socialState(req.user!.id, req.user!.role === 'admin'));
});

const postInput = z.object({
  text: z.string().max(MAX_POST_LENGTH * 2),
  design: z.object({
    bg: z.string().max(40),
    size: z.number().min(8).max(80),
    align: z.enum(['left', 'center', 'right']),
    textColor: z.string().max(40).optional(),
    font: z.string().max(40).optional(),
  }),
  images: z.array(z.string().regex(FILE_URL_RE, 'Ungültiges Bild.')).max(4),
  poll: z
    .object({
      options: z.array(z.object({ id: z.string().max(40), text: z.string().trim().min(1).max(80) })).min(2).max(4),
      endsAt: z.string().max(40).nullable(),
    })
    .nullable(),
  visibility: z.enum(['public', 'followers']),
});

const getPost = (id: string) => one<PostRow>('SELECT * FROM posts WHERE id = ?', id);
const canModerate = (userId: string, role: string, authorId: string) => role === 'admin' || userId === authorId;

communityRouter.post(
  '/social/posts',
  requireAccess,
  writeLimit,
  h((req, res) => {
    const parsed = postInput.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? 'Ungültiger Post.');
    const p = parsed.data;
    if (!p.text.trim() && !p.images.length && !p.poll) throw badRequest('Der Post ist leer.');
    const id = newId('sp');
    run(
      'INSERT INTO posts (id, author_id, text, design, images, poll, tags, visibility, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      req.user!.id,
      p.text.slice(0, MAX_POST_LENGTH),
      JSON.stringify(p.design),
      JSON.stringify(p.images),
      p.poll ? JSON.stringify(p.poll) : null,
      JSON.stringify(extractTags(p.text)),
      p.visibility,
      now(),
    );
    res.status(201).json({ id, state: socialState(req.user!.id, req.user!.role === 'admin') });
  }),
);

communityRouter.put(
  '/social/posts/:id',
  requireAccess,
  writeLimit,
  h((req, res) => {
    const post = getPost(String(req.params.id));
    if (!post) throw notFound('Post nicht gefunden.');
    if (post.author_id !== req.user!.id) throw forbidden('Nur der Autor kann diesen Post bearbeiten.');
    const parsed = postInput.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? 'Ungültiger Post.');
    const p = parsed.data;
    const oldImages = parseJson<string[]>(post.images, []);
    tx(() => {
      run(
        'UPDATE posts SET text = ?, design = ?, images = ?, poll = ?, tags = ?, visibility = ?, edited_at = ? WHERE id = ?',
        p.text.slice(0, MAX_POST_LENGTH),
        JSON.stringify(p.design),
        JSON.stringify(p.images),
        p.poll ? JSON.stringify(p.poll) : null,
        JSON.stringify(extractTags(p.text)),
        p.visibility,
        now(),
        post.id,
      );
      if (!p.poll) run('DELETE FROM poll_votes WHERE post_id = ?', post.id);
    });
    oldImages.filter((u) => !p.images.includes(u)).forEach((u) => deleteFileByUrl(u, req.user));
    res.json({ id: post.id, state: socialState(req.user!.id, req.user!.role === 'admin') });
  }),
);

communityRouter.delete(
  '/social/posts/:id',
  requireAccess,
  h((req, res) => {
    const post = getPost(String(req.params.id));
    if (!post) throw notFound('Post nicht gefunden.');
    if (!canModerate(req.user!.id, req.user!.role, post.author_id)) throw forbidden();
    run('DELETE FROM posts WHERE id = ?', post.id);
    parseJson<string[]>(post.images, []).forEach((u) => deleteFileByUrl(u, { id: post.author_id, role: 'admin' }));
    res.json(socialState(req.user!.id, req.user!.role === 'admin'));
  }),
);

/** Sichtbarkeit prüfen, bevor man reagiert. */
function visiblePost(id: string, viewer: string, role: string) {
  const post = getPost(id);
  if (!post) throw notFound('Post nicht gefunden.');
  if (role !== 'admin' && post.visibility === 'followers' && post.author_id !== viewer && !one('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', viewer, post.author_id)) throw notFound('Post nicht gefunden.');
  return post;
}

communityRouter.post('/social/posts/:id/like', requireAccess, writeLimit, h((req, res) => {
  const post = visiblePost(String(req.params.id), req.user!.id, req.user!.role);
  const liked = one('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', post.id, req.user!.id);
  if (liked) run('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', post.id, req.user!.id);
  else run('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', post.id, req.user!.id);
  res.json(socialState(req.user!.id, req.user!.role === 'admin'));
}));

communityRouter.post('/social/posts/:id/comments', requireAccess, writeLimit, h((req, res) => {
  const post = visiblePost(String(req.params.id), req.user!.id, req.user!.role);
  const text = String(req.body?.text ?? '').trim().slice(0, 500);
  if (!text) throw badRequest('Der Kommentar ist leer.');
  run('INSERT INTO post_comments (id, post_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)', newId('c'), post.id, req.user!.id, text, now());
  res.json(socialState(req.user!.id, req.user!.role === 'admin'));
}));

communityRouter.delete('/social/posts/:id/comments/:cid', requireAccess, h((req, res) => {
  const c = one<{ author_id: string; post_id: string }>('SELECT author_id, post_id FROM post_comments WHERE id = ?', String(req.params.cid));
  if (!c) throw notFound('Kommentar nicht gefunden.');
  const post = getPost(c.post_id);
  // Löschen dürfen: Autor des Kommentars, Autor des Posts, Admin
  if (!(req.user!.role === 'admin' || c.author_id === req.user!.id || post?.author_id === req.user!.id)) throw forbidden();
  run('DELETE FROM post_comments WHERE id = ?', String(req.params.cid));
  res.json(socialState(req.user!.id, req.user!.role === 'admin'));
}));

communityRouter.post('/social/posts/:id/vote', requireAccess, writeLimit, h((req, res) => {
  const post = visiblePost(String(req.params.id), req.user!.id, req.user!.role);
  const poll = parseJson<StoredPoll | null>(post.poll, null);
  const optionId = String(req.body?.optionId ?? '');
  if (!poll || !poll.options.some((o) => o.id === optionId)) throw badRequest('Ungültige Antwort.');
  if (poll.endsAt && new Date(poll.endsAt) < new Date()) throw badRequest('Die Umfrage ist beendet.');
  run('INSERT INTO poll_votes (post_id, user_id, option_id) VALUES (?, ?, ?) ON CONFLICT(post_id, user_id) DO UPDATE SET option_id = excluded.option_id', post.id, req.user!.id, optionId);
  res.json(socialState(req.user!.id, req.user!.role === 'admin'));
}));

communityRouter.post('/social/follow/:id', requireAccess, writeLimit, h((req, res) => {
  const target = String(req.params.id);
  if (target === req.user!.id) throw badRequest('Du kannst dir nicht selbst folgen.');
  if (!one('SELECT 1 FROM users WHERE id = ? AND disabled = 0', target)) throw notFound('Mitglied nicht gefunden.');
  if (one('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', req.user!.id, target)) run('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', req.user!.id, target);
  else run('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', req.user!.id, target, now());
  res.json(socialState(req.user!.id, req.user!.role === 'admin'));
}));

/* ================= Chat ================= */

interface MessageRow {
  id: string;
  from_id: string;
  to_id: string;
  text: string;
  at: string;
  read_at: string | null;
}

function messagesFor(userId: string) {
  return all<MessageRow>(
    'SELECT id, from_id, to_id, text, at, read_at FROM messages WHERE (from_id = ? AND hidden_from = 0) OR (to_id = ? AND hidden_to = 0) ORDER BY at',
    userId,
    userId,
  ).map((m) => ({ id: m.id, from: m.from_id, to: m.to_id, text: m.text, at: m.at, ...(m.read_at ? { readAt: m.read_at } : {}) }));
}

communityRouter.get('/chat', requireAccess, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(messagesFor(req.user!.id));
});

communityRouter.post('/chat', requireAccess, writeLimit, h((req, res) => {
  const to = String(req.body?.to ?? '');
  const text = String(req.body?.text ?? '').trim().slice(0, 1000);
  if (!text) throw badRequest('Die Nachricht ist leer.');
  if (to === req.user!.id || !one('SELECT 1 FROM users WHERE id = ? AND disabled = 0', to)) throw badRequest('Empfänger nicht gefunden.');
  run('INSERT INTO messages (id, from_id, to_id, text, at) VALUES (?, ?, ?, ?, ?)', newId('m'), req.user!.id, to, text, now());
  res.json(messagesFor(req.user!.id));
}));

communityRouter.post('/chat/read', requireAccess, (req, res) => {
  run('UPDATE messages SET read_at = ? WHERE from_id = ? AND to_id = ? AND read_at IS NULL', now(), String(req.body?.other ?? ''), req.user!.id);
  res.json(messagesFor(req.user!.id));
});

/** Unterhaltung nur für mich ausblenden – der andere behält seine Kopie. */
communityRouter.delete('/chat/:other', requireAccess, (req, res) => {
  const me = req.user!.id;
  const other = String(req.params.other);
  run('UPDATE messages SET hidden_from = 1 WHERE from_id = ? AND to_id = ?', me, other);
  run('UPDATE messages SET hidden_to = 1 WHERE to_id = ? AND from_id = ?', me, other);
  run('DELETE FROM messages WHERE hidden_from = 1 AND hidden_to = 1');
  res.json(messagesFor(me));
});

/* ================= Persönliche Dokumente (Finanzen, Bio-Designer) ================= */

const DOC_KEY_RE = /^bb_(finance|bio_library)_[\w-]+$/;
const MAX_DOC_BYTES = 3 * 1024 * 1024;

communityRouter.get('/docs', requireLogin, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const docs = all<{ key: string; value: string }>('SELECT key, value FROM user_docs WHERE user_id = ?', req.user!.id);
  res.json(Object.fromEntries(docs.map((d) => [d.key, parseJson(d.value, null)])));
});

communityRouter.put('/docs/:key', requireAccess, h((req, res) => {
  const key = String(req.params.key);
  if (!DOC_KEY_RE.test(key) || !key.endsWith(`_${req.user!.id}`)) throw badRequest('Ungültiger Speicherbereich.');
  const value = JSON.stringify(req.body?.value ?? null);
  if (value.length > MAX_DOC_BYTES) throw badRequest('Die Daten sind zu groß (max. 3 MB).');
  run('INSERT INTO user_docs (user_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', req.user!.id, key, value, now());
  res.json({ ok: true });
}));

/* ================= Bibliothek (Videos, Fotos, Posts des Creators) ================= */

const CONTENT_KEY = 'content';
const emptyContent = () => ({ version: 1, updatedAt: '', videos: [], photos: [], posts: [] });

communityRouter.get('/content', requireAccess, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const row = one<{ value: string }>('SELECT value FROM kv WHERE key = ?', CONTENT_KEY);
  res.json(parseJson(row?.value, emptyContent()));
});

communityRouter.put('/content', requireAdmin, h((req, res) => {
  const body = req.body as { videos?: { poster?: string }[] };
  // Eingebettete Vorschaubilder als Dateien speichern
  for (const v of body?.videos ?? []) if (v.poster?.startsWith('data:')) v.poster = storeDataUrl(v.poster, req.user!.id, 'library');
  const parsed = contentSchema.safeParse(body);
  if (!parsed.success) throw badRequest(`Ungültige Inhalte: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
  const value = { ...(body as object), updatedAt: now() };
  run('INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', CONTENT_KEY, JSON.stringify(value), now());
  res.json(value);
}));

/* ================= Kontaktformular ================= */

communityRouter.post('/contact', rateLimit('contact', 5, 60 * 60 * 1000, 'Du hast schon mehrere Nachrichten gesendet. Bitte versuche es später erneut.'), h(async (req, res) => {
  const b = req.body ?? {};
  // Honeypot-Feld: von Menschen unsichtbar, Bots füllen es aus
  if (b.website) return res.json({ ok: true });
  const name = String(b.name ?? '').trim().slice(0, 80);
  const email = String(b.email ?? '').trim().slice(0, 200);
  const topic = String(b.topic ?? 'allgemein').slice(0, 40);
  const message = String(b.message ?? '').trim().slice(0, 5000);
  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) throw badRequest('Bitte fülle alle Felder korrekt aus.');
  run('INSERT INTO contact_messages (id, name, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', newId('k'), name, email, topic, message, now());
  await notifyAdmin(`Kontaktformular: ${topic}`, [`Von: ${name} <${email}>`, message], email);
  res.json({ ok: true });
}));
