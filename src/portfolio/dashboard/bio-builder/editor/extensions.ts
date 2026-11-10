import { Mark, mergeAttributes } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import { TextStyleKit } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    glow: { toggleGlow: (color: string) => ReturnType };
    caps: { toggleCaps: () => ReturnType };
  }
}

/** Leuchtender Text (text-shadow in Wunschfarbe). */
export const Glow = Mark.create({
  name: 'glow',
  addAttributes() {
    return { color: { default: '#ff5a1f', parseHTML: (el) => el.getAttribute('data-glow') } };
  },
  parseHTML() {
    return [{ tag: 'span[data-glow]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const c = HTMLAttributes.color as string;
    return ['span', mergeAttributes({ 'data-glow': c, style: `text-shadow: 0 0 10px ${c}, 0 0 2px ${c}` }), 0];
  },
  addCommands() {
    return { toggleGlow: (color) => ({ commands }) => commands.toggleMark(this.name, { color }) };
  },
});

/** Großbuchstaben. */
export const Caps = Mark.create({
  name: 'caps',
  parseHTML() {
    return [{ tag: 'span[data-caps]' }];
  },
  renderHTML() {
    return ['span', { 'data-caps': '1', style: 'text-transform: uppercase' }, 0];
  },
  addCommands() {
    return { toggleCaps: () => ({ commands }) => commands.toggleMark(this.name) };
  },
});

/** Nur die Funktionen, die das Speicherformat abbilden kann. */
export const editorExtensions = [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: false, protocols: ['https'], HTMLAttributes: { rel: 'nofollow noopener', target: '_blank' } },
  }),
  TextStyleKit.configure({ backgroundColor: false, fontFamily: false, lineHeight: false }),
  Highlight.configure({ multicolor: true }),
  Glow,
  Caps,
];
