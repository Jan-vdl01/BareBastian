import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useProfiles, type Profile } from '../../auth/userDirectory';
import { CREATOR_ID } from '../../config/admin';
import { ArrowLeft, ChatIcon, CheckIcon, PlusIcon, SearchIcon, SendIcon, TrashIcon, XIcon } from '../../icons';
import { navigate } from '../../router';
import { ProfileAvatar, ProfileName } from '../profile/ProfileAvatar';
import {
  deleteConversation,
  markConversationRead,
  MAX_MESSAGE_LENGTH,
  sendMessage,
  useConversations,
  useThread,
  type Message,
} from './chatStore';

const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

function relative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return time(iso);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Heute';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function ChatPage({ query }: { query: URLSearchParams }) {
  const { user } = useAuth();
  const me = user?.id;
  const profiles = useProfiles();
  const conversations = useConversations(me);
  const activeId = query.get('c') ?? undefined;
  const [picker, setPicker] = useState(false);

  // Für Mitglieder ist der Chat mit BAREBASTIAN immer oben angeheftet.
  const list = useMemo(() => {
    const items = conversations.filter((c) => profiles[c.otherId]);
    if (me !== CREATOR_ID && !items.some((c) => c.otherId === CREATOR_ID)) items.unshift({ otherId: CREATOR_ID, unread: 0 });
    if (activeId && activeId !== me && profiles[activeId] && !items.some((c) => c.otherId === activeId)) items.unshift({ otherId: activeId, unread: 0 });
    return items;
  }, [conversations, profiles, me, activeId]);

  const open = (id: string) => navigate(`/abo-bereich/chat?c=${id}`);

  if (!me) return null;

  return (
    <div className="grid h-[calc(100dvh-12rem)] min-h-[480px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl lg:h-[calc(100dvh-9.5rem)] lg:grid-cols-[320px_1fr]">
      {/* Unterhaltungen */}
      <aside className={`flex min-h-0 flex-col border-white/5 lg:border-r ${activeId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3.5">
          <h2 className="font-oswald text-lg tracking-wide text-white">Nachrichten</h2>
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10"
          >
            <PlusIcon size={14} /> Neu
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.map((c) => {
            const p = profiles[c.otherId];
            const active = c.otherId === activeId;
            return (
              <li key={c.otherId}>
                <button
                  type="button"
                  onClick={() => open(c.otherId)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
                >
                  <ProfileAvatar profile={p} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <ProfileName profile={p} className={`text-sm ${c.unread ? 'font-semibold text-white' : 'font-medium text-slate-200'}`} />
                      {c.last && <span className="shrink-0 text-[11px] text-slate-500">{relative(c.last.at)}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${c.unread ? 'text-slate-200' : 'text-slate-500'}`}>
                        {c.last ? `${c.last.from === me ? 'Du: ' : ''}${c.last.text}` : c.otherId === CREATOR_ID ? 'Schreib mir direkt 💬' : 'Noch keine Nachrichten'}
                      </span>
                      {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-cyan-400 px-1.5 text-[11px] font-bold text-slate-900">{c.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-slate-500">
              Noch keine Unterhaltungen.
              <br />
              <button type="button" onClick={() => setPicker(true)} className="mt-2 text-cyan-300 hover:underline">
                Neue Nachricht schreiben
              </button>
            </li>
          )}
        </ul>
        <p className="border-t border-white/5 px-4 py-2.5 text-[11px] leading-relaxed text-slate-500">
          Nachrichten sehen nur du und dein Gesprächspartner.
        </p>
      </aside>

      {/* Verlauf */}
      <section className={`min-h-0 flex-col ${activeId ? 'flex' : 'hidden lg:flex'}`}>
        {activeId && profiles[activeId] && activeId !== me ? (
          <Thread me={me} other={profiles[activeId]} />
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cyan-400/10 text-cyan-300">
                <ChatIcon size={28} />
              </span>
              <p className="mt-4 font-oswald text-2xl text-white">Deine Nachrichten</p>
              <p className="mt-1 text-sm text-slate-400">Wähle eine Unterhaltung oder starte eine neue.</p>
            </div>
          </div>
        )}
      </section>

      {picker && (
        <MemberPicker
          profiles={Object.values(profiles).filter((p) => p.id !== me)}
          onClose={() => setPicker(false)}
          onPick={(id) => {
            setPicker(false);
            open(id);
          }}
        />
      )}
    </div>
  );
}

function Thread({ me, other }: { me: string; other: Profile }) {
  const messages = useThread(me, other.id);
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const unreadFromOther = messages.some((m) => m.from === other.id && !m.readAt);

  useEffect(() => {
    if (unreadFromOther) markConversationRead(me, other.id);
  }, [unreadFromOther, me, other.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    setDraft('');
    inputRef.current?.focus();
  }, [other.id]);

  const send = () => {
    if (!sendMessage(me, other.id, draft)) return;
    setDraft('');
    inputRef.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const groups = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of messages) {
      const day = new Date(m.at).toDateString();
      const g = out[out.length - 1];
      if (g && g.day === day) g.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <button type="button" onClick={() => navigate('/abo-bereich/chat')} aria-label="Zurück" className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10 lg:hidden">
          <ArrowLeft size={18} />
        </button>
        <a href={`#/abo-bereich/profil?u=${other.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white/5">
          <ProfileAvatar profile={other} size={40} />
          <span className="min-w-0">
            <ProfileName profile={other} className="text-sm font-semibold text-white" />
            <span className="block truncate text-xs text-slate-500">@{other.username}</span>
          </span>
        </a>
        {messages.length > 0 &&
          (confirmDelete ? (
            <span className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  deleteConversation(me, other.id);
                  setConfirmDelete(false);
                }}
                className="rounded-lg bg-rose-500 px-2.5 py-1.5 font-semibold text-white"
              >
                Verlauf löschen
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} aria-label="Abbrechen" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10">
                <XIcon size={14} />
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Verlauf löschen" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300">
              <TrashIcon size={16} />
            </button>
          ))}
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xs py-10 text-center">
            <ProfileAvatar profile={other} size={64} />
            <p className="mt-3 font-medium text-white">Sag Hallo zu {other.displayName}!</p>
            <p className="mt-1 text-xs text-slate-500">Bleib respektvoll und freundlich.</p>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.day} className="space-y-1.5">
            <p className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">{dayLabel(g.items[0].at)}</p>
            {g.items.map((m, i) => {
              const mine = m.from === me;
              const next = g.items[i + 1];
              const lastOfRun = !next || next.from !== m.from;
              return (
                <div key={m.id} className={`animate-fade-up flex ${mine ? 'justify-end' : 'justify-start'}`} style={{ animationDuration: '0.3s' }}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[65%] ${
                      mine
                        ? `bg-gradient-to-br from-cyan-500 to-blue-600 text-white ${lastOfRun ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
                        : `border border-white/10 bg-white/[0.06] text-slate-100 ${lastOfRun ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
                    }`}
                  >
                    {m.text}
                    <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-500'}`}>
                      {time(m.at)}
                      {mine && (
                        <span className="relative inline-flex" aria-label={m.readAt ? 'Gelesen' : 'Gesendet'}>
                          <CheckIcon size={12} />
                          {m.readAt && <CheckIcon size={12} className="-ml-1.5" />}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-white/5 p-3"
      >
        <label className="sr-only" htmlFor="chat-input">
          Nachricht an {other.displayName}
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={onKey}
          placeholder={`Nachricht an ${other.displayName} …`}
          className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Senden"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
        >
          <SendIcon size={18} />
        </button>
      </form>
    </>
  );
}

function MemberPicker({ profiles, onClose, onPick }: { profiles: Profile[]; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const list = profiles
    .filter((p) => `${p.displayName} ${p.username}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.id === CREATOR_ID ? -1 : b.id === CREATOR_ID ? 1 : a.displayName.localeCompare(b.displayName)));

  return (
    <div role="dialog" aria-modal="true" aria-label="Neue Nachricht" className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Schließen" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0f18] sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <SearchIcon size={18} className="text-slate-500" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mitglied suchen …" className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
          <button type="button" onClick={onClose} aria-label="Schließen" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-white/10">
            <XIcon size={16} />
          </button>
        </div>
        <ul className="overflow-y-auto p-2">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5">
                <ProfileAvatar profile={p} size={40} />
                <span className="min-w-0">
                  <ProfileName profile={p} className="text-sm font-medium text-white" />
                  <span className="block truncate text-xs text-slate-500">@{p.username}</span>
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">Niemand gefunden.</li>}
        </ul>
      </div>
    </div>
  );
}
