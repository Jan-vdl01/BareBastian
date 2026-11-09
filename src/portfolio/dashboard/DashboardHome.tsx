import { useAuth } from '../auth/AuthContext';
import { getPlan } from '../config/plans';
import { ArrowRight, CrownIcon, ImageIcon, LibraryIcon, PlayIcon, PostIcon, WandIcon } from '../icons';
import { formatDate, PHOTOS, placeholderGradient, POSTS, VIDEOS } from './libraryData';
import { readProgress } from './progress';

export function DashboardHome() {
  const { user } = useAuth();
  if (!user?.subscription) return null;
  const sub = user.subscription;
  const progress = readProgress();
  const continueWatching = VIDEOS.filter((v) => (progress[v.id]?.ratio ?? 0) > 0.02 && (progress[v.id]?.ratio ?? 0) < 0.97).slice(0, 3);
  const latest = VIDEOS.slice(0, 4);

  const stats = [
    { label: 'Videos', value: VIDEOS.length, icon: PlayIcon, href: '#/dashboard/bibliothek?tab=videos', accent: 'from-cyan-400 to-blue-500' },
    { label: 'Fotos', value: PHOTOS.length, icon: ImageIcon, href: '#/dashboard/bibliothek?tab=fotos', accent: 'from-blue-500 to-indigo-500' },
    { label: 'Posts', value: POSTS.length, icon: PostIcon, href: '#/dashboard/bibliothek?tab=posts', accent: 'from-indigo-500 to-violet-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Willkommen */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 shadow-2xl shadow-blue-900/30 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              <CrownIcon size={14} /> {getPlan(sub.plan).name}-Abo {sub.status === 'canceled' ? '· gekündigt' : 'aktiv'}
            </p>
            <h2 className="mt-4 font-oswald text-3xl tracking-wide text-white sm:text-4xl">Willkommen zurück, {user.displayName}!</h2>
            <p className="mt-2 text-blue-100">
              {sub.status === 'canceled' ? `Dein Zugang endet am ${formatDate(sub.renewsAt)}.` : `Nächste Verlängerung am ${formatDate(sub.renewsAt)}.`}
            </p>
          </div>
          <a
            href="#/dashboard/bibliothek"
            className="group inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 sm:self-auto"
          >
            Zur Bibliothek <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </section>

      {/* Statistiken */}
      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <a
              key={s.label}
              href={s.href}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${s.accent} text-white`}>
                <Icon size={20} />
              </span>
              <div className="flex-1">
                <p className="text-2xl font-semibold text-white">{s.value}</p>
                <p className="text-sm text-slate-400">{s.label}</p>
              </div>
              <ArrowRight size={18} className="text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-cyan-300" />
            </a>
          );
        })}
      </section>

      {continueWatching.length > 0 && (
        <section>
          <h3 className="mb-4 font-oswald text-xl tracking-wide text-white">Weiter ansehen</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {continueWatching.map((v) => (
              <a key={v.id} href={`#/dashboard/bibliothek?tab=videos&play=${v.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                <div className="relative aspect-video" style={{ background: placeholderGradient(v.hue) }}>
                  <span className="absolute inset-0 grid place-items-center opacity-80 transition-opacity group-hover:opacity-100">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white backdrop-blur"><PlayIcon size={20} /></span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                    <span className="block h-full bg-cyan-400" style={{ width: `${(progress[v.id]?.ratio ?? 0) * 100}%` }} />
                  </span>
                </div>
                <p className="truncate px-4 py-3 text-sm font-medium text-white">{v.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Neueste Videos */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-oswald text-xl tracking-wide text-white">Neu in der Bibliothek</h3>
            <a href="#/dashboard/bibliothek" className="text-sm text-cyan-300 hover:underline">Alle ansehen</a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {latest.map((v) => (
              <a key={v.id} href={`#/dashboard/bibliothek?tab=videos&play=${v.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30">
                <div className="relative aspect-video" style={{ background: placeholderGradient(v.hue) }}>
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{v.duration}</span>
                  <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white backdrop-blur"><PlayIcon size={20} /></span>
                  </span>
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-medium text-white">{v.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{v.category} · {formatDate(v.date)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Module & Posts */}
        <section className="space-y-4">
          <h3 className="font-oswald text-xl tracking-wide text-white">Werkzeuge</h3>
          <a href="#/dashboard/bio-generator" className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/40">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"><WandIcon size={20} /></span>
            <div className="flex-1">
              <p className="font-medium text-white">Chaturbate-Bio-Generator</p>
              <p className="text-sm text-slate-400">Bio, Tip-Menü & Wunschliste mit Regelcheck</p>
            </div>
            <ArrowRight size={18} className="text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-violet-300" />
          </a>
          <a href="#/dashboard/bibliothek?tab=fotos" className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white"><LibraryIcon size={20} /></span>
            <div className="flex-1">
              <p className="font-medium text-white">Fotoalben</p>
              <p className="text-sm text-slate-400">{new Set(PHOTOS.map((p) => p.album)).size} Alben · {PHOTOS.length} Fotos</p>
            </div>
            <ArrowRight size={18} className="text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-cyan-300" />
          </a>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Neuester Post · {formatDate(POSTS[0].date)}</p>
            <p className="mt-2 line-clamp-3 text-sm text-slate-300">{POSTS[0].text}</p>
            <a href="#/dashboard/bibliothek?tab=posts" className="mt-3 inline-block text-sm text-cyan-300 hover:underline">Alle Posts</a>
          </div>
        </section>
      </div>
    </div>
  );
}
