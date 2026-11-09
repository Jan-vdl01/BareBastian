import { useEffect, useId, useState, type FormEvent } from 'react';
import { PROFILE } from '../data';
import { ArrowLeft, EyeIcon, EyeOffIcon, GitHubIcon, GoogleIcon, LockIcon, MailIcon } from '../icons';

/** Platzhalter-Video: Datei unter public/videos/login-bg.mp4 (relativer Pfad) ablegen, um sie zu ersetzen. */
const VIDEO_SRC = 'videos/login-bg.mp4';

type Status = 'idle' | 'loading' | 'info';

/** Video-Spalte mit animiertem Gradient-Fallback, falls (noch) kein Video vorhanden ist. */
function VideoPanel({ className = '' }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`overflow-hidden bg-[#070b14] ${className}`}>
      <div className="animate-aurora absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,.4),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,.3),transparent_50%)] bg-[length:200%_200%]" />
      {!failed && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          onError={() => setFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
    </div>
  );
}

/** Vollbild-Anmeldeseite: links Video, rechts abgedunkeltes Formular (mobil: Video als Hintergrund). */
export function LoginPage() {
  const uid = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Anmelden · ${PROFILE.name}`;
    return () => {
      document.title = 'Barebastian | Official Link Hub & Creator Portfolio';
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    if (password.length < 6) return setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
    setError(null);
    setStatus('loading');
    // Platzhalter – hier die echte Authentifizierung anbinden.
    setTimeout(() => setStatus('info'), 1200);
  };

  const social = (provider: string) => {
    setError(null);
    setStatus('info');
    console.info(`[Login] OAuth-Provider "${provider}" ist noch nicht angebunden.`);
  };

  const input =
    'w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-[border-color,box-shadow,background-color] duration-300 focus:border-cyan-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-4 focus:ring-cyan-400/10';

  return (
    <main className="animate-fade-in relative grid min-h-dvh lg:grid-cols-2">
      {/* Links: Video (Desktop) / Hintergrund (Mobil) */}
      <div className="absolute inset-0 lg:relative">
        <VideoPanel className="absolute inset-0" />
        <div className="relative hidden h-full flex-col justify-between p-12 lg:flex">
          <a href="#/" className="inline-flex w-fit items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-oswald text-lg font-bold text-white">B</span>
            <span className="font-oswald text-lg tracking-[0.18em] text-white">{PROFILE.name}</span>
          </a>
          <blockquote className="max-w-md">
            <p className="font-oswald text-4xl leading-tight tracking-wide text-white">Exklusive Inhalte. Direkter Kontakt. Ein Login.</p>
            <footer className="mt-4 text-sm text-slate-300">{PROFILE.handle}</footer>
          </blockquote>
        </div>
      </div>

      {/* Rechts: Formular */}
      <section className="relative flex min-h-dvh items-center justify-center bg-black/70 px-5 py-12 backdrop-blur-md sm:px-10 lg:bg-[#06080d]/95 lg:backdrop-blur-none">
        <div className="w-full max-w-md">
          <a href="#/" className="group mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" />
            Zurück zur Übersicht
          </a>

          <h1 className="font-oswald text-4xl tracking-wide text-white">Willkommen zurück</h1>
          <p className="mt-2 text-slate-400">Melde dich an, um auf deinen Bereich zuzugreifen.</p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => social('Google')}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
            >
              <GoogleIcon size={18} /> Google
            </button>
            <button
              type="button"
              onClick={() => social('GitHub')}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#161b22] px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-lg hover:shadow-black/40 active:scale-[0.98]"
            >
              <GitHubIcon size={18} /> GitHub
            </button>
          </div>

          <div className="my-7 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span className="h-px flex-1 bg-white/10" /> oder <span className="h-px flex-1 bg-white/10" />
          </div>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={`${uid}-email`} className="mb-1.5 block text-xs font-medium text-slate-300">
                E-Mail
              </label>
              <div className="relative">
                <MailIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id={`${uid}-email`}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@beispiel.de"
                  className={input}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor={`${uid}-pw`} className="block text-xs font-medium text-slate-300">
                  Passwort
                </label>
                <button type="button" onClick={() => setStatus('info')} className="text-xs text-cyan-300 underline-offset-4 hover:underline">
                  Passwort vergessen?
                </button>
              </div>
              <div className="relative">
                <LockIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id={`${uid}-pw`}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${input} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span className="relative h-[18px] w-[18px]">
                    <EyeIcon size={18} className={`absolute inset-0 transition-all duration-300 ${showPassword ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`} />
                    <EyeOffIcon size={18} className={`absolute inset-0 transition-all duration-300 ${showPassword ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
                  </span>
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-400"
              />
              Angemeldet bleiben
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}
            {status === 'info' && (
              <p role="status" className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                Demo-Ansicht: Die Anmeldung ist noch nicht mit einem Backend verbunden.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {status === 'loading' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {status === 'loading' ? 'Wird angemeldet …' : 'Anmelden'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Noch kein Zugang?{' '}
            <a href="#links" className="font-medium text-cyan-300 underline-offset-4 hover:underline">
              Zu den VIP-Plattformen
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
