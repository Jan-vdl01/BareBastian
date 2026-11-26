import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { authApi, rememberCode } from '../auth/authService';
import { PROFILE } from '../data';
import { ArrowLeft, CheckIcon, EyeIcon, EyeOffIcon, GemIcon, LockIcon, MailIcon, UserIcon } from '../icons';
import { errorText } from '../lib/api';
import { navigate } from '../router';

/** Hintergrundvideo: Datei unter public/videos/login-bg.mp4 ablegen. */
const VIDEO_SRC = 'videos/login-bg.mp4';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

type Mode = 'login' | 'register' | 'forgot';

/** Video-Spalte mit animiertem Gradient-Fallback, falls (noch) kein Video vorhanden ist. */
function VideoPanel({ className = '' }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`overflow-hidden bg-[#070b14] ${className}`}>
      <div className="animate-aurora absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,.4),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,.3),transparent_50%)] bg-[length:200%_200%]" />
      {!failed && <video className="absolute inset-0 h-full w-full object-cover" src={VIDEO_SRC} autoPlay muted loop playsInline aria-hidden="true" onError={() => setFailed(true)} />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
    </div>
  );
}

/** Gemeinsamer Rahmen: links Video, rechts Formular (mobil: Video als Hintergrund). */
function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${title} · ${PROFILE.name}`;
    return () => {
      document.title = 'Barebastian | Official Link Hub & Creator Portfolio';
    };
  }, [title]);

  return (
    <main className="animate-fade-in relative grid min-h-dvh lg:grid-cols-2">
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
      <section className="relative flex min-h-dvh items-center justify-center bg-black/70 px-5 py-12 backdrop-blur-md sm:px-10 lg:bg-[#06080d]/95 lg:backdrop-blur-none">
        <div className="w-full max-w-md">
          <a href="#/" className="group mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" />
            Zurück zur Übersicht
          </a>
          {children}
        </div>
      </section>
    </main>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-[border-color,box-shadow,background-color] duration-300 focus:border-cyan-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-4 focus:ring-cyan-400/10';

function TextField({ id, label, icon, ...props }: { id: string; label: string; icon: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
        <input id={id} className={inputCls} {...props} />
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, extra }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; extra?: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-medium text-slate-300">
          {label}
        </label>
        {extra}
      </div>
      <div className="relative">
        <LockIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••" className={`${inputCls} pr-12`} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
          aria-pressed={show}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="relative h-[18px] w-[18px]">
            <EyeIcon size={18} className={`absolute inset-0 transition-all duration-300 ${show ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`} />
            <EyeOffIcon size={18} className={`absolute inset-0 transition-all duration-300 ${show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
          </span>
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
    >
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
      {busy ? busyLabel : label}
    </button>
  );
}

const Alert = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
    {children}
  </p>
);
const Info = ({ children }: { children: ReactNode }) => (
  <p role="status" className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
    {children}
  </p>
);

/** Anmelden, Registrieren und Passwort vergessen. */
export function LoginPage({ query }: { query?: URLSearchParams }) {
  const uid = useId();
  const { login, register, requestSubscription } = useAuth();
  const [mode, setMode] = useState<Mode>(query?.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState(query?.get('code') ?? '');
  const [remember, setRemember] = useState(true);
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(email.trim())) return setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    if (mode === 'forgot') {
      setBusy(true);
      try {
        await authApi.forgot(email.trim());
        setInfo('Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt. Schau auch im Spam-Ordner nach.');
      } catch (err) {
        setError(errorText(err));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (mode === 'register') {
      if (displayName.trim().length < 2) return setError('Bitte gib einen Anzeigenamen mit mindestens 2 Zeichen an.');
      if (password.length < PASSWORD_MIN) return setError(`Das Passwort muss mindestens ${PASSWORD_MIN} Zeichen lang sein.`);
      if (!adult) return setError('Die Nutzung ist erst ab 18 Jahren erlaubt.');
      if (!terms) return setError('Bitte akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.');
    } else if (!password) return setError('Bitte gib dein Passwort ein.');

    setBusy(true);
    try {
      // Code vorab prüfen, damit Tippfehler sofort auffallen
      const info = mode === 'register' && code.trim() ? await authApi.checkCode(code.trim()) : null;
      if (info) rememberCode(info.code);
      if (mode === 'register') {
        await register({ email: email.trim(), password, displayName: displayName.trim(), ageConfirmed: adult, termsAccepted: terms });
        // Zugangscode (100 %): sofort freischalten. Rabattcodes werden bei der Abo-Auswahl angewendet.
        if (info?.free) {
          await requestSubscription('monthly', info.code).catch(() => undefined);
          rememberCode('');
        }
      }
      else await login(email.trim(), password, remember);
      // PortfolioApp leitet nach erfolgreicher Anmeldung automatisch weiter
    } catch (err) {
      setError(errorText(err, 'Anmeldung fehlgeschlagen.'));
      setBusy(false);
    }
  };

  const titles: Record<Mode, [string, string]> = {
    login: ['Willkommen zurück', 'Melde dich an, um deinen Abo-Bereich zu öffnen.'],
    register: ['Konto erstellen', 'Kostenlos registrieren – danach wählst du dein Abo.'],
    forgot: ['Passwort vergessen?', 'Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst.'],
  };

  return (
    <AuthShell title={mode === 'register' ? 'Registrieren' : mode === 'forgot' ? 'Passwort vergessen' : 'Anmelden'}>
      <h1 className="font-oswald text-4xl tracking-wide text-white">{titles[mode][0]}</h1>
      <p className="mt-2 text-slate-400">{titles[mode][1]}</p>

      {mode !== 'forgot' && (
        <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm" role="tablist">
          {(['login', 'register'] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={`rounded-lg py-2.5 font-medium transition-colors ${mode === m ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
              {m === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          ))}
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'register' && <TextField id={`${uid}-name`} label="Anzeigename" icon={<UserIcon size={17} />} autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="So sehen dich andere" maxLength={40} />}
        <TextField id={`${uid}-email`} label="E-Mail" icon={<MailIcon size={17} />} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@beispiel.de" />

        {mode !== 'forgot' && (
          <PasswordField
            id={`${uid}-pw`}
            label={mode === 'register' ? `Passwort (mind. ${PASSWORD_MIN} Zeichen)` : 'Passwort'}
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            extra={
              mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-cyan-300 underline-offset-4 hover:underline">
                  Passwort vergessen?
                </button>
              )
            }
          />
        )}

        {mode === 'register' && (
          <TextField id={`${uid}-code`} label="Rabatt- oder Zugangscode (optional)" icon={<GemIcon size={17} />} autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="z. B. WILLKOMMEN" maxLength={30} />
        )}

        {mode === 'login' && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-400">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-400" />
            Angemeldet bleiben
          </label>
        )}

        {mode === 'register' && (
          <div className="space-y-2.5 text-sm text-slate-400">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400" />
              Ich bin mindestens 18 Jahre alt.
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400" />
              <span>
                Ich akzeptiere die{' '}
                <a href="#/rechtliches?seite=nutzungsbedingungen" target="_blank" className="text-cyan-300 hover:underline">
                  Nutzungsbedingungen
                </a>{' '}
                und habe die{' '}
                <a href="#/rechtliches?seite=datenschutz" target="_blank" className="text-cyan-300 hover:underline">
                  Datenschutzerklärung
                </a>{' '}
                gelesen.
              </span>
            </label>
          </div>
        )}

        {error && <Alert>{error}</Alert>}
        {info && <Info>{info}</Info>}

        <SubmitButton
          busy={busy}
          label={mode === 'register' ? 'Konto erstellen' : mode === 'forgot' ? 'Link anfordern' : 'Anmelden'}
          busyLabel={mode === 'register' ? 'Konto wird erstellt …' : mode === 'forgot' ? 'Wird gesendet …' : 'Wird angemeldet …'}
        />
      </form>

      {mode === 'forgot' ? (
        <button type="button" onClick={() => switchMode('login')} className="mt-6 text-sm text-cyan-300 underline-offset-4 hover:underline">
          ← Zurück zur Anmeldung
        </button>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-500">
          Infos zu den Paketen?{' '}
          <a href="#/preise" className="font-medium text-cyan-300 underline-offset-4 hover:underline">
            Preise ansehen
          </a>
        </p>
      )}
    </AuthShell>
  );
}

/** Neues Passwort über den Link aus der E-Mail festlegen. */
export function ResetPasswordPage({ query }: { query: URLSearchParams }) {
  const uid = useId();
  const { setUser } = useAuth();
  const token = query.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < PASSWORD_MIN) return setError(`Das Passwort muss mindestens ${PASSWORD_MIN} Zeichen lang sein.`);
    if (password !== repeat) return setError('Die Passwörter stimmen nicht überein.');
    setBusy(true);
    setError(null);
    try {
      const user = await authApi.reset(token, password);
      await setUser(user);
      navigate('/abo-bereich', { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Neues Passwort">
      <h1 className="font-oswald text-4xl tracking-wide text-white">Neues Passwort</h1>
      <p className="mt-2 text-slate-400">Lege ein neues Passwort für dein Konto fest.</p>
      {!token ? (
        <div className="mt-8">
          <Alert>Der Link ist unvollständig. Bitte fordere einen neuen an.</Alert>
          <a href="#/login" className="mt-6 inline-block text-sm text-cyan-300 hover:underline">← Zur Anmeldung</a>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="mt-8 space-y-4">
          <PasswordField id={`${uid}-pw`} label={`Neues Passwort (mind. ${PASSWORD_MIN} Zeichen)`} value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordField id={`${uid}-pw2`} label="Passwort wiederholen" value={repeat} onChange={setRepeat} autoComplete="new-password" />
          {error && <Alert>{error}</Alert>}
          <SubmitButton busy={busy} label="Passwort speichern" busyLabel="Wird gespeichert …" />
        </form>
      )}
    </AuthShell>
  );
}

/** Bestätigungslink aus der Willkommens-E-Mail. */
export function VerifyEmailPage({ query }: { query: URLSearchParams }) {
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<'busy' | 'ok' | 'error'>('busy');
  const [error, setError] = useState('');

  useEffect(() => {
    authApi
      .verify(query.get('token') ?? '')
      .then(() => {
        setState('ok');
        if (user) refreshUser();
      })
      .catch((err) => {
        setError(errorText(err));
        setState('error');
      });
    // nur einmal ausführen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthShell title="E-Mail bestätigen">
      <h1 className="font-oswald text-4xl tracking-wide text-white">E-Mail bestätigen</h1>
      <div className="mt-8">
        {state === 'busy' && <Info>Wird geprüft …</Info>}
        {state === 'ok' && (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
            <CheckIcon size={16} /> Danke! Deine E-Mail-Adresse ist bestätigt.
          </p>
        )}
        {state === 'error' && <Alert>{error}</Alert>}
        <a href={user ? '#/abo-bereich' : '#/login'} className="mt-6 inline-block text-sm text-cyan-300 hover:underline">
          {user ? 'Weiter zum Abo-Bereich →' : 'Zur Anmeldung →'}
        </a>
      </div>
    </AuthShell>
  );
}
