/** Erzeugt Chaturbate-Bio-Texte (About Me, Wish List, Tip-Menü, Raum-Titel) aus Formulardaten. */

export type BioLanguage = 'de' | 'en' | 'both';
export type BioTone = 'friendly' | 'playful' | 'classy';

export interface TipMenuItem {
  id: string;
  label: string;
  tokens: number;
}

export interface BioInput {
  stageName: string;
  age: string;
  region: string;
  language: BioLanguage;
  tone: BioTone;
  emojis: boolean;
  spokenLanguages: string[];
  interestedIn: string;
  bodyType: string;
  personality: string[];
  hobbies: string;
  schedule: string;
  aboutExtra: string;
  includeRoomRules: boolean;
  tipMenu: TipMenuItem[];
  wishList: string[];
  hashtags: string[];
  goal: string;
}

export interface BioOutput {
  aboutMe: string;
  aboutMeHtml: string;
  wishList: string;
  tipMenu: string;
  roomSubject: string;
  fields: { label: string; value: string }[];
}

export const PERSONALITY_OPTIONS: { id: string; de: string; en: string }[] = [
  { id: 'funny', de: 'humorvoll', en: 'funny' },
  { id: 'chill', de: 'entspannt', en: 'laid-back' },
  { id: 'energetic', de: 'energiegeladen', en: 'energetic' },
  { id: 'talkative', de: 'gesprächig', en: 'talkative' },
  { id: 'shy', de: 'etwas schüchtern', en: 'a little shy' },
  { id: 'confident', de: 'selbstbewusst', en: 'confident' },
  { id: 'creative', de: 'kreativ', en: 'creative' },
  { id: 'sporty', de: 'sportlich', en: 'athletic' },
  { id: 'nerdy', de: 'ein bisschen nerdig', en: 'a bit nerdy' },
  { id: 'romantic', de: 'romantisch', en: 'romantic' },
];

export const LANGUAGE_OPTIONS = ['Deutsch', 'Englisch', 'Niederländisch', 'Französisch', 'Spanisch', 'Italienisch', 'Polnisch', 'Türkisch'];

const LANGUAGE_EN: Record<string, string> = {
  Deutsch: 'German',
  Englisch: 'English',
  Niederländisch: 'Dutch',
  Französisch: 'French',
  Spanisch: 'Spanish',
  Italienisch: 'Italian',
  Polnisch: 'Polish',
  Türkisch: 'Turkish',
};

const joinList = (items: string[], and: string) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Copy {
  greet: Record<BioTone, string>;
  intro: (name: string, age: string, region: string) => string;
  personality: (traits: string) => string;
  hobbies: (h: string) => string;
  schedule: (s: string) => string;
  speaks: (l: string) => string;
  rulesTitle: string;
  rules: string[];
  outro: Record<BioTone, string>;
  and: string;
}

const COPY: Record<'de' | 'en', Copy> = {
  de: {
    greet: {
      friendly: 'Hey und herzlich willkommen in meinem Raum!',
      playful: 'Na, auch hier gelandet? Schön, dass du da bist!',
      classy: 'Willkommen – schön, dass du vorbeischaust.',
    },
    intro: (n, a, r) => `Ich bin ${n}${a ? `, ${a}` : ''}${r ? ` und komme aus ${r}` : ''}.`,
    personality: (t) => `Ich bin ${t} – und genau so erlebst du mich auch im Stream.`,
    hobbies: (h) => `Wenn ich nicht online bin: ${h}.`,
    schedule: (s) => `Live: ${s}`,
    speaks: (l) => `Ich spreche ${l}.`,
    rulesTitle: 'Raumregeln',
    rules: ['Bleib respektvoll – zu mir und allen im Chat.', 'Keine Forderungen, keine Spam-Nachrichten.', 'Keine persönlichen Infos teilen oder erfragen.', 'Hab Spaß und genieß die Show!'],
    outro: {
      friendly: 'Vergiss nicht, mir zu folgen, damit du keinen Stream verpasst!',
      playful: 'Folg mir, sonst verpasst du was – versprochen!',
      classy: 'Folge mir gern, um über neue Streams informiert zu werden.',
    },
    and: 'und',
  },
  en: {
    greet: {
      friendly: 'Hey there and welcome to my room!',
      playful: 'Well, look who found me! Glad you’re here!',
      classy: 'Welcome – lovely to have you here.',
    },
    intro: (n, a, r) => `I’m ${n}${a ? `, ${a}` : ''}${r ? `, from ${r}` : ''}.`,
    personality: (t) => `I’m ${t} – and that’s exactly what you get on stream.`,
    hobbies: (h) => `When I’m offline: ${h}.`,
    schedule: (s) => `Live: ${s}`,
    speaks: (l) => `I speak ${l}.`,
    rulesTitle: 'Room rules',
    rules: ['Be respectful – to me and everyone in chat.', 'No demands, no spam.', 'Don’t share or ask for personal info.', 'Have fun and enjoy the show!'],
    outro: {
      friendly: 'Don’t forget to follow so you never miss a stream!',
      playful: 'Hit follow – you don’t want to miss what’s next!',
      classy: 'Feel free to follow to be notified about new streams.',
    },
    and: 'and',
  },
};

const EMOJI = { greet: '👋', intro: '✨', personality: '💬', hobbies: '🎮', schedule: '📅', speaks: '🌍', rules: '📜', outro: '❤️' };

interface Block {
  kind: 'line' | 'list';
  emoji?: string;
  text?: string;
  title?: string;
  items?: string[];
}

function buildBlocks(input: BioInput, lang: 'de' | 'en'): Block[] {
  const c = COPY[lang];
  const name = input.stageName.trim() || 'Your Name';
  const traits = input.personality
    .map((id) => PERSONALITY_OPTIONS.find((p) => p.id === id)?.[lang])
    .filter((t): t is string => Boolean(t));
  const langs = input.spokenLanguages.map((l) => (lang === 'en' ? LANGUAGE_EN[l] ?? l : l));

  const blocks: Block[] = [
    { kind: 'line', emoji: EMOJI.greet, text: c.greet[input.tone] },
    { kind: 'line', emoji: EMOJI.intro, text: c.intro(name, input.age.trim(), input.region.trim()) },
  ];
  if (traits.length) blocks.push({ kind: 'line', emoji: EMOJI.personality, text: c.personality(joinList(traits, c.and)) });
  if (input.hobbies.trim()) blocks.push({ kind: 'line', emoji: EMOJI.hobbies, text: c.hobbies(input.hobbies.trim()) });
  if (langs.length) blocks.push({ kind: 'line', emoji: EMOJI.speaks, text: c.speaks(joinList(langs, c.and)) });
  if (input.schedule.trim()) blocks.push({ kind: 'line', emoji: EMOJI.schedule, text: c.schedule(input.schedule.trim()) });
  if (input.aboutExtra.trim()) blocks.push({ kind: 'line', text: input.aboutExtra.trim() });
  if (input.includeRoomRules) blocks.push({ kind: 'list', emoji: EMOJI.rules, title: c.rulesTitle, items: c.rules });
  blocks.push({ kind: 'line', emoji: EMOJI.outro, text: c.outro[input.tone] });
  return blocks;
}

function blocksToText(blocks: Block[], emojis: boolean): string {
  return blocks
    .map((b) => {
      const prefix = emojis && b.emoji ? `${b.emoji} ` : '';
      if (b.kind === 'list') return `${prefix}${b.title}:\n${(b.items ?? []).map((i) => `• ${i}`).join('\n')}`;
      return `${prefix}${b.text}`;
    })
    .join('\n\n');
}

function blocksToHtml(blocks: Block[], emojis: boolean): string {
  return blocks
    .map((b) => {
      const prefix = emojis && b.emoji ? `${b.emoji} ` : '';
      if (b.kind === 'list') {
        return `<b>${prefix}${escapeHtml(b.title ?? '')}</b><br>\n${(b.items ?? []).map((i) => `• ${escapeHtml(i)}`).join('<br>\n')}`;
      }
      return `${prefix}${escapeHtml(b.text ?? '')}`;
    })
    .join('<br><br>\n');
}

export function generateBio(input: BioInput): BioOutput {
  const langs: ('de' | 'en')[] = input.language === 'both' ? ['de', 'en'] : [input.language];
  const parts = langs.map((l) => buildBlocks(input, l));
  const divider = '\n\n— — —\n\n';

  const aboutMe = parts.map((p) => blocksToText(p, input.emojis)).join(divider);
  const aboutMeHtml = parts.map((p) => blocksToHtml(p, input.emojis)).join('<br><br>\n<hr>\n');

  const wishList = input.wishList
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => `${input.emojis ? '🎁 ' : '• '}${w}`)
    .join('\n');

  const tipMenu = [...input.tipMenu]
    .filter((t) => t.label.trim() && t.tokens > 0)
    .sort((a, b) => a.tokens - b.tokens)
    .map((t) => `${input.emojis ? '💎 ' : ''}${t.tokens} tk – ${t.label.trim()}`)
    .join('\n');

  const tags = input.hashtags
    .map((t) => t.trim().replace(/^#+/, '').replace(/\s+/g, ''))
    .filter(Boolean)
    .slice(0, 5)
    .map((t) => `#${t.toLowerCase()}`);
  const roomSubject = [input.goal.trim(), tags.join(' ')].filter(Boolean).join(' ');

  const de = input.language !== 'en';
  const fields = [
    { label: de ? 'Anzeigename' : 'Display name', value: input.stageName.trim() },
    { label: de ? 'Alter' : 'Age', value: input.age.trim() },
    { label: de ? 'Region' : 'Location', value: input.region.trim() },
    { label: de ? 'Sprachen' : 'Languages', value: input.spokenLanguages.map((l) => (de ? l : LANGUAGE_EN[l] ?? l)).join(', ') },
    { label: de ? 'Interessiert an' : 'Interested in', value: input.interestedIn.trim() },
    { label: de ? 'Körperbau' : 'Body type', value: input.bodyType.trim() },
  ].filter((f) => f.value);

  return { aboutMe, aboutMeHtml, wishList, tipMenu, roomSubject, fields };
}
