import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { PROFILE } from '../data';
import { CheckIcon, MailIcon, SendIcon, XIcon } from '../icons';
import type { ContactFormState, ContactTopic } from '../types';
import { api, errorText } from '../lib/api';

interface InfoDrawerProps {
  open: boolean;
  onClose: () => void;
}

type Errors = Partial<Record<keyof ContactFormState, string>>;

const TOPICS: { value: ContactTopic; label: string }[] = [
  { value: 'allgemein', label: 'Allgemeine Anfrage' },
  { value: 'kooperation', label: 'Kooperation' },
  { value: 'presse', label: 'Presse' },
  { value: 'support', label: 'Support' },
];

const EMPTY: ContactFormState = { name: '', email: '', topic: 'allgemein', message: '' };

function validate(f: ContactFormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = 'Bitte gib deinen Namen an.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Bitte gib eine gültige E-Mail-Adresse an.';
  if (f.message.trim().length < 10) e.message = 'Die Nachricht sollte mindestens 10 Zeichen haben.';
  return e;
}

/**
 * Gleitender Info-Drawer: auf Mobilgeräten von unten, ab `md` von rechts.
 * Enthält ein validiertes Kontaktformular (Versand über den Server).
 */
export function InfoDrawer({ open, onClose }: InfoDrawerProps) {
  const [form, setForm] = useState<ContactFormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => firstFieldRef.current?.focus(), 350);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open, onClose]);

  const update = <K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0 || sending) return;
    const topic = TOPICS.find((t) => t.value === form.topic)?.label ?? 'Anfrage';
    setSending(true);
    setSendError(null);
    try {
      await api.post('/contact', { ...form, topic, website: honeypot });
      setSent(true);
    } catch (err) {
      setSendError(`${errorText(err)} Alternativ erreichst du uns per E-Mail an ${PROFILE.email}.`);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setForm(EMPTY);
    setErrors({});
    setSent(false);
  };

  const field =
    'w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-[border-color,box-shadow,background-color] duration-300 focus:bg-white/[0.07] focus:outline-none focus:ring-4';
  const ok = 'border-white/10 focus:border-cyan-400/60 focus:ring-cyan-400/10';
  const bad = 'border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/10';

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        inert={!open}
        className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl border-t border-white/10 bg-[#0b0f18]/95 shadow-2xl backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0 ${
          open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full md:translate-y-0'
        }`}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/15 md:hidden" />

        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5 md:pt-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Info & Kontakt</p>
            <h2 id={`${uid}-title`} className="mt-1 font-oswald text-2xl tracking-wide text-white">
              Schreib mir eine Nachricht
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Drawer schließen"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-slate-300 transition-all duration-300 hover:rotate-90 hover:bg-white/15 hover:text-white"
          >
            <XIcon size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
              <MailIcon size={18} />
            </span>
            <div className="min-w-0 text-sm">
              <p className="text-slate-400">Direkt per E-Mail</p>
              <a href={`mailto:${PROFILE.email}`} className="block truncate font-medium text-white hover:text-cyan-200">
                {PROFILE.email}
              </a>
            </div>
          </div>

          <div className="relative">
            {/* Erfolgsmeldung */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-500 ${
                sent ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
              }`}
              aria-live="polite"
            >
              {sent && (
                <>
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <CheckIcon size={26} />
                  </span>
                  <p className="mt-4 font-oswald text-xl text-white">Nachricht gesendet!</p>
                  <p className="mt-2 max-w-xs text-sm text-slate-400">Danke dir – ich melde mich so schnell wie möglich per E-Mail.</p>
                  <button type="button" onClick={reset} className="mt-6 text-sm text-cyan-300 underline-offset-4 hover:underline">
                    Neue Nachricht schreiben
                  </button>
                </>
              )}
            </div>

            <form
              noValidate
              onSubmit={handleSubmit}
              className={`space-y-4 transition-all duration-500 ${sent ? 'pointer-events-none -translate-y-4 opacity-0' : 'opacity-100'}`}
            >
              <div>
                <label htmlFor={`${uid}-name`} className="mb-1.5 block text-xs font-medium text-slate-300">
                  Name
                </label>
                <input
                  ref={firstFieldRef}
                  id={`${uid}-name`}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  autoComplete="name"
                  placeholder="Dein Name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? `${uid}-name-err` : undefined}
                  className={`${field} ${errors.name ? bad : ok}`}
                />
                {errors.name && <p id={`${uid}-name-err`} className="mt-1.5 text-xs text-rose-300">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor={`${uid}-email`} className="mb-1.5 block text-xs font-medium text-slate-300">
                  E-Mail
                </label>
                <input
                  id={`${uid}-email`}
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  autoComplete="email"
                  placeholder="du@beispiel.de"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? `${uid}-email-err` : undefined}
                  className={`${field} ${errors.email ? bad : ok}`}
                />
                {errors.email && <p id={`${uid}-email-err`} className="mt-1.5 text-xs text-rose-300">{errors.email}</p>}
              </div>

              <fieldset>
                <legend className="mb-1.5 block text-xs font-medium text-slate-300">Betreff</legend>
                <div className="grid grid-cols-2 gap-2">
                  {TOPICS.map((t) => (
                    <label
                      key={t.value}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-xs transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-400/50 ${
                        form.topic === t.value
                          ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                          : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${uid}-topic`}
                        value={t.value}
                        checked={form.topic === t.value}
                        onChange={() => update('topic', t.value)}
                        className="sr-only"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor={`${uid}-msg`} className="mb-1.5 block text-xs font-medium text-slate-300">
                  Nachricht
                </label>
                <textarea
                  id={`${uid}-msg`}
                  rows={5}
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Worum geht's?"
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? `${uid}-msg-err` : undefined}
                  className={`${field} resize-none ${errors.message ? bad : ok}`}
                />
                {errors.message && <p id={`${uid}-msg-err`} className="mt-1.5 text-xs text-rose-300">{errors.message}</p>}
              </div>

              {/* Für Menschen unsichtbares Feld gegen Spam-Bots */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden="true" />
              {sendError && (
                <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                  {sendError}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98]"
              >
                {sending ? 'Wird gesendet …' : 'Nachricht senden'}
                <SendIcon size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
              <p className="text-center text-[11px] text-slate-500">
                Mit dem Absenden werden deine Angaben zur Bearbeitung gespeichert (siehe{' '}
                <a href="#/rechtliches?seite=datenschutz" className="underline hover:text-slate-300">Datenschutz</a>).
              </p>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
