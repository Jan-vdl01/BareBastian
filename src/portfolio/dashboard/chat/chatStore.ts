import { useMemo } from 'react';
import { api } from '../../lib/api';
import { remoteResource } from '../../lib/remote';

/**
 * Chat-Nachrichten zwischen Mitgliedern und mit BAREBASTIAN (Server).
 * Neue Nachrichten werden regelmäßig abgefragt – im geöffneten Chat alle 4 Sekunden.
 */
export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  at: string;
  readAt?: string;
}

export interface Conversation {
  otherId: string;
  last?: Message;
  unread: number;
}

export const MAX_MESSAGE_LENGTH = 1000;

/** Nachrichten, an denen ich beteiligt bin (vom Server). */
export const chatResource = remoteResource<Message[]>('/chat', () => [], 30000);

const fail = (err: unknown) => {
  chatResource.refresh();
  alert(err instanceof Error ? err.message : 'Die Nachricht konnte nicht gesendet werden.');
};

export function sendMessage(from: string, to: string, rawText: string): Message | null {
  const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!text || from === to) return null;
  const msg: Message = { id: `tmp-${Date.now()}`, from, to, text, at: new Date().toISOString() };
  chatResource.set([...chatResource.get(), msg]); // sofort anzeigen
  api.post<Message[]>('/chat', { to, text }).then(chatResource.set).catch(fail);
  return msg;
}

export function markConversationRead(me: string, other: string) {
  if (!chatResource.get().some((m) => m.from === other && m.to === me && !m.readAt)) return;
  const now = new Date().toISOString();
  chatResource.set(chatResource.get().map((m) => (m.from === other && m.to === me && !m.readAt ? { ...m, readAt: now } : m)));
  api.post<Message[]>('/chat/read', { other }).then(chatResource.set).catch(() => undefined);
}

/** Unterhaltung für mich ausblenden. */
export function deleteConversation(me: string, other: string) {
  chatResource.set(chatResource.get().filter((m) => !((m.from === me && m.to === other) || (m.from === other && m.to === me))));
  api.del<Message[]>(`/chat/${other}`).then(chatResource.set).catch(fail);
}

/** Im Chat selbst wird häufiger nachgeladen. */
export const useAllMessages = (intervalMs?: number) => chatResource.use(intervalMs);

export function useConversations(me: string | undefined): Conversation[] {
  const all = useAllMessages(4000);
  return useMemo(() => {
    if (!me) return [];
    const map = new Map<string, Conversation>();
    for (const m of all) {
      if (m.from !== me && m.to !== me) continue;
      const other = m.from === me ? m.to : m.from;
      const c = map.get(other) ?? { otherId: other, unread: 0 };
      if (!c.last || m.at > c.last.at) c.last = m;
      if (m.to === me && !m.readAt) c.unread += 1;
      map.set(other, c);
    }
    return [...map.values()].sort((a, b) => (b.last?.at ?? '').localeCompare(a.last?.at ?? ''));
  }, [all, me]);
}

export function useThread(me: string | undefined, other: string | undefined): Message[] {
  const all = useAllMessages(4000);
  return useMemo(
    () => (me && other ? all.filter((m) => (m.from === me && m.to === other) || (m.from === other && m.to === me)) : []),
    [all, me, other],
  );
}

export function useUnreadCount(me: string | undefined): number {
  const all = useAllMessages();
  return useMemo(() => (me ? all.filter((m) => m.to === me && !m.readAt).length : 0), [all, me]);
}
