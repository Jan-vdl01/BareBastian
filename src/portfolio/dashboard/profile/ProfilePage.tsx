import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useProfiles, type Profile } from '../../auth/userDirectory';
import { CREATOR_ID } from '../../config/admin';
import { CalendarIcon, ChatIcon, CheckIcon, InstagramIcon, LinkIcon, MapPinIcon, PencilIcon, SettingsIcon, TelegramIcon, XBrandIcon } from '../../icons';
import { coverGradient, ProfileAvatar, ProfileName } from './ProfileAvatar';
import { ProfileEditor } from './ProfileEditor';

const joined = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

const SOCIAL_LINKS = {
  instagram: { icon: InstagramIcon, url: (h: string) => `https://instagram.com/${h}`, label: 'Instagram' },
  x: { icon: XBrandIcon, url: (h: string) => `https://x.com/${h}`, label: 'X' },
  telegram: { icon: TelegramIcon, url: (h: string) => `https://t.me/${h}`, label: 'Telegram' },
} as const;

/** Schritte für ein vollständiges Profil (nur auf dem eigenen Profil sichtbar). */
function completeness(p: Profile) {
  const steps = [
    { done: !!p.avatar, label: 'Profilbild hochladen' },
    { done: !!p.cover, label: 'Titelbild hinzufügen' },
    { done: p.bio.trim().length >= 20, label: 'Biografie schreiben' },
    { done: !!p.location, label: 'Wohnort angeben' },
    { done: p.interests.length >= 3, label: 'Mindestens 3 Interessen' },
    { done: Object.values(p.socials).some(Boolean), label: 'Social-Media verknüpfen' },
  ];
  return { steps, percent: Math.round((steps.filter((s) => s.done).length / steps.length) * 100) };
}

export function ProfilePage({ query }: { query: URLSearchParams }) {
  const { user } = useAuth();
  const profiles = useProfiles();
  const [editing, setEditing] = useState(false);
  const targetId = query.get('u') ?? user?.id ?? '';
  const profile = profiles[targetId];
  const isOwn = targetId === user?.id;
  const others = useMemo(
    () =>
      Object.values(profiles)
        .filter((p) => p.id !== targetId && p.id !== user?.id)
        .sort((a, b) => (a.id === CREATOR_ID ? -1 : b.id === CREATOR_ID ? 1 : a.displayName.localeCompare(b.displayName)))
        .slice(0, 6),
    [profiles, targetId, user?.id],
  );

  if (!profile) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-10 text-center">
        <p className="font-oswald text-2xl text-white">Profil nicht gefunden</p>
        <a href="#/abo-bereich/profil" className="mt-4 inline-block text-sm text-cyan-300 hover:underline">
          Zu deinem Profil
        </a>
      </div>
    );
  }

  const progress = completeness(profile);
  const socials = (Object.keys(SOCIAL_LINKS) as (keyof typeof SOCIAL_LINKS)[]).filter((k) => profile.socials[k]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl">
          <div className="relative h-40 sm:h-56" style={profile.cover ? undefined : { background: coverGradient(profile.id) }}>
            {profile.cover && <img src={profile.cover} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>

          <div className="relative px-5 pb-6 sm:px-8">
            <div className="-mt-14 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
              <ProfileAvatar profile={profile} size={112} ring />
              <div className="flex gap-2 pb-1">
                {isOwn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-cyan-50"
                    >
                      <PencilIcon size={15} /> Profil bearbeiten
                    </button>
                    <a href="#/abo-bereich/konto" aria-label="Konto & Abo" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                      <SettingsIcon size={16} />
                    </a>
                  </>
                ) : (
                  <a
                    href={`#/abo-bereich/chat?c=${profile.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5"
                  >
                    <ChatIcon size={16} /> Nachricht senden
                  </a>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h2 className="font-oswald text-3xl tracking-wide text-white">
                <ProfileName profile={profile} />
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                @{profile.username}
                {profile.pronouns && <span> · {profile.pronouns}</span>}
                {profile.id === CREATOR_ID && <span className="ml-2 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">Creator</span>}
                {profile.isDemo && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">Demo-Profil</span>}
              </p>
            </div>

            {profile.bio ? (
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-200">{profile.bio}</p>
            ) : (
              isOwn && (
                <button type="button" onClick={() => setEditing(true)} className="mt-4 text-sm text-slate-500 hover:text-cyan-300">
                  + Erzähl etwas über dich
                </button>
              )
            )}

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
              {profile.location && (
                <li className="inline-flex items-center gap-1.5">
                  <MapPinIcon size={15} /> {profile.location}
                </li>
              )}
              {profile.website && /^https:\/\//.test(profile.website) && (
                <li className="inline-flex items-center gap-1.5">
                  <LinkIcon size={15} />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-cyan-300 hover:underline">
                    {profile.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                </li>
              )}
              <li className="inline-flex items-center gap-1.5">
                <CalendarIcon size={15} /> Dabei seit {joined(profile.joinedAt)}
              </li>
            </ul>

            {profile.interests.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.interests.map((t) => (
                  <span key={t} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {socials.length > 0 && (
              <div className="mt-5 flex gap-2">
                {socials.map((k) => {
                  const s = SOCIAL_LINKS[k];
                  const Icon = s.icon;
                  return (
                    <a
                      key={k}
                      href={s.url(profile.socials[k]!)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label={`${s.label}: ${profile.socials[k]}`}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:-translate-y-0.5 hover:scale-110 hover:text-white"
                    >
                      <Icon size={18} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        {isOwn && progress.percent < 100 && (
          <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-oswald text-lg tracking-wide text-white">Profil vervollständigen</h3>
              <span className="text-sm font-semibold text-cyan-300">{progress.percent} %</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-700" style={{ width: `${progress.percent}%` }} />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {progress.steps.map((s) => (
                <li key={s.label} className={`flex items-center gap-2.5 ${s.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-full ${s.done ? 'bg-emerald-400/15 text-emerald-300' : 'border border-white/15'}`}>{s.done && <CheckIcon size={12} />}</span>
                  {s.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
          <h3 className="font-oswald text-lg tracking-wide text-white">Mitglieder</h3>
          <ul className="mt-4 space-y-3">
            {others.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <a href={`#/abo-bereich/profil?u=${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white/5">
                  <ProfileAvatar profile={p} size={40} />
                  <span className="min-w-0">
                    <ProfileName profile={p} className="text-sm font-medium text-white" />
                    <span className="block truncate text-xs text-slate-500">@{p.username}</span>
                  </span>
                </a>
                <a href={`#/abo-bereich/chat?c=${p.id}`} aria-label={`${p.displayName} schreiben`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200">
                  <ChatIcon size={16} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      {editing && isOwn && <ProfileEditor profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
