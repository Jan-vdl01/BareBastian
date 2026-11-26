/**
 * Brücke zwischen dem gespeicherten Formatierungs-Code ([b]…[/b] usw.) und dem TipTap-Editor.
 * Der Code bleibt das Speicherformat – so funktionieren Bio-Ausgabe, Posts und alte Daten unverändert.
 */
import type { JSONContent } from '@tiptap/core';
import { escapeHtml } from '../richText';

type Tag = 'link' | 'farbe' | 'groesse' | 'mark' | 'glow' | 'gross' | 'b' | 'i' | 'u' | 's';

/** Feste Reihenfolge: äußere Tags zuerst – ergibt sauber verschachtelten Code. */
const ORDER: Tag[] = ['link', 'farbe', 'groesse', 'mark', 'glow', 'gross', 'b', 'i', 'u', 's'];

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const isHttps = (u: string) => /^https:\/\/[^\s"'<>\]]+\.[^\s"'<>\]]+$/i.test(u);

/** rgb()/rgba()/#abc → #aabbcc; sonst null. */
export function toHex(color: string | null | undefined): string | null {
  if (!color) return null;
  const c = color.trim();
  if (HEX.test(c)) return c.length === 4 ? `#${[...c.slice(1)].map((x) => x + x).join('')}`.toLowerCase() : c.toLowerCase();
  const m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  return m ? `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}` : null;
}

const pxSize = (v: string | null | undefined) => {
  const m = String(v ?? '').match(/^(\d+(?:\.\d+)?)px$/);
  const n = m ? Math.round(Number(m[1])) : NaN;
  return n >= 8 && n <= 72 ? n : null;
};

/* ---------- Code → Editor-HTML ---------- */

function openHtml(tag: Tag, arg?: string): string | null {
  switch (tag) {
    case 'b':
      return '<strong>';
    case 'i':
      return '<em>';
    case 'u':
      return '<u>';
    case 's':
      return '<s>';
    case 'gross':
      return '<span data-caps="1">';
    case 'farbe':
      return arg && HEX.test(arg) ? `<span style="color: ${arg}">` : null;
    case 'groesse': {
      const n = Number(arg);
      return n >= 8 && n <= 72 ? `<span style="font-size: ${Math.round(n)}px">` : null;
    }
    case 'mark':
      return arg && HEX.test(arg) ? `<mark data-color="${arg}" style="background-color: ${arg}">` : null;
    case 'glow':
      return arg && HEX.test(arg) ? `<span data-glow="${arg}">` : null;
    case 'link':
      return arg && isHttps(arg) ? `<a href="${escapeHtml(arg)}">` : null;
  }
}
const CLOSE_HTML: Record<Tag, string> = { b: '</strong>', i: '</em>', u: '</u>', s: '</s>', gross: '</span>', farbe: '</span>', groesse: '</span>', mark: '</mark>', glow: '</span>', link: '</a>' };

const TOKEN = /\[(\/?)(b|i|u|s|gross|farbe|mark|glow|groesse|link)(?:=([^\]\s]{1,300}))?\]/gi;

export function bbcodeToHtml(input: string): string {
  const text = (input ?? '').replace(/\r\n?/g, '\n');
  const stack: { tag: Tag; html: string }[] = [];
  let out = '<p>';
  let last = 0;
  const emitText = (t: string) => {
    const parts = t.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) {
        // Absatzwechsel: offene Formatierungen schließen und im neuen Absatz wieder öffnen
        out += [...stack].reverse().map((s) => CLOSE_HTML[s.tag]).join('') + '</p><p>' + stack.map((s) => s.html).join('');
      }
      out += escapeHtml(part);
    });
  };
  for (const m of text.matchAll(TOKEN)) {
    emitText(text.slice(last, m.index));
    last = m.index! + m[0].length;
    const tag = m[2].toLowerCase() as Tag;
    if (m[1] !== '/') {
      const html = openHtml(tag, m[3]);
      if (html) {
        stack.push({ tag, html });
        out += html;
      } else emitText(m[0]);
    } else {
      const idx = stack.map((s) => s.tag).lastIndexOf(tag);
      if (idx === -1) {
        emitText(m[0]);
        continue;
      }
      const reopen = stack.slice(idx + 1);
      out += [...stack.slice(idx)].reverse().map((s) => CLOSE_HTML[s.tag]).join('');
      stack.splice(idx);
      for (const r of reopen) {
        stack.push(r);
        out += r.html;
      }
    }
  }
  emitText(text.slice(last));
  out += [...stack].reverse().map((s) => CLOSE_HTML[s.tag]).join('') + '</p>';
  return out;
}

/* ---------- Editor-JSON → Code ---------- */

interface Wanted {
  tag: Tag;
  arg?: string;
}

function marksToTags(marks: JSONContent['marks']): Wanted[] {
  const out: Wanted[] = [];
  for (const m of marks ?? []) {
    const a = (m.attrs ?? {}) as Record<string, string | null>;
    switch (m.type) {
      case 'bold':
        out.push({ tag: 'b' });
        break;
      case 'italic':
        out.push({ tag: 'i' });
        break;
      case 'underline':
        out.push({ tag: 'u' });
        break;
      case 'strike':
        out.push({ tag: 's' });
        break;
      case 'caps':
        out.push({ tag: 'gross' });
        break;
      case 'glow': {
        const c = toHex(a.color);
        if (c) out.push({ tag: 'glow', arg: c });
        break;
      }
      case 'highlight': {
        const c = toHex(a.color) ?? '#ffe600';
        out.push({ tag: 'mark', arg: c });
        break;
      }
      case 'textStyle': {
        const c = toHex(a.color);
        if (c) out.push({ tag: 'farbe', arg: c });
        const px = pxSize(a.fontSize);
        if (px) out.push({ tag: 'groesse', arg: String(px) });
        break;
      }
      case 'link':
        if (a.href && isHttps(a.href)) out.push({ tag: 'link', arg: a.href });
        break;
    }
  }
  return out.sort((x, y) => ORDER.indexOf(x.tag) - ORDER.indexOf(y.tag));
}

const openCode = (w: Wanted) => `[${w.tag}${w.arg ? `=${w.arg}` : ''}]`;
const same = (x: Wanted, y: Wanted) => x.tag === y.tag && x.arg === y.arg;

export function jsonToBbcode(doc: JSONContent): string {
  const lines: string[] = [];
  for (const block of doc.content ?? []) {
    let line = '';
    let open: Wanted[] = [];
    const sync = (want: Wanted[]) => {
      let k = 0;
      while (k < open.length && k < want.length && same(open[k], want[k])) k++;
      for (let j = open.length - 1; j >= k; j--) line += `[/${open[j].tag}]`;
      for (let j = k; j < want.length; j++) line += openCode(want[j]);
      open = want;
    };
    for (const node of block.content ?? []) {
      if (node.type === 'hardBreak') {
        sync([]);
        line += '\n';
      } else if (node.type === 'text') {
        sync(marksToTags(node.marks));
        line += node.text ?? '';
      }
    }
    sync([]);
    lines.push(line);
  }
  return lines.join('\n').replace(/\n+$/, '');
}
