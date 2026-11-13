import { CREATOR_INFO } from '../data/content';
import {
  GemIcon,
  HeartIcon,
  InstagramIcon,
  MailIcon,
  SparkleIcon,
  TelegramIcon,
  UsersIcon,
  VideoIcon,
  XBrandIcon,
  PlayIcon,
} from './icons';
import type { FaqItem, LinkGroup, NavItem } from './types';

export const PROFILE = {
  name: CREATOR_INFO.name,
  handle: CREATOR_INFO.handle,
  email: CREATOR_INFO.email,
  bio:
    'Content Creator aus Hamburg. Exklusive Inhalte, Live-Streams und persönliche Nachrichten – alle meine Kanäle an einem Ort.',
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Funktionen', href: '#funktionen' },
  { label: 'Preise', href: '#/preise' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Kanäle', href: '#links' },
];

export const LINK_GROUPS: LinkGroup[] = [
  {
    id: 'social',
    title: 'Social Media',
    subtitle: 'Folge mir für News & Updates',
    icon: UsersIcon,
    accent: 'from-cyan-400 to-blue-500',
    links: [
      { id: 'instagram', label: 'Instagram', url: 'https://instagram.com/bare.bastian', description: '@bare.bastian', icon: InstagramIcon },
      { id: 'x', label: 'X (Twitter)', url: 'https://X.com/Bare_Bastian', description: '@Bare_Bastian', icon: XBrandIcon },
      { id: 'telegram', label: 'Telegram', url: 'https://t.me/Bare_Bastian', description: '@Bare_Bastian', icon: TelegramIcon },
      { id: 'mail', label: 'E-Mail', url: `mailto:${CREATOR_INFO.email}`, description: CREATOR_INFO.email, icon: MailIcon },
    ],
  },
  {
    id: 'vip',
    title: 'VIP & Abos',
    subtitle: 'Exklusive Inhalte & Direktnachrichten',
    icon: GemIcon,
    accent: 'from-blue-500 to-indigo-500',
    links: [
      { id: 'onlyfans', label: 'OnlyFans', url: CREATOR_INFO.onlyFansUrl, description: 'Hauptkanal · tägliche Updates', icon: SparkleIcon, badge: 'Top' },
      { id: 'fansly', label: 'Fansly', url: 'https://fansly.com/barebastian', description: 'VIP-Alternative', icon: GemIcon },
      { id: 'telegram-vip', label: 'Telegram VIP', url: 'https://my.subscriby.net/d3d07ba10a', description: 'Instant Telegram Feed', icon: TelegramIcon },
      { id: 'jff', label: 'JustFor.Fans', url: 'https://justfor.fans/BareBastian', description: 'Creator Pass', icon: SparkleIcon },
    ],
  },
  {
    id: 'live',
    title: 'Live-Streams',
    subtitle: 'Interaktiv & in Echtzeit',
    icon: VideoIcon,
    accent: 'from-indigo-500 to-violet-500',
    links: [
      { id: 'xhl', label: 'XHamsterLive', url: 'https://de.xhamsterlive.com/barebastian@xh', description: 'Cam-Chat & Shows', icon: PlayIcon },
      { id: 'cb', label: 'Chaturbate', url: 'https://de.chaturbate.com/p/barebastia', description: 'Public Cams & Tip Goals', icon: PlayIcon },
      { id: 'cam4', label: 'Cam4', url: 'https://de.cam4.eu/bare_bastian', description: 'European Live Broadcasts', icon: PlayIcon },
      { id: 'brozr', label: 'Brozr', url: 'https://brozr.live/@barebastian?ref=c1454db0963e', description: 'Low-Latency Streaming', icon: PlayIcon, badge: 'Neu' },
    ],
  },
  {
    id: 'support',
    title: 'Store & Support',
    subtitle: 'Videos kaufen oder unterstützen',
    icon: HeartIcon,
    accent: 'from-violet-500 to-fuchsia-500',
    links: [
      { id: 'c4s', label: 'Clips4Sale Store', url: 'https://www.clips4sale.com/de/studio/499291/barebastian-store', description: 'Einzelvideos ohne Abo', icon: VideoIcon },
      { id: 'throne', label: 'Throne Wishlist', url: 'https://throne.com/barebastian', description: 'Geschenke mit Privatsphäre', icon: HeartIcon },
      { id: 'paypal', label: 'PayPal Tip', url: 'https://paypal.me/barebastian', description: 'Direkte Unterstützung', icon: HeartIcon },
    ],
  },
];

export const SOCIAL_ICONS = LINK_GROUPS[0].links;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what',
    question: 'Was bekomme ich mit dem Abo?',
    answer:
      'Zugang zum kompletten Abo-Bereich: den Chaturbate-Bio-Designer mit allen Themes, das Finanz-Tool, den Social Hub mit Direktnachrichten und die Bibliothek mit exklusiven Videos, Fotos und Posts.',
  },
  {
    id: 'bio',
    question: 'Funktioniert die Bio wirklich auf Chaturbate?',
    answer:
      'Ja. Chaturbate erlaubt nur wenige HTML-Befehle. Der Designer verwendet ausschließlich diese, prüft dein Ergebnis automatisch und gibt es als Einzeiler aus, den du direkt in dein Profil einfügst.',
  },
  {
    id: 'skills',
    question: 'Brauche ich Vorkenntnisse?',
    answer:
      'Nein. Du wählst ein Theme, fügst Module wie Tip-Menü oder Zeitplan hinzu und trägst deine Texte ein. Alles andere erledigt das Tool.',
  },
  {
    id: 'renew',
    question: 'Verlängert sich das Abo automatisch?',
    answer:
      'Nein. Das Abo läuft genau für die gebuchte Zeit und endet dann von selbst. Wenn du weitermachen möchtest, verlängerst du einfach.',
  },
  {
    id: 'code',
    question: 'Ich habe einen Rabatt- oder Zugangscode. Wo gebe ich ihn ein?',
    answer:
      'Bei der Registrierung oder später bei der Auswahl deines Pakets. Rabattcodes senken den Preis, Zugangscodes schalten den Abo-Bereich sofort frei.',
  },
  {
    id: 'data',
    question: 'Was passiert mit meinen Daten?',
    answer:
      'Deine Daten liegen auf unserem eigenen Server und sind nur für dich sichtbar. Finanzdaten und Bio-Profile kannst du jederzeit exportieren, dein Konto jederzeit löschen.',
  },
  {
    id: 'contact',
    question: 'Wie erreiche ich dich?',
    answer:
      'Über das Kontaktformular unten rechts oder – als Mitglied – direkt per Nachricht im Abo-Bereich.',
  },
];
