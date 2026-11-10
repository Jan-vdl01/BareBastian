import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useProfiles } from '../../auth/userDirectory';
import { HeartFilledIcon, HeartIcon, LinkIcon, PencilIcon, PostIcon, SendIcon, TrashIcon } from '../../icons';
import { ProfileAvatar, ProfileName } from '../profile/ProfileAvatar';
import { PostImages, PostPoll, PostText } from './PostContent';
import { addComment, deleteComment, deletePost, followingOf, toggleFollow, toggleLike, useSocial, type SocialPost } from './socialStore';

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  if (s < 86400 * 7) return `vor ${Math.floor(s / 86400)} T.`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

export function PostCard({ post, onEdit, preview = false }: { post: SocialPost; onEdit?: (p: SocialPost) => void; preview?: boolean }) {
  const { user, isAdmin } = useAuth();
  const me = user?.id ?? '';
  const profiles = useProfiles();
  const social = useSocial();
  const author = profiles[post.authorId];
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pop, setPop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const liked = post.likes.includes(me);
  const own = post.authorId === me;
  const follows = followingOf(social, me).includes(post.authorId);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  const like = () => {
    if (preview) return;
    toggleLike(post.id, me);
    if (!liked) {
      setPop(true);
      setTimeout(() => setPop(false), 400);
    }
  };

  const likedBy = post.likes.map((id) => profiles[id]?.displayName).filter(Boolean) as string[];

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl sm:p-5" data-post={post.id}>
      <header className="flex items-start gap-3">
        <a href={`#/abo-bereich/profil?u=${post.authorId}`} className="shrink-0">
          <ProfileAvatar profile={author} size={44} />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <a href={`#/abo-bereich/profil?u=${post.authorId}`} className="hover:underline">
              <ProfileName profile={author} className="text-sm font-semibold text-white" />
            </a>
            {!own && !preview && !follows && (
              <button type="button" onClick={() => toggleFollow(me, post.authorId)} className="text-xs font-semibold text-sky-300 hover:underline">
                · Folgen
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            @{author?.username ?? 'unbekannt'} · {timeAgo(post.createdAt)}
            {post.editedAt && ' · bearbeitet'}
            {post.visibility === 'followers' && ' · 🔒 Nur Follower'}
          </p>
        </div>
        {!preview && (own || isAdmin) && (
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Post-Aktionen" aria-expanded={menu} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white">
              ⋯
            </button>
            {menu && (
              <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-white/10 bg-[#0b0f18] p-1.5 shadow-2xl">
                {own && onEdit && (
                  <button type="button" onClick={() => (onEdit(post), setMenu(false))} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10">
                    <PencilIcon size={13} /> Bearbeiten
                  </button>
                )}
                <button type="button" onClick={() => (setConfirmDelete(true), setMenu(false))} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/15">
                  <TrashIcon size={13} /> {own ? 'Löschen' : 'Als Admin löschen'}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="mt-3">
        {post.text.trim() && <PostText text={post.text} design={post.design} />}
        <PostImages images={post.images} />
        <PostPoll post={post} viewer={me} preview={preview} />
      </div>

      {confirmDelete && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          Post endgültig löschen?
          <button type="button" onClick={() => deletePost(post.id)} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white">
            Löschen
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
            Abbrechen
          </button>
        </div>
      )}

      <footer className="mt-3 flex items-center gap-1 border-t border-white/5 pt-2 text-sm">
        <button
          type="button"
          onClick={like}
          aria-pressed={liked}
          aria-label={liked ? 'Gefällt mir nicht mehr' : 'Gefällt mir'}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${liked ? 'text-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <span className={`transition-transform duration-300 ${pop ? 'scale-150' : 'scale-100'}`}>{liked ? <HeartFilledIcon size={18} /> : <HeartIcon size={18} />}</span>
          <span className="tabular-nums">{post.likes.length}</span>
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)} aria-expanded={showComments} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
          <PostIcon size={17} /> <span className="tabular-nums">{post.comments.length}</span>
        </button>
        {!preview && (
          <button
            type="button"
            onClick={async () => {
              const link = `${location.href.split('#')[0]}#/abo-bereich/social?post=${post.id}`;
              try {
                await navigator.clipboard.writeText(link);
              } catch {
                /* ignorieren */
              }
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LinkIcon size={14} /> {copied ? 'Link kopiert' : 'Teilen'}
          </button>
        )}
      </footer>
      {likedBy.length > 0 && (
        <p className="px-1 text-xs text-slate-500">
          Gefällt {likedBy.slice(0, 2).join(', ')}
          {likedBy.length > 2 ? ` und ${likedBy.length - 2} weiteren` : ''}
        </p>
      )}

      {showComments && !preview && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {post.comments.map((c) => {
            const a = profiles[c.authorId];
            return (
              <div key={c.id} className="group flex gap-2.5">
                <ProfileAvatar profile={a} size={30} />
                <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.05] px-3 py-2">
                  <p className="text-xs">
                    <a href={`#/abo-bereich/profil?u=${c.authorId}`} className="font-semibold text-white hover:underline">
                      {a?.displayName ?? 'Unbekannt'}
                    </a>{' '}
                    <span className="text-slate-500">· {timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{c.text}</p>
                </div>
                {(c.authorId === me || own || isAdmin) && (
                  <button type="button" onClick={() => deleteComment(post.id, c.id)} aria-label="Kommentar löschen" className="self-center text-slate-600 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100 focus:opacity-100">
                    <TrashIcon size={13} />
                  </button>
                )}
              </div>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addComment(post.id, me, comment);
              setComment('');
            }}
            className="flex items-center gap-2"
          >
            <input
              aria-label="Kommentar schreiben"
              value={comment}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Kommentieren …"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
            />
            <button type="submit" disabled={!comment.trim()} aria-label="Kommentar senden" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500 text-white disabled:opacity-30">
              <SendIcon size={15} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
