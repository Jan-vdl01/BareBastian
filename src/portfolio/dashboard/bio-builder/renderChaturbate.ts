/**
 * Erzeugt Chaturbate-kompatibles HTML für das „About Me“-Feld.
 *
 * Plattform-Regeln (vom Sanitizer erzwungen):
 *  - Erlaubte Tags: p, b, strong, i, em, a, img, br, marquee – sonst nichts.
 *  - Keine div/span/table/ul/h1–h6/style/script …
 *  - Jedes Modul = ein <p>-Wrapper; Boxen über <b>/<i>/<a> mit display:block/inline-block.
 *  - 100 % Inline-CSS, jeder Link mit target="_blank" rel="nofollow".
 *  - Ausgabe als EINZEILER – echte Zeilenumbrüche würden zu sichtbaren <br>.
 */
import { FONTS, getTemplate, rgba, safeHex } from '../bio/designTemplates';
import type { BioModule, BioProject, BioTheme } from './types';

export const ALLOWED_TAGS = ['p', 'b', 'strong', 'i', 'em', 'a', 'img', 'br', 'marquee'] as const;
export const MAX_WIDTH = 892;

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ZWSP = '&#8203;'; // verhindert, dass leere Deko-Elemente entfernt werden

type Css = Record<string, string | number | undefined | false>;

/** CSS-Objekt → style-Attribut (Anführungszeichen werden entschärft). */
const css = (obj: Css) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== false && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${String(v).replace(/"/g, "'")}`)
    .join(';');

const tag = (name: (typeof ALLOWED_TAGS)[number], style: Css, inner = '', attrs = '') => `<${name}${attrs} style="${css(style)}">${inner}</${name}>`;

/** Text sicher einsetzen: HTML escapen, Zeilenumbrüche → <br>, keine echten Newlines. */
export const text = (value: string) =>
  escapeHtml(value.trim())
    .replace(/\r\n?/g, '\n')
    .replace(/\n/g, '<br>');

export const isHttpsUrl = (url: string) => /^https:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(url.trim());
const url = (u: string) => escapeHtml(u.trim());
const linkAttrs = (href: string) => ` href="${url(href)}" target="_blank" rel="nofollow"`;

interface Ctx {
  theme: BioTheme;
  a: string;
  b: string;
  p: ReturnType<ReturnType<typeof getTemplate>['palette']>;
  font: string;
  r: number;
}

function sectionTitle(ctx: Ctx, title: string, emoji = '') {
  if (!title.trim()) return '';
  return tag(
    'b',
    { display: 'block', fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: ctx.p.heading, margin: '0 0 12px 0' },
    `${ctx.theme.emojis && emoji ? `${emoji} ` : ''}${text(title)}`,
  );
}

/** Zeile mit rechtsbündigem Wert (Float vor dem Text, damit es im Fluss funktioniert). */
function row(ctx: Ctx, left: string, right: string, opts: { link?: string } = {}) {
  const rightPart = right
    ? tag('i', { float: 'right', fontStyle: 'normal', fontWeight: 'bold', background: ctx.p.pillBg, color: ctx.p.pillText, borderRadius: '999px', padding: '1px 10px', marginLeft: '10px', fontSize: '13px' }, right)
    : '';
  const box: Css = {
    display: 'block',
    fontWeight: 'normal',
    textAlign: 'left',
    padding: '9px 14px',
    margin: '0 0 6px 0',
    background: ctx.p.cardBg,
    border: ctx.p.cardBorder,
    borderRadius: `${Math.round(ctx.r / 2)}px`,
    overflow: 'hidden',
    color: ctx.p.text,
    textDecoration: 'none',
  };
  return opts.link && isHttpsUrl(opts.link) ? tag('a', box, rightPart + left, linkAttrs(opts.link)) : tag('b', box, rightPart + left);
}

function renderInner(m: BioModule, ctx: Ctx): string {
  const { p, a, b, r } = ctx;
  const emo = (e: string) => (ctx.theme.emojis ? e : '');
  switch (m.type) {
    case 'header': {
      let out = '';
      if (isHttpsUrl(m.bannerUrl)) out += `<img src="${url(m.bannerUrl)}" alt="" style="${css({ display: 'block', width: '100%', maxWidth: '100%', height: 'auto', borderRadius: `${r}px`, margin: '0 0 18px 0' })}">`;
      if (isHttpsUrl(m.avatarUrl))
        out += `<img src="${url(m.avatarUrl)}" alt="" style="${css({ display: 'inline-block', width: '120px', height: '120px', objectFit: 'cover', borderRadius: '50%', border: `3px solid ${a}`, boxShadow: `0 0 24px ${rgba(a, 0.5)}`, margin: '0 0 12px 0' })}">`;
      out += tag('b', { display: 'block', fontSize: '42px', lineHeight: '1.1', fontWeight: '800', letterSpacing: '2px', color: p.headline, textShadow: p.headlineShadow }, text(m.name || 'Dein Name'));
      if (m.tagline.trim()) out += tag('i', { display: 'block', fontStyle: 'normal', fontSize: '16px', color: p.muted, margin: '8px 0 0 0' }, text(m.tagline));
      return out;
    }
    case 'facts': {
      const chips = m.items
        .filter((x) => x.value.trim())
        .map((x) =>
          tag(
            'i',
            { display: 'inline-block', fontStyle: 'normal', background: p.cardBg, border: p.cardBorder, borderRadius: '999px', padding: '5px 14px', margin: '4px', fontSize: '14px', color: p.text },
            `${x.label.trim() ? `${tag('b', { color: p.heading, fontWeight: 'bold' }, text(x.label))} ` : ''}${text(x.value)}`,
          ),
        )
        .join('');
      return sectionTitle(ctx, m.title, emo('✨')) + chips;
    }
    case 'text':
      return sectionTitle(ctx, m.title) + tag('b', { display: 'block', fontWeight: 'normal', fontSize: '15px', color: p.text }, text(m.text) || ZWSP);
    case 'image': {
      if (!isHttpsUrl(m.url)) return sectionTitle(ctx, m.title);
      const w = Math.max(20, Math.min(100, m.width || 100));
      const img = `<img src="${url(m.url)}" alt="${escapeHtml(m.alt)}" style="${css({ display: 'inline-block', width: `${w}%`, maxWidth: '100%', height: 'auto', borderRadius: `${r}px`, border: p.cardBorder })}">`;
      const linked = isHttpsUrl(m.link) ? tag('a', { display: 'inline-block', width: '100%', textDecoration: 'none' }, img, linkAttrs(m.link)) : img;
      const caption = m.caption.trim() ? tag('i', { display: 'block', fontStyle: 'normal', fontSize: '13px', color: p.muted, margin: '8px 0 0 0' }, text(m.caption)) : '';
      return sectionTitle(ctx, m.title) + linked + caption;
    }
    case 'gallery': {
      const cols = m.columns;
      const width = `${(100 - cols * 2) / cols}%`;
      const imgs = m.images
        .filter((x) => isHttpsUrl(x.url))
        .map((x) => {
          const imgStyle: Css = { display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: `${Math.round(r / 2)}px` };
          const cell: Css = { display: 'inline-block', width, margin: '1%', verticalAlign: 'top', textDecoration: 'none' };
          const img = `<img src="${url(x.url)}" alt="" style="${css(imgStyle)}">`;
          return isHttpsUrl(x.link) ? tag('a', cell, img, linkAttrs(x.link)) : tag('i', { ...cell, fontStyle: 'normal' }, img);
        })
        .join('');
      return sectionTitle(ctx, m.title) + imgs;
    }
    case 'tipMenu': {
      const items = m.items.filter((x) => x.label.trim() && x.tokens > 0);
      const sorted = m.sortByPrice ? [...items].sort((x, y) => x.tokens - y.tokens) : items;
      return sectionTitle(ctx, m.title, emo('💎')) + sorted.map((x) => row(ctx, `${ctx.theme.emojis && x.emoji ? `${escapeHtml(x.emoji)} ` : ''}${text(x.label)}`, `${x.tokens} tk`)).join('');
    }
    case 'wishList':
      return sectionTitle(ctx, m.title, emo('🎁')) + m.items.filter((x) => x.label.trim()).map((x) => row(ctx, text(x.label), isHttpsUrl(x.link) ? '→' : '', { link: x.link })).join('');
    case 'schedule': {
      const rows = m.items.filter((x) => x.day.trim()).map((x) => row(ctx, text(x.day), text(x.time))).join('');
      const note = m.note.trim() ? tag('i', { display: 'block', fontStyle: 'normal', fontSize: '13px', color: p.muted, margin: '8px 0 0 0' }, text(m.note)) : '';
      return sectionTitle(ctx, m.title, emo('📅')) + rows + note;
    }
    case 'goal': {
      const pct = m.target > 0 ? Math.max(0, Math.min(100, Math.round((m.current / m.target) * 100))) : 0;
      const bar = tag(
        'b',
        { display: 'block', height: '16px', background: p.cardBg, border: p.cardBorder, borderRadius: '999px', overflow: 'hidden', margin: '10px 0 8px 0', fontSize: '0', lineHeight: '0' },
        tag('b', { display: 'block', height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${a},${b})`, fontSize: '0', lineHeight: '0' }, ZWSP),
      );
      const label = tag('i', { display: 'block', fontStyle: 'normal', fontSize: '14px', color: p.muted }, `${m.current} / ${m.target} ${escapeHtml(m.unit)} · ${pct} %`);
      return sectionTitle(ctx, m.title, emo('🎯')) + (m.text.trim() ? tag('b', { display: 'block', fontWeight: 'normal', fontSize: '15px' }, text(m.text)) : '') + bar + label;
    }
    case 'rules':
      return (
        sectionTitle(ctx, m.title, emo('📜')) +
        m.items
          .filter((x) => x.text.trim())
          .map((x, i) => tag('b', { display: 'block', fontWeight: 'normal', textAlign: 'left', fontSize: '15px', padding: '4px 0', color: p.text }, `${tag('b', { color: p.heading }, m.numbered ? `${i + 1}.` : '•')} ${text(x.text)}`))
          .join('')
      );
    case 'links':
      return (
        sectionTitle(ctx, m.title, emo('🔗')) +
        m.items
          .filter((x) => x.label.trim() && isHttpsUrl(x.url))
          .map((x) =>
            tag(
              'a',
              { display: 'inline-block', padding: '10px 20px', margin: '5px', borderRadius: '999px', background: `linear-gradient(90deg,${a},${b})`, color: '#ffffff', fontWeight: 'bold', textDecoration: 'none', fontSize: '14px' },
              text(x.label),
              linkAttrs(x.url),
            ),
          )
          .join('')
      );
    case 'marquee':
      return `<marquee behavior="scroll" direction="${m.direction === 'right' ? 'right' : 'left'}" scrollamount="${Math.max(1, Math.min(20, Math.round(m.speed)))}" style="${css({ display: 'block', fontSize: '16px', fontWeight: 'bold', color: p.heading })}">${text(m.text) || ZWSP}</marquee>`;
    case 'divider': {
      if (m.style === 'space') return tag('b', { display: 'block', height: '8px', fontSize: '0', lineHeight: '0' }, ZWSP);
      if (m.style === 'line') return tag('b', { display: 'block', height: '2px', width: '60%', margin: '0 auto', background: `linear-gradient(90deg,transparent,${a},${b},transparent)`, fontSize: '0', lineHeight: '0' }, ZWSP);
      const sym = { dots: '•&nbsp;&nbsp;•&nbsp;&nbsp;•', hearts: '♥&nbsp;&nbsp;♥&nbsp;&nbsp;♥', stars: '✦&nbsp;&nbsp;✦&nbsp;&nbsp;✦' }[m.style];
      return tag('b', { display: 'block', color: a, letterSpacing: '4px', fontSize: '14px' }, sym);
    }
  }
}

/** Rendert die komplette Bio als Einzeiler. */
export function renderBio(project: BioProject): string {
  const theme = project.theme;
  const t = getTemplate(theme.preset);
  const a = safeHex(theme.accent, t.accent);
  const b = safeHex(theme.accent2, t.accent2);
  const ctx: Ctx = { theme, a, b, p: t.palette(a, b), font: (FONTS[theme.font] ?? FONTS.sans).css, r: Math.max(0, Math.min(32, Math.round(theme.radius))) };
  const visible = project.modules.filter((m) => !m.hidden);
  const joined = theme.layout === 'joined';

  return visible
    .map((m, i) => {
      const first = i === 0;
      const last = i === visible.length - 1;
      const isDivider = m.type === 'divider';
      const radius = joined ? `${first ? ctx.r : 0}px ${first ? ctx.r : 0}px ${last ? ctx.r : 0}px ${last ? ctx.r : 0}px` : `${ctx.r}px`;
      const style: Css = {
        display: 'block',
        maxWidth: `${MAX_WIDTH}px`,
        margin: joined ? '0 auto 0 auto' : '0 auto 16px auto',
        boxSizing: 'border-box',
        padding: isDivider ? (joined ? '6px 24px' : '4px 24px') : '22px 24px',
        background: isDivider && !joined ? 'transparent' : m.highlight ? `linear-gradient(135deg,${rgba(a, 0.22)},${rgba(b, 0.18)}),${ctx.p.pageBg}` : ctx.p.pageBg,
        color: ctx.p.text,
        fontFamily: ctx.font,
        fontSize: '15px',
        lineHeight: '1.6',
        textAlign: m.align ?? theme.align,
        borderRadius: radius,
        border: m.highlight && !isDivider ? `2px solid ${a}` : undefined,
        wordWrap: 'break-word',
      };
      return tag('p', style, renderInner(m, ctx));
    })
    .join('')
    .replace(/[\r\n]+/g, '');
}

/* ---------- Selbstprüfung der Ausgabe ---------- */

export interface CompatCheck {
  id: string;
  ok: boolean;
  label: string;
  detail?: string;
}

/** Prüft das erzeugte HTML gegen die Chaturbate-Regeln. */
export function checkCompatibility(html: string): CompatCheck[] {
  const tags = [...html.matchAll(/<\/?\s*([a-z0-9-]+)/gi)].map((m) => m[1].toLowerCase());
  const forbidden = [...new Set(tags.filter((t) => !(ALLOWED_TAGS as readonly string[]).includes(t)))];
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0]);
  const badAnchors = anchors.filter((x) => !/target="_blank"/.test(x) || !/rel="nofollow"/.test(x));
  const nonHttps = [...html.matchAll(/\b(?:src|href)="([^"]*)"/gi)].map((m) => m[1]).filter((u) => !/^https:\/\//i.test(u));
  const tagsWithoutStyle = [...html.matchAll(/<(p|b|i|a|strong|em|marquee)\b(?![^>]*style=)[^>]*>/gi)].length;

  return [
    { id: 'tags', ok: forbidden.length === 0, label: 'Nur erlaubte Tags (p, b, strong, i, em, a, img, br, marquee)', detail: forbidden.length ? `Gefunden: ${forbidden.join(', ')}` : undefined },
    { id: 'oneliner', ok: !/[\r\n]/.test(html), label: 'Einzeiler ohne Zeilenumbrüche' },
    { id: 'links', ok: badAnchors.length === 0, label: 'Alle Links mit target="_blank" rel="nofollow"', detail: badAnchors.length ? `${badAnchors.length} Link(s) fehlerhaft` : undefined },
    { id: 'https', ok: nonHttps.length === 0, label: 'Bilder & Links nur über https://', detail: nonHttps.length ? nonHttps.slice(0, 3).join(', ') : undefined },
    { id: 'inline', ok: !/<style|class=|<link/i.test(html) && tagsWithoutStyle === 0, label: '100 % Inline-CSS' },
    { id: 'width', ok: !/max-width:(?!892px|100%)\d/.test(html), label: `Maximale Breite ${MAX_WIDTH}px` },
  ];
}
