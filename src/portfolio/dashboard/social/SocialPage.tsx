import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useProfiles } from '../../auth/userDirectory';
import { ImageIcon, PencilIcon, SparkleIcon, XIcon } from '../../icons';
import { navigate } from '../../router';
import { ProfileAvatar, ProfileName } from '../profile/ProfileAvatar';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import { exploreFeed, followersOf, followingFeed, followingOf, suggestions, toggleFollow, trendingTags, useSocial, type SocialPost } from './socialStore';

type Tab = 'following' | 'explore';

function FollowButton({ me, target, compact = false }: { me: string; target: string; compact?: boolean }) {
  const social = useSocial();
  const following = followingOf(social, me).includes(target);
  return (
    <button
      type="button"
      onClick={() => toggleFollow(me, target)}
      aria-pressed={following}
      className={`shrink-0 rounded-full font-semibold transition-all ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} ${
        following ? 'border border-white/20 text-slate-200 hover:border-rose-400/50 hover:text-rose-200' : 'bg-white text-slate-900 hover:bg-sky-100'
      }`}
    >
      {following ? 'Folge ich' : 'Folgen'}
    </button>
  );
}

export { FollowButton };

export function SocialPage({ query }: { query: URLSearchParams }) {
  const { user, profile } = useAuth();
  const me = user?.id ?? '';
  const social = useSocial();
  const profiles = useProfiles();
  const tag = query.get('tag') ?? undefined;
  const postId = query.get('post');
  const tab: Tab = query.get('tab') === 'explore' || tag ? 'explore' : 'following';
  const [composer, setComposer] = useState<{ editing?: SocialPost } | null>(null);
  const [limit, setLimit] = useState(15);

  const feed = useMemo(() => (tab === 'following' ? followingFeed(social, me) : exploreFeed(social, me, tag)), [social, me, tab, tag]);
  const sugg = useMemo(() => suggestions(social, me), [social, me, profiles]); // eslint-disable-line react-hooks/exhaustive-deps
  const trends = useMemo(() => trendingTags(social), [social]);
  const single = postId ? social.posts.find((p) => p.id === postId) : undefined;
  const myPosts = social.posts.filter((p) => p.authorId === me).length;

  const setTab = (t: Tab) => navigate(`/abo-bereich/social${t === 'explore' ? '?tab=explore' : ''}`);

  const SuggestionList = ({ horizontal = false }: { horizontal?: boolean }) =>
    sugg.length ? (
      <ul className={horizontal ? 'flex gap-3 overflow-x-auto pb-1' : 'space-y-3'}>
        {sugg.map(({ profile: p, reason }) => (
          <li key={p.id} className={horizontal ? 'w-44 shrink-0 rounded-2xl border border-white/10 bg-slate-900/60 p-3 text-center' : 'flex items-center gap-3'}>
            <a href={`#/abo-bereich/profil?u=${p.id}`} className={horizontal ? 'block' : 'shrink-0'}>
              <span className={horizontal ? 'mx-auto block w-fit' : ''}>
                <ProfileAvatar profile={p} size={horizontal ? 56 : 40} />
              </span>
            </a>
            <div className={horizontal ? 'mt-2' : 'min-w-0 flex-1'}>
              <a href={`#/abo-bereich/profil?u=${p.id}`} className="hover:underline">
                <ProfileName profile={p} className="text-sm font-semibold text-white" />
              </a>
              <p className="truncate text-[11px] text-slate-500" title={reason}>
                {reason}
              </p>
              {horizontal && (
                <div className="mt-2">
                  <FollowButton me={me} target={p.id} compact />
                </div>
              )}
            </div>
            {!horizontal && <FollowButton me={me} target={p.id} compact />}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-slate-500">Du folgst schon allen – stark!</p>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        {/* Post erstellen */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={profile} size={44} />
            <button type="button" onClick={() => setComposer({})} className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-400 transition-colors hover:border-sky-400/40 hover:text-slate-200">
              Was gibt's Neues, {profile?.displayName ?? 'du'}?
            </button>
          </div>
          <div className="mt-3 flex gap-1 border-t border-white/5 pt-2 text-xs">
            <button type="button" onClick={() => setComposer({})} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/5">
              <ImageIcon size={15} className="text-emerald-300" /> Bild
            </button>
            <button type="button" onClick={() => setComposer({})} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/5">
              <SparkleIcon size={15} className="text-fuchsia-300" /> Gestalteter Post
            </button>
            <button type="button" onClick={() => setComposer({})} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/5">
              <PencilIcon size={14} className="text-amber-300" /> Umfrage
            </button>
          </div>
        </section>

        {single ? (
          <>
            <button type="button" onClick={() => navigate('/abo-bereich/social')} className="text-sm text-sky-300 hover:underline">
              ← Zum Feed
            </button>
            <PostCard post={single} onEdit={(p) => setComposer({ editing: p })} />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="Feed" className="inline-flex rounded-2xl border border-white/10 bg-slate-900/60 p-1">
                {(
                  [
                    ['following', 'Folge ich'],
                    ['explore', 'Entdecken'],
                  ] as const
                ).map(([t, label]) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t && !tag} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-sm transition-all ${tab === t && !tag ? 'bg-gradient-to-r from-sky-500 to-violet-600 font-semibold text-white' : 'text-slate-400 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {tag && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1.5 text-sm font-semibold text-sky-100">
                  #{tag}
                  <button type="button" onClick={() => setTab('explore')} aria-label="Hashtag-Filter entfernen" className="text-sky-200 hover:text-white">
                    <XIcon size={13} />
                  </button>
                </span>
              )}
            </div>

            <div className="lg:hidden">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vorschläge für dich</p>
              <SuggestionList horizontal />
            </div>

            {feed.length ? (
              <div className="space-y-4">
                {feed.slice(0, limit).map((p) => (
                  <PostCard key={p.id} post={p} onEdit={(x) => setComposer({ editing: x })} />
                ))}
                {feed.length > limit && (
                  <button type="button" onClick={() => setLimit((l) => l + 15)} className="w-full rounded-2xl border border-white/10 py-3 text-sm text-slate-300 hover:bg-white/5">
                    Mehr laden
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center">
                <p className="font-oswald text-xl text-white">{tab === 'following' ? 'Dein Feed ist noch leer' : 'Keine Posts gefunden'}</p>
                <p className="mt-1 text-sm text-slate-400">{tab === 'following' ? 'Folge Mitgliedern oder schreib deinen ersten Post.' : 'Versuche einen anderen Hashtag.'}</p>
                <button type="button" onClick={() => setTab('explore')} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15">
                  Entdecken
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="hidden space-y-4 lg:block">
        <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={profile} size={48} />
            <div className="min-w-0">
              <ProfileName profile={profile} className="font-semibold text-white" />
              <p className="text-xs text-slate-500">@{profile?.username}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['Posts', myPosts],
              ['Follower', followersOf(social, me).length],
              ['Folge ich', followingOf(social, me).length],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.04] py-2">
                <dd className="text-lg font-semibold text-white">{v}</dd>
                <dt className="text-[11px] text-slate-500">{k}</dt>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5">
          <h3 className="mb-4 font-oswald text-lg tracking-wide text-white">Vorschläge für dich</h3>
          <SuggestionList />
        </section>
        <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5">
          <h3 className="mb-3 font-oswald text-lg tracking-wide text-white">Trends</h3>
          <ul className="space-y-1">
            {trends.map((t, i) => (
              <li key={t.tag}>
                <a href={`#/abo-bereich/social?tag=${encodeURIComponent(t.tag)}`} className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-white/5 ${tag === t.tag ? 'bg-sky-500/15' : ''}`}>
                  <span>
                    <span className="block text-[11px] text-slate-500">{i + 1} · Trend</span>
                    <span className="text-sm font-semibold text-white">#{t.tag}</span>
                  </span>
                  <span className="text-xs text-slate-500">{t.posts} Posts</span>
                </a>
              </li>
            ))}
            {!trends.length && <li className="text-sm text-slate-500">Noch keine Trends.</li>}
          </ul>
        </section>
        <p className="px-2 text-[11px] leading-relaxed text-slate-600">Sei freundlich – es gelten die <a href="#/rechtliches?seite=nutzungsbedingungen" className="underline hover:text-slate-400">Community-Regeln</a>.</p>
      </aside>

      {composer && <PostComposer editing={composer.editing} onClose={() => setComposer(null)} />}
    </div>
  );
}
