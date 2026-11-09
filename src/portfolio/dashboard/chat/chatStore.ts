import { useMemo } from 'react';
import { getProfile } from '../../auth/userDirectory';
import { readJSON, uid, useStoredValue, writeJSON } from '../../lib/localStore';

/**
 * Chat-Nachrichten (Demo: im Browser gespeichert, synchron zwischen Tabs).
 * Für echte Kommunikation zwischen Geräten wird ein Server (z. B. WebSocket) benötigt.
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

const KEY = 'bb_chat';
export const MAX_MESSAGE_LENGTH = 1000;

const readAll = () => readJSON<Message[]>(KEY, []);

export function sendMessage(from: string, to: string, rawText: string): Message | null {
  const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!text || from === to) return null;
  const msg: Message = { id: uid('m-'), from, to, text, at: new Date().toISOString() };
  writeJSON(KEY, [...readAll(), msg]);
  return msg;
}

export function markConversationRead(me: string, other: string) {
  const all = readAll();
  let changed = false;
  const now = new Date().toISOString();
  const next = all.map((m) => {
    if (m.from === other && m.to === me && !m.readAt) {
      changed = true;
      return { ...m, readAt: now };
    }
    return m;
  });
  if (changed) writeJSON(KEY, next);
}

export function deleteConversation(me: string, other: string) {
  writeJSON(
    KEY,
    readAll().filter((m) => !((m.from === me && m.to === other) || (m.from === other && m.to === me))),
  );
}

export const useAllMessages = () => useStoredValue<Message[]>(KEY, []);

export function useConversations(me: string | undefined): Conversation[] {
  const all = useAllMessages();
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
  const all = useAllMessages();
  return useMemo(
    () => (me && other ? all.filter((m) => (m.from === me && m.to === other) || (m.from === other && m.to === me)) : []),
    [all, me, other],
  );
}

export function useUnreadCount(me: string | undefined): number {
  const all = useAllMessages();
  return useMemo(() => (me ? all.filter((m) => m.to === me && !m.readAt).length : 0), [all, me]);
}

/* ---------- Demo-Mitglieder antworten automatisch ---------- */

const DEMO_REPLIES = [
  'Hey! Schön, von dir zu hören 😊',
  'Haha, das sehe ich genauso!',
  'Klingt gut – erzähl mehr!',
  'Hast du den letzten Stream gesehen? War richtig gut.',
  'Danke dir, wünsch dir einen schönen Tag! ✨',
  'Oh cool, das wusste ich noch gar nicht.',
  'Bin gerade unterwegs, melde mich später nochmal 👋',
];

const pending = new Set<string>();

/** Plant eine Antwort, wenn der Empfänger ein Demo-Profil ist. Liefert true, wenn geantwortet wird. */
export function scheduleDemoReply(from: string, demoId: string, onTyping?: (typing: boolean) => void): boolean {
  const demo = getProfile(demoId);
  if (!demo?.isDemo || pending.has(demoId)) return false;
  pending.add(demoId);
  setTimeout(() => {
    markConversationRead(demoId, from);
    onTyping?.(true);
  }, 700);
  setTimeout(() => {
    sendMessage(demoId, from, DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)]);
    onTyping?.(false);
    pending.delete(demoId);
  }, 2200 + Math.random() * 1200);
  return true;
}
