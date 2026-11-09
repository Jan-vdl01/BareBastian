/**
 * Regelprüfung für Chaturbate-Bios.
 *
 * ⚠️ Diese Liste basiert auf bekannten Plattformregeln (u. a. keine Werbung für andere
 * Cam-Seiten, keine Zahlungen außerhalb der Plattform, keine Treffen, nichts mit Bezug
 * zu Minderjährigen). Chaturbate ändert seine Richtlinien gelegentlich – bitte regelmäßig
 * mit den offiziellen Terms & Broadcaster-Regeln abgleichen und hier anpassen.
 */

export type RuleSeverity = 'error' | 'warning';

export interface BioRule {
  id: string;
  severity: RuleSeverity;
  title: string;
  hint: string;
  patterns: RegExp[];
}

const words = (list: string[]) => new RegExp(`(?:^|[^\\p{L}\\d])(${list.join('|')})(?=$|[^\\p{L}\\d])`, 'giu');

export const BIO_RULES: BioRule[] = [
  {
    id: 'competitor-cams',
    severity: 'error',
    title: 'Keine Werbung für andere Cam-Seiten',
    hint: 'Erwähne oder verlinke keine konkurrierenden Webcam-Plattformen.',
    patterns: [
      words([
        'stripchat', 'bongacams', 'myfreecams', 'mfc', 'livejasmin', 'camsoda', 'cam4', 'xhamsterlive', 'xhamster live',
        'flirt4free', 'streamate', 'imlive', 'jerkmate', 'camcontacts', 'brozr', 'cherry\\.tv', 'skyprivate', 'camplace',
      ]),
    ],
  },
  {
    id: 'offsite-payment',
    severity: 'error',
    title: 'Keine Zahlungen außerhalb der Plattform',
    hint: 'Trinkgeld & Käufe sollten über Chaturbate-Tokens laufen – keine PayPal-, Bank- oder Krypto-Hinweise.',
    patterns: [
      words([
        'paypal', 'paypal\\.me', 'venmo', 'cash ?app', 'cashapp', 'revolut', 'iban', 'überweisung', 'bank ?transfer',
        'bitcoin', 'btc', 'crypto', 'krypto', 'ethereum', 'usdt', 'western union', 'gift ?card', 'gutschein', 'zelle', 'skrill', 'paysafecard',
      ]),
    ],
  },
  {
    id: 'meetups',
    severity: 'error',
    title: 'Keine Angebote für persönliche Treffen',
    hint: 'Treffen, Escort- oder Dating-Angebote sind nicht erlaubt.',
    patterns: [
      words([
        'escort', '(?:privates?|reales?|echtes?|persönliches?) treffen', 'treffen wir uns', 'lass uns treffen', 'real ?meet', 'meet ?up', 'meet in person', 'persönlich kennenlernen', 'date mit mir', 'date me',
        'hotelbesuch', 'hausbesuch', 'outcall', 'incall', 'sugar ?daddy', 'sex gegen geld',
      ]),
    ],
  },
  {
    id: 'minors',
    severity: 'error',
    title: 'Kein Bezug zu Minderjährigen',
    hint: 'Begriffe, die Minderjährigkeit andeuten, sind strikt verboten – auch als Rollenspiel.',
    patterns: [
      words([
        'minderjährig\\w*', 'underage', 'under ?18', 'unter 18', 'schoolgirl', 'schoolboy', 'schulmädchen', 'schuljunge', 'schüler\\w*',
        'jailbait', 'loli\\w*', 'shota', 'kinder', 'kindlich\\w*', 'child\\w*', 'kid', 'kids', 'barely legal', 'pre-?teen', 'jugendlich\\w*',
      ]),
    ],
  },
  {
    id: 'prohibited-content',
    severity: 'error',
    title: 'Keine verbotenen Inhalte',
    hint: 'Keine Hinweise auf Gewalt ohne Einvernehmen, Inzest, Tiere, Drogen oder Ähnliches.',
    patterns: [
      words([
        'inzest', 'incest', 'rape', 'vergewaltig\\w*', 'non-?consent', 'bestiality', 'zoophil\\w*', 'drugs', 'drogen',
        'cocaine', 'kokain', 'koks', 'meth', 'crystal meth', 'blackout', 'bewusstlos', 'snuff',
      ]),
    ],
  },
  {
    id: 'contact-info',
    severity: 'warning',
    title: 'Keine privaten Kontaktdaten',
    hint: 'Telefonnummern, E-Mail-Adressen und Messenger-Kontakte gehören nicht in die Bio (Privatsphäre & Plattformregeln).',
    patterns: [
      /(?:\+|00)\d[\d\s/-]{7,}\d/g,
      /\b0\d{2,4}[\s/-]?\d{4,}\b/g,
      /[\w.+-]+@[\w-]+\.[\w.]{2,}/g,
      words(['whatsapp', 'snapchat', 'kik', 'signal messenger', 'telegram', 'wickr', 'threema', 'skype', 'discord']),
    ],
  },
  {
    id: 'subscription-sites',
    severity: 'warning',
    title: 'Links zu Abo-Seiten prüfen',
    hint: 'Ob Hinweise auf OnlyFans, Fansly & Co. erlaubt sind, hat sich mehrfach geändert – aktuelle Regeln prüfen.',
    patterns: [words(['onlyfans', 'only fans', 'fansly', 'justfor\\.fans', 'justforfans', 'manyvids', 'clips4sale', 'c4s', 'patreon', 'fanvue'])],
  },
  {
    id: 'urls',
    severity: 'warning',
    title: 'Externe Links prüfen',
    hint: 'Externe Links nur zu erlaubten Zielen (z. B. eigene Social-Media-Profile oder Wunschliste).',
    patterns: [/\bhttps?:\/\/\S+/gi, /\bwww\.\S+/gi, /\b[\w-]+\.(?:com|de|net|org|tv|me|io|live|fans|cam)\b/gi],
  },
  {
    id: 'location-privacy',
    severity: 'warning',
    title: 'Keine genaue Adresse',
    hint: 'Gib höchstens Land oder Region an – keine Straße, Postleitzahl oder Stadtteil.',
    patterns: [/\b\d{5}\b/g, words(['straße', 'strasse', 'str\\.', 'weg \\d+', 'platz \\d+', 'allee'])],
  },
  {
    id: 'ambiguous-age',
    severity: 'warning',
    title: 'Missverständliche Altersbegriffe',
    hint: 'Begriffe wie „teen“ werden oft als Hinweis auf Minderjährige gewertet – besser vermeiden.',
    patterns: [words(['teen', 'teens', 'teenie', 'young boy', 'young girl', 'little boy', 'little girl', 'boy toy'])],
  },
];

export interface RuleResult {
  rule: BioRule;
  matches: string[];
}

export function checkBio(text: string): RuleResult[] {
  return BIO_RULES.map((rule) => {
    const found = new Set<string>();
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))) {
        found.add((m[1] ?? m[0]).trim());
      }
    }
    return { rule, matches: [...found] };
  });
}
