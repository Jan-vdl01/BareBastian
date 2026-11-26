import type { Profile } from '../../auth/userDirectory';
import { CREATOR_ID } from '../../config/admin';
import { VerifiedIcon } from '../../icons';

const hueFor = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export const coverGradient = (id: string) => {
  const h = hueFor(id);
  return `linear-gradient(135deg, hsl(${h} 70% 35%), hsl(${(h + 60) % 360} 70% 25%) 60%, hsl(${(h + 120) % 360} 60% 18%))`;
};

/** Profilbild mit Initialen-Fallback. */
export function ProfileAvatar({ profile, size = 40, ring = false }: { profile: Profile | undefined; size?: number; ring?: boolean }) {
  const name = profile?.displayName ?? '?';
  const h = hueFor(profile?.id ?? name);
  const ringCls = ring ? 'ring-4 ring-[#06080d]' : '';
  if (profile?.avatar) {
    return <img src={profile.avatar} alt="" width={size} height={size} className={`shrink-0 rounded-full object-cover ${ringCls}`} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${ringCls}`}
      style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, hsl(${h} 80% 55%), hsl(${(h + 50) % 360} 75% 45%))` }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Name mit Verifiziert-Haken für den Creator. */
export function ProfileName({ profile, className = '' }: { profile: Profile | undefined; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="truncate">{profile?.displayName ?? 'Unbekannt'}</span>
      {profile?.id === CREATOR_ID && <VerifiedIcon size={16} className="shrink-0 text-cyan-300" aria-label="Verifizierter Creator" />}
    </span>
  );
}
