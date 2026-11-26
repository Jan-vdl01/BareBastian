/**
 * Mini-Formatierung für Texte (BBCode-artig), übersetzt in Chaturbate-erlaubte Tags.
 *
 *   [b]fett[/b]  [i]kursiv[/i]  [u]unterstrichen[/u]  [s]durchgestrichen[/s]
 *   [farbe=#ff5500]Text[/farbe]   [mark=#ffe600]markiert[/mark]   [groesse=20]Text[/groesse]
 *   [glow=#ff0000]leuchtend[/glow]   [link=https://…]Linktext[/link]   [gross]GROSSBUCHSTABEN[/gross]
 *
 * Alles andere wird als Text escaped. Zeilenumbrüche werden zu <br>.
 * Ausgabe enthält nur: strong, em, b, a, br.
 */

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const isHttps = (u: string) => /^https:\/\/[^\s"'<>\]]+\.[^\s"'<>\]]+$/i.test(u);

type TagName = 'b' | 'i' | 'u' | 's' | 'farbe' | 'mark' | 'groesse' | 'glow' | 'link' | 'gross';

function open(tag: TagName, arg: string | undefined): string | null {
  switch (tag) {
    case 'b':
      return '<strong style="font-weight:bold">';
    case 'i':
      return '<em style="font-style:italic">';
    case 'u':
      return '<b style="font-weight:inherit;text-decoration:underline">';
    case 's':
      return '<b style="font-weight:inherit;text-decoration:line-through">';
    case 'gross':
      return '<b style="font-weight:inherit;text-transform:uppercase">';
    case 'farbe':
      return arg && HEX.test(arg) ? `<b style="font-weight:inherit;color:${arg}">` : null;
    case 'mark':
      return arg && HEX.test(arg) ? `<b style="font-weight:inherit;background:${arg};padding:0 4px;border-radius:4px">` : null;
    case 'glow':
      return arg && HEX.test(arg) ? `<b style="font-weight:inherit;text-shadow:0 0 10px ${arg},0 0 2px ${arg}">` : null;
    case 'groesse': {
      const n = Number(arg);
      return Number.isFinite(n) && n >= 8 && n <= 72 ? `<b style="font-weight:inherit;font-size:${Math.round(n)}px">` : null;
    }
    case 'link':
      return arg && isHttps(arg) ? `<a href="${escapeHtml(arg)}" target="_blank" rel="nofollow" style="color:inherit;text-decoration:underline">` : null;
  }
}

const CLOSE: Record<TagName, string> = {
  b: '</strong>',
  i: '</em>',
  u: '</b>',
  s: '</b>',
  gross: '</b>',
  farbe: '</b>',
  mark: '</b>',
  glow: '</b>',
  groesse: '</b>',
  link: '</a>',
};

const TOKEN = /\[(\/?)(b|i|u|s|gross|farbe|mark|glow|groesse|link)(?:=([^\]\s]{1,300}))?\]/gi;

/** Wandelt formatierten Text in sicheres HTML (Einzeiler) um. */
export function richText(input: string): string {
  const text = input.replace(/\r\n?/g, '\n').trim();
  let out = '';
  let last = 0;
  const stack: TagName[] = [];
  for (const m of text.matchAll(TOKEN)) {
    out += escapeHtml(text.slice(last, m.index));
    last = m.index! + m[0].length;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase() as TagName;
    if (!closing) {
      const html = open(tag, m[3]);
      if (html) {
        out += html;
        stack.push(tag);
      } else out += escapeHtml(m[0]);
    } else {
      const idx = stack.lastIndexOf(tag);
      if (idx === -1) {
        out += escapeHtml(m[0]);
        continue;
      }
      // sauber verschachteln: alles darüber schließen und danach wieder öffnen ist zu komplex → darüber liegende schließen
      while (stack.length > idx) out += CLOSE[stack.pop()!];
    }
  }
  out += escapeHtml(text.slice(last));
  while (stack.length) out += CLOSE[stack.pop()!];
  return out.replace(/\n/g, '<br>');
}

/** Entfernt die Formatierungs-Codes (für Regel-Check & Zusammenfassungen). */
export const plainText = (input: string) => input.replace(TOKEN, '');
