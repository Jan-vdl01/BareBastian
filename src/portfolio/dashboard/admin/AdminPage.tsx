import { useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useProfiles } from '../../auth/userDirectory';
import { ADMIN_EMAIL } from '../../config/admin';
import { useContent } from '../../content/ContentContext';
import { AlertIcon, ChatIcon, CheckIcon, DownloadIcon, ImageIcon, PlayIcon, PostIcon, UploadIcon, UsersIcon } from '../../icons';
import { downloadBlob } from '../../lib/download';
import { useAllMessages } from '../chat/chatStore';
import { ProfileAvatar, ProfileName } from '../profile/ProfileAvatar';
import { AdminBadge, ConfirmDialog } from './AdminUI';

const SOURCE_LABEL = {
  local: { text: 'Lokale Änderungen in diesem Browser', tone: 'text-amber-200 bg-amber-300/10' },
  published: { text: 'Veröffentlichte content.json', tone: 'text-emerald-300 bg-emerald-400/10' },
  defaults: { text: 'Beispielinhalte', tone: 'text-slate-300 bg-white/5' },
} as const;

/** Verwaltung – nur für Admins erreichbar (Router-Schutz + Rollenprüfung). */
export function AdminPage() {
  const { isAdmin } = useAuth();
  const content = useContent();
  const profiles = useProfiles();
  const messages = useAllMessages();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [usage, setUsage] = useState<string | null>(null);

  if (!isAdmin) return null;

  const members = Object.values(profiles).filter((p) => !p.isDemo && p.role !== 'admin');
  const { localFiles } = content.exportContent();
  const source = SOURCE_LABEL[content.source];

  const exportJson = () => {
    const { json } = content.exportContent();
    downloadBlob(new Blob([json], { type: 'application/json' }), 'content.json');
    setNotice({ ok: true, text: 'content.json wurde heruntergeladen.' });
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      content.importContent(await file.text());
      setNotice({ ok: true, text: 'Inhalte wurden importiert.' });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Import fehlgeschlagen.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const estimate = async () => {
    const est = await navigator.storage?.estimate?.();
    setUsage(est?.usage !== undefined ? `${(est.usage / 1024 / 1024).toFixed(1)} MB von ca. ${((est.quota ?? 0) / 1024 / 1024 / 1024).toFixed(1)} GB belegt` : 'Nicht verfügbar');
  };

  const stats = [
    { label: 'Videos', value: content.videos.length, icon: PlayIcon, href: '#/abo-bereich/bibliothek?tab=videos' },
    { label: 'Fotos', value: content.photos.length, icon: ImageIcon, href: '#/abo-bereich/bibliothek?tab=fotos' },
    { label: 'Posts', value: content.posts.length, icon: PostIcon, href: '#/abo-bereich/bibliothek?tab=posts' },
    { label: 'Nachrichten', value: messages.length, icon: ChatIcon, href: '#/abo-bereich/chat' },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 to-orange-500/5 p-6">
        <div>
          <AdminBadge />
          <h2 className="mt-3 font-oswald text-2xl tracking-wide text-white">Willkommen in der Verwaltung</h2>
          <p className="mt-1 text-sm text-slate-400">Angemeldet als {ADMIN_EMAIL}. Diese Seite und alle Bearbeitungsfunktionen sind nur für dich sichtbar.</p>
        </div>
        <a href="#/abo-bereich/bibliothek" className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-900">
          Inhalte bearbeiten
        </a>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <a key={s.label} href={s.href} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-300/30">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-300/15 text-amber-200">
                <Icon size={20} />
              </span>
              <span>
                <span className="block text-2xl font-semibold text-white">{s.value}</span>
                <span className="text-sm text-slate-400">{s.label}</span>
              </span>
            </a>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="font-oswald text-xl tracking-wide text-white">Veröffentlichen</h3>
          <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${source.tone}`}>Aktuelle Quelle: {source.text}</p>
          <ol className="mt-5 space-y-3 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">1</span>
              Inhalte in der Bibliothek bearbeiten. Änderungen werden zunächst nur in diesem Browser gespeichert.
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">2</span>
              <span>
                <b className="text-white">content.json</b> exportieren und neben die index.html auf den Server laden.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">3</span>
              <span>
                Hochgeladene Dateien ({localFiles.length}) herunterladen und in die Ordner <code className="text-amber-200">media/videos</code> bzw. <code className="text-amber-200">media/photos</code> laden.
              </span>
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={exportJson} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-50">
              <DownloadIcon size={16} /> content.json exportieren
            </button>
            <button
              type="button"
              disabled={!localFiles.length}
              onClick={async () => {
                const n = await content.downloadLocalFiles();
                setNotice({ ok: true, text: `${n} Datei(en) heruntergeladen. Dateinamen nicht ändern.` });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/10 disabled:opacity-40"
            >
              <DownloadIcon size={16} /> Mediendateien ({localFiles.length})
            </button>
          </div>
          {localFiles.length > 0 && (
            <details className="mt-4 text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300">Dateinamen anzeigen</summary>
              <ul className="mt-2 space-y-1 font-mono">
                {localFiles.map((f) => (
                  <li key={f.path}>{f.path}</li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="font-oswald text-xl tracking-wide text-white">Sichern & Zurücksetzen</h3>
          <div className="mt-5 space-y-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-white/5">
              <UploadIcon size={18} className="text-amber-200" />
              <span>
                <span className="block font-medium">content.json importieren</span>
                <span className="text-xs text-slate-500">Ersetzt die Inhalte in diesem Browser</span>
              </span>
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => importJson(e.target.files?.[0])} />
            <button type="button" onClick={() => setConfirmReset(true)} className="flex w-full items-center gap-3 rounded-xl border border-rose-400/20 px-4 py-3 text-left text-sm text-rose-200 transition-colors hover:bg-rose-500/10">
              <AlertIcon size={18} />
              <span>
                <span className="block font-medium">Lokale Änderungen verwerfen</span>
                <span className="text-xs text-rose-200/60">Löscht hochgeladene Dateien in diesem Browser</span>
              </span>
            </button>
            <button type="button" onClick={estimate} className="text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline">
              Speicherbelegung prüfen
            </button>
            {usage && <p className="text-xs text-slate-400">{usage}</p>}
          </div>
        </section>
      </div>

      {notice && (
        <p role="status" className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${notice.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
          {notice.ok ? <CheckIcon size={16} /> : <AlertIcon size={16} />} {notice.text}
        </p>
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-oswald text-xl tracking-wide text-white">Mitglieder</h3>
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
            <UsersIcon size={16} /> {members.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">Im Demo-Modus nur Konten, die in diesem Browser angelegt wurden.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {members.map((p) => (
            <li key={p.id}>
              <a href={`#/abo-bereich/profil?u=${p.id}`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
                <ProfileAvatar profile={p} size={36} />
                <span className="min-w-0">
                  <ProfileName profile={p} className="text-sm font-medium text-white" />
                  <span className="block truncate text-xs text-slate-500">@{p.username}</span>
                </span>
              </a>
            </li>
          ))}
          {members.length === 0 && <li className="text-sm text-slate-500">Noch keine Mitglieder.</li>}
        </ul>
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Lokale Änderungen verwerfen"
          message="Alle in diesem Browser bearbeiteten Inhalte und hochgeladenen Dateien werden gelöscht. Danach werden wieder die veröffentlichten bzw. Beispielinhalte angezeigt."
          confirmLabel="Verwerfen"
          onConfirm={async () => {
            await content.resetContent();
            setNotice({ ok: true, text: 'Lokale Änderungen wurden verworfen.' });
          }}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
