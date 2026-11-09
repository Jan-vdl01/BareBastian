import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { isUsernameTaken, saveProfile, type Profile } from '../../auth/userDirectory';
import { CameraIcon, CheckIcon, TrashIcon, XIcon } from '../../icons';
import { cropImage } from '../../lib/mediaDb';
import { coverGradient, ProfileAvatar } from './ProfileAvatar';

const input =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-cyan-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-cyan-400/10';

function Field({ label, children, hint, error, htmlFor }: { label: string; children: ReactNode; hint?: string; error?: string; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-[11px] text-rose-300">{error}</p> : hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

const BIO_MAX = 300;
const handle = (v: string) => v.trim().replace(/^@+/, '').replace(/^https?:\/\/\S+\//, '').replace(/[^\w.]/g, '').slice(0, 30);

/** Bearbeitungsdialog für das eigene Profil. */
export function ProfileEditor({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const id = useId();
  const [form, setForm] = useState<Profile>(profile);
  const [interestDraft, setInterestDraft] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pickImage = async (kind: 'avatar' | 'cover', file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setSaveError('Bitte eine Bilddatei wählen.');
    setBusy(kind);
    try {
      set(kind, kind === 'avatar' ? await cropImage(file, 320, 320, 0.85) : await cropImage(file, 1200, 400, 0.8));
      setSaveError(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Bild konnte nicht geladen werden.');
    } finally {
      setBusy(null);
    }
  };

  const addInterest = () => {
    const v = interestDraft.trim().slice(0, 24);
    if (v && !form.interests.includes(v) && form.interests.length < 8) set('interests', [...form.interests, v]);
    setInterestDraft('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.displayName.trim().length < 2) e.displayName = 'Mindestens 2 Zeichen.';
    if (!/^[a-z0-9_.]{3,20}$/.test(form.username)) e.username = '3–20 Zeichen: Kleinbuchstaben, Zahlen, Punkt, Unterstrich.';
    else if (isUsernameTaken(form.username, form.id)) e.username = 'Dieser Benutzername ist schon vergeben.';
    if (form.website && !/^https:\/\/[^\s]+\.[^\s]+$/.test(form.website.trim())) e.website = 'Bitte eine vollständige https://-Adresse angeben.';
    return e;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      saveProfile({
        ...form,
        displayName: form.displayName.trim().slice(0, 40),
        bio: form.bio.trim().slice(0, BIO_MAX),
        location: form.location.trim().slice(0, 60),
        website: form.website.trim(),
        pronouns: form.pronouns.trim().slice(0, 30),
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Profil bearbeiten" className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Schließen" className="absolute inset-0 cursor-default" onClick={onClose} />
      <form onSubmit={submit} noValidate className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0f18] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-4">
          <h2 className="font-oswald text-xl tracking-wide text-white">Profil bearbeiten</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 hover:bg-white/15">
            <XIcon size={16} />
          </button>
        </header>

        <div className="overflow-y-auto">
          {/* Titelbild + Avatar */}
          <div className="relative">
            <div className="relative h-36 sm:h-44" style={form.cover ? undefined : { background: coverGradient(form.id) }}>
              {form.cover && <img src={form.cover} alt="" className="h-full w-full object-cover" />}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/60 px-3.5 py-2 text-xs font-medium text-white backdrop-blur hover:bg-black/80">
                  <CameraIcon size={15} /> {busy === 'cover' ? 'Lädt …' : 'Titelbild ändern'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickImage('cover', e.target.files?.[0])} />
                </label>
                {form.cover && (
                  <button type="button" onClick={() => set('cover', undefined)} aria-label="Titelbild entfernen" className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-rose-500">
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="absolute -bottom-12 left-6 flex items-end gap-2">
              <label className="group relative cursor-pointer rounded-full" aria-label="Profilbild ändern">
                <ProfileAvatar profile={form} size={104} ring />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-80 transition-opacity group-hover:opacity-100">
                  {busy === 'avatar' ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <CameraIcon size={24} />}
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickImage('avatar', e.target.files?.[0])} />
              </label>
              {form.avatar && (
                <button type="button" onClick={() => set('avatar', undefined)} className="mb-1 text-xs text-rose-300 hover:underline">
                  Profilbild entfernen
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 px-6 pb-6 pt-16">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Anzeigename *" error={errors.displayName} htmlFor={`${id}-name`}>
                <input id={`${id}-name`} className={input} maxLength={40} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
              </Field>
              <Field label="Benutzername *" error={errors.username} hint="Für dein Profil: @name" htmlFor={`${id}-user`}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">@</span>
                  <input id={`${id}-user`} className={`${input} pl-8`} maxLength={20} value={form.username} onChange={(e) => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} />
                </div>
              </Field>
            </div>

            <Field label="Biografie" htmlFor={`${id}-bio`}>
              <textarea id={`${id}-bio`} rows={4} maxLength={BIO_MAX} className={`${input} resize-none`} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Erzähl etwas über dich …" />
              <p className={`mt-1 text-right text-[11px] ${form.bio.length > BIO_MAX - 20 ? 'text-amber-300' : 'text-slate-500'}`}>
                {form.bio.length} / {BIO_MAX}
              </p>
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Wohnort" htmlFor={`${id}-loc`}>
                <input id={`${id}-loc`} className={input} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="z. B. Hamburg" />
              </Field>
              <Field label="Pronomen" htmlFor={`${id}-pro`}>
                <input id={`${id}-pro`} className={input} value={form.pronouns} onChange={(e) => set('pronouns', e.target.value)} placeholder="optional" />
              </Field>
              <Field label="Website" error={errors.website} htmlFor={`${id}-web`}>
                <input id={`${id}-web`} type="url" className={input} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
              </Field>
            </div>

            <Field label={`Interessen (${form.interests.length}/8)`}>
              <div className="mb-2 flex flex-wrap gap-2">
                {form.interests.map((t) => (
                  <button key={t} type="button" onClick={() => set('interests', form.interests.filter((x) => x !== t))} aria-label={`${t} entfernen`} className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100 transition-colors hover:bg-rose-500/15 hover:text-rose-200">
                    {t} ×
                  </button>
                ))}
              </div>
              <input
                className={input}
                value={interestDraft}
                disabled={form.interests.length >= 8}
                onChange={(e) => setInterestDraft(e.target.value)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addInterest())}
                onBlur={addInterest}
                placeholder={form.interests.length >= 8 ? 'Maximum erreicht' : 'Interesse eingeben + Enter'}
              />
            </Field>

            <Field label="Social Media" hint="Nur den Benutzernamen eintragen, ohne @">
              <div className="grid gap-2 sm:grid-cols-3">
                {(['instagram', 'x', 'telegram'] as const).map((k) => (
                  <input key={k} aria-label={k} className={input} value={form.socials[k] ?? ''} onChange={(e) => set('socials', { ...form.socials, [k]: handle(e.target.value) || undefined })} placeholder={{ instagram: 'Instagram', x: 'X (Twitter)', telegram: 'Telegram' }[k]} />
                ))}
              </div>
            </Field>

            {saveError && (
              <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {saveError}
              </p>
            )}
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-white/5 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
            Abbrechen
          </button>
          <button type="submit" disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            <CheckIcon size={16} /> Speichern
          </button>
        </footer>
      </form>
    </div>
  );
}
