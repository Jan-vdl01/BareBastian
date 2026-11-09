/**
 * Erzeugt Chaturbate-kompatibles HTML für das „About Me“-Feld.
 *
 * Plattform-Regeln (vom Sanitizer erzwungen):
 *  - Erlaubte Tags: p, b, strong, i, em, a, img, br, marquee – sonst nichts.
 *  - Jedes Modul = ein <p>-Wrapper (max-width 892px); Boxen über <b>/<i>/<a> mit display:block/inline-block.
 *  - 100 % Inline-CSS, jeder Link mit target="_blank" rel="nofollow".
 *  - Ausgabe als EINZEILER – echte Zeilenumbrüche würden zu sichtbaren <br>.
 */
import { escapeHtml, richText } from './richText';
import { fontCss, getTheme, rgba, safeHex, type ThemeTokens } from './themes';
import type { BioModule, BioProject, BioTheme, BoxStyle } from './types';

export { escapeHtml };
export const ALLOWED_TAGS = ['p', 'b', 'strong', 'i', 'em', 'a', 'img', 'br', 'marquee'] as const;
export const MAX_WIDTH = 892;

const ZWSP = '&#8203;'; // verhindert, dass leere Deko-Elemente entfernt werden

type Css = Record<string, string | number | undefined | false>;

const css = (obj: Css) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== false && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${String(v).replace(/"/g, "'")}`)
    .join(';');

const tag = (name: (typeof ALLOWED_TAGS)[number], style: Css, inner = '', attrs = '') => `<${name}${attrs} style="${css(style)}">${inner}</${name}>`;

/** Einfacher Text: escapen, Zeilenumbrüche → <br>. */
export const text = (value: string) => escapeHtml(value.trim()).replace(/\r\n?|\n/g, '<br>');

export const isHttpsUrl = (url: string | undefined) => !!url && /^https:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(url.trim());
const url = (u: string) => escapeHtml(u.trim());
const linkAttrs = (href: string) => ` href="${url(href)}" target="_blank" rel="nofollow"`;

interface Ctx {
  t: ThemeTokens;
  a: string;
  b: string;
  font: string;
  headingFont: string;
  r: number;
  emojis: boolean;
  /** Fließtext-Stil, der auf alle Text-Container angewendet wird */
  body: Css;
  style: BoxStyle;
}

/* ---------- Kontext pro Modul (Theme + individueller Box-Stil) ---------- */

function moduleCtx(m: BioModule, theme: BioTheme): Ctx {
  const def = getTheme(theme.preset);
  const s = m.style ?? {};
  const a = safeHex(s.accent, safeHex(theme.accent, def.accent));
  const b = safeHex(s.accent2, safeHex(theme.accent2, def.accent2));
  const t = { ...def.tokens(a, b) };
  if (s.textColor && /^#[0-9a-f]{6}$/i.test(s.textColor)) {
    t.text = s.textColor;
    t.muted = rgba(s.textColor, 0.78);
    t.chipText = s.textColor;
  }
  if (s.titleColor && /^#[0-9a-f]{6}$/i.test(s.titleColor)) {
    t.heading = s.titleColor;
    t.headline = s.titleColor;
  }
  const decoration = [s.underline && 'underline', s.strike && 'line-through'].filter(Boolean).join(' ');
  return {
    t,
    a,
    b,
    font: fontCss(s.font ?? theme.font),
    headingFont: fontCss(s.titleFont ?? theme.headingFont ?? def.headingFont),
    r: Math.max(0, Math.min(40, Math.round(s.radius ?? theme.radius))),
    emojis: theme.emojis,
    style: s,
    body: {
      fontWeight: s.bold ? 'bold' : 'normal',
      fontStyle: s.italic ? 'italic' : 'normal',
      textDecoration: decoration || undefined,
      textTransform: s.uppercase ? 'uppercase' : undefined,
    },
  };
}

/* ---------- Bausteine ---------- */

function heading(ctx: Ctx, m: BioModule, emoji = '') {
  const s = ctx.style;
  let out = '';
  if (m.eyebrow?.trim()) {
    out += tag(
      'i',
      {
        display: 'inline-block',
        fontStyle: 'normal',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        color: ctx.t.eyebrowText,
        background: ctx.t.eyebrowBg,
        border: ctx.t.eyebrowBorder,
        borderRadius: '6px',
        padding: '4px 12px',
        margin: '0 0 10px 0',
        fontFamily: ctx.font,
      },
      text(m.eyebrow),
    );
  }
  if (m.title.trim()) {
    const decoration = s.titleUnderline ? 'underline' : undefined;
    out += tag(
      'b',
      {
        display: 'block',
        fontFamily: ctx.headingFont,
        fontSize: `${s.titleSize ?? 24}px`,
        lineHeight: '1.2',
        fontWeight: '800',
        fontStyle: s.titleItalic ? 'italic' : 'normal',
        textDecoration: decoration,
        textTransform: s.titleUppercase ? 'uppercase' : undefined,
        letterSpacing: s.titleUppercase ? '1px' : undefined,
        color: ctx.t.heading,
        margin: '0 0 6px 0',
      },
      `${ctx.emojis && emoji ? `${emoji} ` : ''}${text(m.title)}`,
    );
  }
  if (m.subtitle?.trim()) out += tag('b', { display: 'block', ...ctx.body, fontSize: '14px', color: ctx.t.muted, margin: '0 0 12px 0' }, richText(m.subtitle));
  if (out && !m.subtitle?.trim()) out += tag('b', { display: 'block', height: '8px', fontSize: '0', lineHeight: '0' }, ZWSP);
  return out;
}

const pill = (ctx: Ctx, content: string, extra: Css = {}) =>
  tag('i', { display: 'inline-block', fontStyle: 'normal', fontWeight: 'bold', background: ctx.t.pillBg, color: ctx.t.pillText, borderRadius: '6px', padding: '2px 9px', fontSize: '12px', whiteSpace: 'nowrap', ...extra }, content);

/** Zeile mit rechtsbündigem Wert (Float vor dem Text, damit es im Fluss funktioniert). */
function row(ctx: Ctx, left: string, right: string, opts: { link?: string; strong?: boolean; width?: string; highlight?: boolean } = {}) {
  const rightPart = right ? pill(ctx, right, { float: 'right', marginLeft: '10px' }) : '';
  const box: Css = {
    display: opts.width ? 'inline-block' : 'block',
    width: opts.width,
    boxSizing: 'border-box',
    verticalAlign: 'top',
    ...ctx.body,
    fontWeight: opts.strong ? 'bold' : ctx.body.fontWeight,
    textAlign: 'left',
    padding: '9px 14px',
    margin: opts.width ? '3px' : '0 0 6px 0',
    background: opts.highlight ? `linear-gradient(90deg,${rgba(ctx.b, 0.55)},${rgba(ctx.a, 0.45)})` : ctx.t.innerBg,
    border: opts.highlight ? `1px solid ${ctx.a}` : ctx.t.innerBorder,
    borderRadius: `${Math.round(ctx.r / 2)}px`,
    overflow: 'hidden',
    color: ctx.t.text,
    fontSize: `${ctx.style.fontSize ?? 15}px`,
  };
  return opts.link && isHttpsUrl(opts.link) ? tag('a', { ...box, textDecoration: 'none' }, rightPart + left, linkAttrs(opts.link)) : tag('b', box, rightPart + left);
}

const button = (ctx: Ctx, label: string, href: string, full = true) =>
  tag(
    'a',
    {
      display: full ? 'block' : 'inline-block',
      boxSizing: 'border-box',
      padding: '11px 20px',
      margin: full ? '12px 0 0 0' : '5px',
      borderRadius: `${Math.max(6, Math.round(ctx.r / 2))}px`,
      background: ctx.t.buttonBg,
      color: ctx.t.buttonText,
      boxShadow: ctx.t.buttonShadow,
      fontWeight: 'bold',
      fontSize: '14px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      textAlign: 'center',
      textDecoration: 'none',
      fontFamily: ctx.font,
    },
    `${text(label)} ↗`,
    linkAttrs(href),
  );

const colWidth = (cols: number) => `calc(${(100 / cols).toFixed(3)}% - 12px)`;

/* ---------- Module ---------- */

function renderInner(m: BioModule, ctx: Ctx): string {
  const { t, a, b, r } = ctx;
  const fs = ctx.style.fontSize ?? 15;
  const bodyText = (html: string, extra: Css = {}) => tag('b', { display: 'block', ...ctx.body, fontSize: `${fs}px`, color: t.text, ...extra }, html || ZWSP);
  const muted = (html: string, extra: Css = {}) => tag('i', { display: 'block', ...ctx.body, fontSize: '13px', color: t.muted, margin: '8px 0 0 0', ...extra }, html);
  const emo = (e: string) => (ctx.emojis ? e : '');

  switch (m.type) {
    case 'header': {
      let out = '';
      const nameStyle: Css = {
        display: 'block',
        fontFamily: ctx.headingFont,
        fontSize: `${m.nameSize ?? 46}px`,
        lineHeight: '1.05',
        fontWeight: '900',
        letterSpacing: '4px',
        color: t.headline,
        textShadow: t.headlineShadow,
        textTransform: ctx.style.titleUppercase ? 'uppercase' : undefined,
      };
      if (m.nameOnBanner && isHttpsUrl(m.bannerUrl)) {
        out += tag(
          'b',
          { ...nameStyle, background: `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)),url('${url(m.bannerUrl)}') center/cover no-repeat`, borderRadius: `${r}px`, padding: '70px 16px', margin: '0 0 14px 0', textShadow: `0 4px 24px rgba(0,0,0,0.6), ${t.headlineShadow}` },
          text(m.name || 'Dein Name'),
        );
      } else {
        if (isHttpsUrl(m.bannerUrl)) out += `<img src="${url(m.bannerUrl)}" alt="" style="${css({ display: 'block', width: '100%', maxWidth: '100%', height: 'auto', borderRadius: `${r}px`, margin: '0 0 18px 0' })}">`;
        if (isHttpsUrl(m.avatarUrl))
          out += `<img src="${url(m.avatarUrl)}" alt="" style="${css({ display: 'inline-block', width: '120px', height: '120px', objectFit: 'cover', borderRadius: '50%', border: `3px solid ${a}`, boxShadow: `0 0 24px ${rgba(a, 0.5)}`, margin: '0 0 12px 0' })}">`;
        out += tag('b', nameStyle, text(m.name || 'Dein Name'));
      }
      if (m.eyebrow?.trim()) out = heading(ctx, { ...m, title: '' }) + out;
      if (m.tagline.trim()) out += tag('i', { display: 'block', ...ctx.body, fontSize: `${Math.max(fs, 16)}px`, color: t.muted, margin: '10px 0 0 0' }, richText(m.tagline));
      return out;
    }
    case 'facts': {
      const chips = m.items
        .filter((x) => x.value.trim())
        .map((x) =>
          tag(
            'i',
            { display: 'inline-block', fontStyle: 'normal', background: t.chipBg, border: t.chipBorder, borderRadius: '999px', padding: '5px 14px', margin: '4px', fontSize: `${Math.max(12, fs - 1)}px`, color: t.chipText },
            `${x.label.trim() ? `${tag('b', { color: t.heading, fontWeight: 'bold' }, text(x.label))} ` : ''}${text(x.value)}`,
          ),
        )
        .join('');
      return heading(ctx, m, emo('✨')) + chips;
    }
    case 'text':
      return heading(ctx, m) + bodyText(richText(m.text));
    case 'image': {
      if (!isHttpsUrl(m.url)) return heading(ctx, m);
      const w = Math.max(20, Math.min(100, m.width || 100));
      const img = `<img src="${url(m.url)}" alt="${escapeHtml(m.alt)}" style="${css({ display: 'inline-block', width: `${w}%`, maxWidth: '100%', height: 'auto', borderRadius: `${r}px`, border: t.innerBorder })}">`;
      const linked = isHttpsUrl(m.link) ? tag('a', { display: 'inline-block', width: '100%', textDecoration: 'none' }, img, linkAttrs(m.link)) : img;
      return heading(ctx, m) + linked + (m.caption.trim() ? muted(richText(m.caption)) : '');
    }
    case 'gallery': {
      const width = `${(100 - m.columns * 2) / m.columns}%`;
      const imgs = m.images
        .filter((x) => isHttpsUrl(x.url))
        .map((x) => {
          const img = `<img src="${url(x.url)}" alt="" style="${css({ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: `${Math.round(r / 2)}px`, border: t.innerBorder })}">`;
          const cell: Css = { display: 'inline-block', width, margin: '1%', verticalAlign: 'top', textDecoration: 'none' };
          return isHttpsUrl(x.link) ? tag('a', cell, img, linkAttrs(x.link)) : tag('i', { ...cell, fontStyle: 'normal' }, img);
        })
        .join('');
      return heading(ctx, m) + imgs;
    }
    case 'tipMenu': {
      const items = m.items.filter((x) => x.label.trim() && x.tokens > 0);
      const groups: { cat: string; items: typeof items }[] = [];
      for (const it of items) {
        const cat = it.category?.trim() ?? '';
        const g = groups.find((x) => x.cat === cat);
        if (g) g.items.push(it);
        else groups.push({ cat, items: [it] });
      }
      const cols = m.columns ?? 1;
      const width = cols === 2 ? 'calc(50% - 6px)' : undefined;
      const body = groups
        .map((g) => {
          const list = m.sortByPrice ? [...g.items].sort((x, y) => x.tokens - y.tokens) : g.items;
          const head = g.cat
            ? tag('b', { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: t.eyebrowText, margin: '14px 0 6px 2px' }, text(g.cat))
            : '';
          const rows = list
            .map((x) => row(ctx, `${ctx.emojis && x.emoji ? `${escapeHtml(x.emoji)} ` : ''}${text(x.label)}`, `${x.tokens} TK`, { strong: true, width, highlight: !!m.highlightFrom && x.tokens >= m.highlightFrom }))
            .join('');
          return head + rows;
        })
        .join('');
      return heading(ctx, m, emo('💎')) + body;
    }
    case 'wishList':
      return heading(ctx, m, emo('🎁')) + m.items.filter((x) => x.label.trim()).map((x) => row(ctx, text(x.label), isHttpsUrl(x.link) ? '↗' : '', { link: x.link })).join('');
    case 'schedule':
      return heading(ctx, m, emo('📅')) + m.items.filter((x) => x.day.trim()).map((x) => row(ctx, text(x.day), text(x.time))).join('') + (m.note.trim() ? muted(richText(m.note)) : '');
    case 'goal': {
      const pct = m.target > 0 ? Math.max(0, Math.min(100, Math.round((m.current / m.target) * 100))) : 0;
      const bar = tag(
        'b',
        { display: 'block', height: '16px', background: t.innerBg, border: t.innerBorder, borderRadius: '999px', overflow: 'hidden', margin: '10px 0 8px 0', fontSize: '0', lineHeight: '0' },
        tag('b', { display: 'block', height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${a},${b})`, fontSize: '0', lineHeight: '0' }, ZWSP),
      );
      return heading(ctx, m, emo('🎯')) + (m.text.trim() ? bodyText(richText(m.text)) : '') + bar + muted(`${m.current} / ${m.target} ${escapeHtml(m.unit)} · ${pct} %`, { margin: '0' });
    }
    case 'rules':
      return (
        heading(ctx, m, emo('📜')) +
        m.items
          .filter((x) => x.text.trim())
          .map((x, i) => bodyText(`${tag('b', { color: t.heading, fontWeight: 'bold' }, m.numbered ? `${i + 1}.` : '•')} ${richText(x.text)}`, { textAlign: 'left', padding: '4px 0' }))
          .join('')
      );
    case 'links': {
      const items = m.items.filter((x) => x.label.trim() && isHttpsUrl(x.url));
      const v = m.variant ?? 'pill';
      const body = items
        .map((x) => {
          if (v === 'cta') return button(ctx, x.label, x.url, true);
          const base: Css = { display: 'inline-block', padding: v === 'chips' ? '7px 16px' : '10px 20px', margin: '5px', borderRadius: v === 'chips' ? '8px' : '999px', fontWeight: 'bold', textDecoration: 'none', fontSize: v === 'chips' ? '13px' : '14px', fontFamily: ctx.font };
          const look: Css =
            v === 'chips'
              ? { background: t.chipBg, border: t.chipBorder, color: t.chipText }
              : v === 'outline'
                ? { background: 'transparent', border: `2px solid ${a}`, color: a }
                : { background: t.buttonBg, color: t.buttonText, boxShadow: t.buttonShadow };
          return tag('a', { ...base, ...look }, `${text(x.label)}${v === 'chips' ? '' : ' ↗'}`, linkAttrs(x.url));
        })
        .join('');
      return heading(ctx, m, emo('🔗')) + body;
    }
    case 'marquee':
      return `<marquee behavior="scroll" direction="${m.direction === 'right' ? 'right' : 'left'}" scrollamount="${Math.max(1, Math.min(20, Math.round(m.speed)))}" style="${css({ display: 'block', ...ctx.body, fontWeight: ctx.style.bold === false ? 'normal' : 'bold', fontSize: `${Math.max(fs, 16)}px`, color: t.heading })}">${richText(m.text) || ZWSP}</marquee>`;
    case 'divider': {
      if (m.look === 'space') return tag('b', { display: 'block', height: '8px', fontSize: '0', lineHeight: '0' }, ZWSP);
      if (m.look === 'line') return tag('b', { display: 'block', height: '2px', width: '60%', margin: '0 auto', background: `linear-gradient(90deg,transparent,${a},${b},transparent)`, fontSize: '0', lineHeight: '0' }, ZWSP);
      const sym = { dots: '•&nbsp;&nbsp;•&nbsp;&nbsp;•', hearts: '♥&nbsp;&nbsp;♥&nbsp;&nbsp;♥', stars: '✦&nbsp;&nbsp;✦&nbsp;&nbsp;✦' }[m.look];
      return tag('b', { display: 'block', color: a, letterSpacing: '4px', fontSize: '14px' }, sym);
    }
    case 'ranking': {
      const rows = m.items
        .filter((x) => x.name.trim())
        .map((x, i) => {
          const top = i === 0;
          const label = x.label.trim() ? tag('b', { display: 'block', fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: t.eyebrowText }, text(x.label)) : '';
          const name = tag('b', { display: 'block', fontSize: `${fs + 1}px`, fontWeight: 'bold', color: t.text }, text(x.name));
          const val = x.value.trim() ? pill(ctx, text(x.value), { float: 'right', marginLeft: '10px', background: top ? t.pillBg : t.innerBg, color: top ? t.pillText : t.heading, border: top ? undefined : t.innerBorder }) : '';
          return tag(
            'b',
            {
              display: 'block',
              textAlign: 'left',
              padding: '10px 14px',
              margin: '0 0 8px 0',
              borderRadius: `${Math.round(r / 1.6)}px`,
              background: top ? `linear-gradient(90deg,${rgba(b, 0.35)},${rgba(a, 0.15)})` : t.innerBg,
              border: top ? `1px solid ${a}` : t.innerBorder,
              boxShadow: top ? `0 0 16px ${rgba(a, 0.3)}` : undefined,
              overflow: 'hidden',
            },
            val + label + name,
          );
        })
        .join('');
      return heading(ctx, m, emo('👑')) + rows + (m.footer.trim() ? muted(richText(m.footer), { textAlign: 'center' }) : '');
    }
    case 'features': {
      const cards = m.items
        .filter((x) => x.title.trim() || x.text.trim())
        .map((x, i) =>
          tag(
            'b',
            {
              display: 'inline-block',
              boxSizing: 'border-box',
              width: colWidth(m.columns),
              margin: '6px',
              verticalAlign: 'top',
              textAlign: 'left',
              padding: '14px 16px',
              background: t.innerBg,
              border: t.innerBorder,
              borderLeft: `3px solid ${i % 2 ? b : a}`,
              borderRadius: `${Math.round(r / 1.5)}px`,
              fontWeight: 'normal',
            },
            tag('b', { display: 'block', fontSize: `${fs + 2}px`, fontWeight: 'bold', color: i % 2 ? b : a, margin: '0 0 4px 0', fontFamily: ctx.headingFont }, `${x.emoji ? `${escapeHtml(x.emoji)} ` : ''}${text(x.title)}`) +
              tag('b', { display: 'block', ...ctx.body, fontSize: `${Math.max(12, fs - 2)}px`, color: t.muted }, richText(x.text) || ZWSP),
          ),
        )
        .join('');
      return heading(ctx, m) + cards;
    }
    case 'chips': {
      const chips = m.items
        .filter((x) => x.label.trim())
        .map((x) => {
          const st: Css = { display: 'inline-block', fontStyle: 'normal', fontWeight: 'bold', background: t.chipBg, border: t.chipBorder, color: t.chipText, borderRadius: '999px', padding: '7px 16px', margin: '4px', fontSize: `${Math.max(12, fs - 1)}px`, textDecoration: 'none' };
          const content = `${x.emoji ? `${escapeHtml(x.emoji)} ` : ''}${text(x.label)}${isHttpsUrl(x.link) ? ' ↗' : ''}`;
          return isHttpsUrl(x.link) ? tag('a', st, content, linkAttrs(x.link)) : tag('i', st, content);
        })
        .join('');
      return heading(ctx, m) + chips;
    }
    case 'products': {
      const cards = m.items
        .filter((x) => x.title.trim())
        .map((x) =>
          tag(
            'b',
            {
              display: 'inline-block',
              boxSizing: 'border-box',
              width: colWidth(m.columns),
              margin: '6px',
              verticalAlign: 'top',
              textAlign: 'left',
              padding: '16px',
              background: t.innerBg,
              border: t.innerBorder,
              borderTop: `2px solid ${a}`,
              borderRadius: `${r}px`,
              fontWeight: 'normal',
              overflow: 'hidden',
            },
            (x.badge.trim() ? pill(ctx, text(x.badge), { float: 'right', fontSize: '10px', textTransform: 'uppercase' }) : '') +
              (x.brand.trim() ? tag('b', { display: 'block', fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: t.eyebrowText }, text(x.brand)) : '') +
              tag('b', { display: 'block', fontSize: `${fs + 3}px`, fontWeight: 'bold', color: t.text, margin: '4px 0', fontFamily: ctx.headingFont }, text(x.title)) +
              tag('b', { display: 'block', ...ctx.body, fontSize: `${Math.max(12, fs - 2)}px`, color: t.muted }, richText(x.text) || ZWSP) +
              (isHttpsUrl(x.url) ? button(ctx, x.button || 'Ansehen', x.url) : ''),
          ),
        )
        .join('');
      return heading(ctx, m) + cards;
    }
    case 'levels': {
      const max = Math.max(1, Math.min(12, m.maxLevel || 10));
      const rows = m.items
        .filter((x) => x.label.trim())
        .map((x, i, list) => {
          const lvl = Math.max(0, Math.min(max, Math.round(x.level)));
          const on = Array.from({ length: lvl }, (_, k) => tag('b', { color: k >= max * 0.7 ? b : a, fontWeight: 'bold' }, '■')).join('');
          const off = lvl < max ? tag('b', { color: 'rgba(255,255,255,0.15)', fontWeight: 'bold' }, '■'.repeat(max - lvl)) : '';
          const last = i === list.length - 1;
          return tag(
            'b',
            {
              display: 'block',
              textAlign: 'left',
              padding: '10px 14px',
              margin: '0 0 8px 0',
              background: last ? `linear-gradient(90deg,${rgba(b, 0.3)},${rgba(a, 0.12)})` : t.innerBg,
              border: last ? `1px solid ${b}` : t.innerBorder,
              borderLeft: `3px solid ${last ? b : a}`,
              borderRadius: `${Math.round(r / 2)}px`,
              overflow: 'hidden',
              fontSize: `${fs}px`,
            },
            (x.info.trim() ? tag('i', { float: 'right', fontStyle: 'normal', fontWeight: 'bold', color: a, fontSize: '13px', marginLeft: '10px' }, text(x.info)) : '') +
              tag('b', { fontWeight: 'bold', color: t.text }, text(x.label)) +
              ' ' +
              tag('b', { letterSpacing: '2px', fontSize: '13px' }, on + off),
          );
        })
        .join('');
      const tip = m.tip.trim()
        ? tag('b', { display: 'block', ...ctx.body, textAlign: 'left', padding: '12px 14px', margin: '6px 0 0 0', background: t.innerBg, border: t.innerBorder, borderRadius: `${Math.round(r / 2)}px`, color: t.text, fontSize: `${Math.max(12, fs - 1)}px` }, `💡 ${richText(m.tip)}`)
        : '';
      return heading(ctx, m, emo('⚡')) + rows + tip;
    }
    case 'cards': {
      const cards = m.items
        .filter((x) => x.title.trim())
        .map((x) =>
          tag(
            'b',
            { display: 'inline-block', whiteSpace: 'normal', width: '220px', margin: '0 12px 0 0', verticalAlign: 'top', textAlign: 'left', background: t.innerBg, border: t.innerBorder, borderRadius: `${r}px`, overflow: 'hidden', fontWeight: 'normal' },
            (isHttpsUrl(x.imageUrl) ? `<img src="${url(x.imageUrl)}" alt="" style="${css({ display: 'block', width: '100%', height: '130px', objectFit: 'cover' })}">` : '') +
              tag(
                'b',
                { display: 'block', padding: '12px', fontWeight: 'normal' },
                (x.price.trim() ? pill(ctx, text(x.price), { float: 'right' }) : '') +
                  (x.tag.trim() ? tag('i', { display: 'inline-block', fontStyle: 'normal', fontSize: '11px', fontWeight: 'bold', color: t.eyebrowText }, text(x.tag)) : ZWSP) +
                  tag('b', { display: 'block', fontSize: `${fs}px`, fontWeight: 'bold', color: t.text, margin: '8px 0 0 0' }, text(x.title)) +
                  (isHttpsUrl(x.url) ? button(ctx, x.button || 'Ansehen', x.url) : ''),
              ),
          ),
        )
        .join('');
      const strip = tag('b', { display: 'block', overflowX: 'auto', whiteSpace: 'nowrap', padding: '4px 0 10px 0', textAlign: 'left', fontWeight: 'normal' }, cards || ZWSP);
      return heading(ctx, m, emo('🎬')) + (m.hint.trim() ? muted(richText(m.hint), { margin: '0 0 10px 0', textAlign: 'center' }) : '') + strip;
    }
  }
}

/** Rendert die komplette Bio als Einzeiler. */
export function renderBio(project: BioProject): string {
  const theme = project.theme;
  const joined = theme.layout === 'joined';
  // Leere Module (z. B. Buttons ohne gültigen Link) werden gar nicht ausgegeben.
  const visible = project.modules
    .filter((m) => !m.hidden)
    .map((m) => {
      const ctx = moduleCtx(m, theme);
      return { m, ctx, inner: renderInner(m, ctx) };
    })
    .filter((x) => x.inner.replace(/<[^>]*>|&#8203;/g, '').trim() || /<img |<marquee/.test(x.inner) || x.m.type === 'divider');

  return visible
    .map(({ m, ctx, inner }, i) => {
      const s = ctx.style;
      const first = i === 0;
      const last = i === visible.length - 1;
      const isDivider = m.type === 'divider';
      const radius = joined ? `${first ? ctx.r : 0}px ${first ? ctx.r : 0}px ${last ? ctx.r : 0}px ${last ? ctx.r : 0}px` : `${ctx.r}px`;

      let background: string = ctx.t.boxBg;
      if (s.bgMode === 'solid') background = safeHex(s.bg1, '#1a1a1a');
      else if (s.bgMode === 'gradient') background = `linear-gradient(${Math.round(s.bgAngle ?? 135)}deg,${safeHex(s.bg1, ctx.a)},${safeHex(s.bg2, ctx.b)})`;
      else if (s.bgMode === 'transparent' || (isDivider && !joined && !s.bgMode)) background = 'transparent';
      else if (m.highlight) background = `linear-gradient(135deg,${rgba(ctx.a, 0.22)},${rgba(ctx.b, 0.18)}),${ctx.t.boxBg}`;

      const border: Css = {};
      const bMode = s.borderMode ?? 'theme';
      const bLine = `${Math.max(1, Math.min(8, s.borderWidth ?? 2))}px ${s.borderStyle ?? 'solid'} ${safeHex(s.borderColor, ctx.a)}`;
      if (bMode === 'theme') {
        if (!(isDivider && !joined)) {
          border.border = m.highlight ? `2px solid ${ctx.a}` : ctx.t.boxBorder;
          if (ctx.t.boxBorderTop && !m.highlight) border.borderTop = ctx.t.boxBorderTop;
        }
      } else if (bMode === 'none') border.border = 'none';
      else if (bMode === 'all') border.border = bLine;
      else border[`border${bMode.charAt(0).toUpperCase()}${bMode.slice(1)}`] = bLine;

      const pad = s.padding ?? (isDivider ? 6 : 22);
      const style: Css = {
        display: 'block',
        maxWidth: `${MAX_WIDTH}px`,
        margin: joined ? '0 auto 0 auto' : '0 auto 16px auto',
        boxSizing: 'border-box',
        padding: `${pad}px ${pad + 2}px`,
        background,
        ...border,
        borderRadius: radius,
        boxShadow: s.glow ? `0 0 ${Math.round(s.glow)}px ${safeHex(s.glowColor, ctx.a)}` : isDivider ? undefined : ctx.t.boxShadow,
        color: ctx.t.text,
        fontFamily: ctx.font,
        fontSize: `${s.fontSize ?? 15}px`,
        lineHeight: String(s.lineHeight ?? 1.6),
        letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
        textShadow: s.textShadow ? `0 0 10px ${rgba(ctx.a, 0.7)}` : undefined,
        textAlign: m.align ?? theme.align,
        wordWrap: 'break-word',
        ...ctx.body,
      };
      return tag('p', style, inner);
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
