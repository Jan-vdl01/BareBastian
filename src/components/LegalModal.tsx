import type { ReactNode } from 'react';
import { XIcon as X } from '../portfolio/icons';
import type { LegalModalType } from '../types';

/**
 * Impressum, Datenschutzerklärung und Nutzungsbedingungen.
 * ⚠️ Vorlagen – vor dem Livegang bitte rechtlich prüfen lassen (z. B. Anwalt oder Generator wie eRecht24).
 */
interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
  onSwitchType: (type: LegalModalType) => void;
}

const OWNER = (
  <>
    Jan Sebastian van de Logt
    <br />
    C/O IP-MANAGEMENT #8862
    <br />
    Ludwig-Erhard-Straße 18
    <br />
    20459 Hamburg
    <br />
    Deutschland
  </>
);
const MAIL = 'contact@bare-bastian.de';
const MailLink = () => (
  <a href={`mailto:${MAIL}`} className="text-cyan-400 hover:underline">
    {MAIL}
  </a>
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-white/5 pt-4 first-of-type:border-0 first-of-type:pt-0">
      <h2 className="font-oswald text-base font-bold uppercase tracking-wide text-cyan-400 sm:text-lg">{title}</h2>
      <div className="space-y-2 text-slate-300">{children}</div>
    </section>
  );
}

const TABS: { id: Exclude<LegalModalType, 'none'>; label: string }[] = [
  { id: 'impressum', label: 'Impressum' },
  { id: 'privacy', label: 'Datenschutz' },
  { id: 'terms', label: 'Nutzungsbedingungen' },
];

function Impressum() {
  return (
    <>
      <Section title="Angaben gemäß § 5 DDG">
        <p>{OWNER}</p>
      </Section>
      <Section title="Kontakt">
        <p>
          E-Mail: <MailLink />
        </p>
      </Section>
      <Section title="Umsatzsteuer">
        <p>Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.</p>
      </Section>
      <Section title="Verbraucherstreitbeilegung">
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </Section>
      <Section title="Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für Inhalte, die Mitglieder im Abo-Bereich (Social Hub, Chat) veröffentlichen, sind die jeweiligen Mitglieder verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir solche Inhalte umgehend – Hinweise bitte an <MailLink />.
        </p>
      </Section>
      <Section title="Haftung für Links">
        <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.</p>
      </Section>
      <Section title="Urheberrecht">
        <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung.</p>
      </Section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <Section title="1. Verantwortlicher">
        <p>{OWNER}</p>
        <p>
          E-Mail: <MailLink />
        </p>
      </Section>
      <Section title="2. Hosting">
        <p>
          Diese Website läuft auf einem eigenen virtuellen Server (VPS) bei der Hostinger International Ltd. Alle Daten der Website (Konten, Inhalte, Nachrichten, Uploads) werden ausschließlich auf diesem Server gespeichert. Mit dem Hoster besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO.
        </p>
      </Section>
      <Section title="3. Server-Logdateien">
        <p>
          Beim Aufruf der Website verarbeitet der Webserver technisch notwendige Daten (IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Browser-Kennung). Das dient der sicheren Bereitstellung und der Abwehr von Angriffen (Art. 6 Abs. 1 lit. f DSGVO). Die Logdateien werden nach spätestens 14 Tagen gelöscht.
        </p>
      </Section>
      <Section title="4. Cookies und lokaler Speicher">
        <p>
          Wir verwenden ausschließlich ein technisch notwendiges Cookie („bb_sid“), das dich nach dem Anmelden angemeldet hält. Es enthält nur eine zufällige Sitzungskennung und wird beim Abmelden bzw. nach Ablauf gelöscht (höchstens 30 Tage). Zusätzlich speichert dein Browser lokal Einstellungen und Entwürfe (z. B. einen noch nicht veröffentlichten Post). Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG und Art. 6 Abs. 1 lit. b DSGVO. Wir setzen keine Tracking-, Analyse- oder Werbe-Cookies ein und binden keine externen Dienste wie Google Fonts ein.
        </p>
      </Section>
      <Section title="5. Mitgliedskonto">
        <p>
          Für die Registrierung verarbeiten wir E-Mail-Adresse, Anzeigename, Passwort (nur als verschlüsselter Hash gespeichert) sowie die Bestätigung, dass du volljährig bist. Freiwillige Profilangaben (Profilbild, Titelbild, Bio, Ort, Website, Interessen, Social-Media-Namen) sind für andere Mitglieder im Abo-Bereich sichtbar – deine E-Mail-Adresse nie. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag über die Mitgliedschaft).
        </p>
      </Section>
      <Section title="6. Social Hub, Chat und Uploads">
        <p>
          Posts, Kommentare, Likes, Umfrage-Stimmen und hochgeladene Bilder sind je nach gewählter Sichtbarkeit für alle Mitglieder oder nur für deine Follower sichtbar. Chat-Nachrichten sehen nur du und dein Gesprächspartner. Als Betreiber können wir Inhalte zur Durchsetzung der Nutzungsbedingungen einsehen und entfernen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO.
        </p>
      </Section>
      <Section title="7. Persönliche Werkzeuge">
        <p>Daten aus dem Bio-Designer und dem Finanz-Tool werden in deinem Konto auf dem Server gespeichert, damit du sie auf allen Geräten nutzen kannst. Sie sind nur für dich sichtbar.</p>
      </Section>
      <Section title="8. Abo und Zahlung">
        <p>
          Wenn du ein Abo anfragst, verarbeiten wir das gewählte Paket, den Zeitpunkt und die Laufzeit. Zahlungsdaten werden nicht auf dieser Website erfasst, sondern direkt beim jeweiligen Zahlungsanbieter. Rechnungs- und Zahlungsinformationen bewahren wir entsprechend der gesetzlichen Aufbewahrungsfristen (bis zu 10 Jahre, § 147 AO) auf. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und c DSGVO.
        </p>
      </Section>
      <Section title="9. Kontaktformular und E-Mails">
        <p>
          Anfragen über das Kontaktformular (Name, E-Mail, Thema, Nachricht) speichern wir zur Bearbeitung und erhalten eine Benachrichtigung per E-Mail. Für Systemmails (Bestätigung der E-Mail-Adresse, Passwort zurücksetzen, Abo-Informationen) nutzen wir den E-Mail-Dienst unseres Hosters. Anfragen löschen wir, sobald sie erledigt sind und keine Aufbewahrungspflicht besteht. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.
        </p>
      </Section>
      <Section title="10. Externe Links">
        <p>Links zu externen Plattformen (z. B. Instagram, X, Telegram, OnlyFans) sind normale Hyperlinks. Erst beim Anklicken wirst du zur jeweiligen Plattform weitergeleitet, die dann eigene Daten verarbeitet.</p>
      </Section>
      <Section title="11. Speicherdauer">
        <p>Deine Daten speichern wir, solange dein Konto besteht. Löschst du dein Konto (unter „Konto & Abo“), werden Profil, Posts, Kommentare, Likes, Nachrichten, Uploads und persönliche Daten sofort gelöscht; in Sicherungskopien spätestens nach 30 Tagen.</p>
      </Section>
      <Section title="12. Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Unter „Konto & Abo“ kannst du deine Daten jederzeit herunterladen und dein Konto löschen. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. beim Hamburgischen Beauftragten für Datenschutz und Informationsfreiheit.
        </p>
      </Section>
      <Section title="13. Sicherheit">
        <p>Die Übertragung erfolgt verschlüsselt (HTTPS/TLS). Passwörter werden mit scrypt gehasht. Hochgeladene Inhalte sind nur für angemeldete Mitglieder mit Berechtigung abrufbar.</p>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section title="1. Geltungsbereich">
        <p>Diese Bedingungen gelten für die Nutzung des Mitglieder- und Abo-Bereichs von BAREBASTIAN (Anbieter siehe Impressum).</p>
      </Section>
      <Section title="2. Mindestalter">
        <p>Die Registrierung und Nutzung ist nur Personen ab 18 Jahren erlaubt. Mit der Registrierung bestätigst du, volljährig zu sein. Konten Minderjähriger werden gelöscht.</p>
      </Section>
      <Section title="3. Konto">
        <p>Halte deine Zugangsdaten geheim und teile dein Konto nicht mit anderen. Du bist für Aktivitäten unter deinem Konto verantwortlich. Du kannst dein Konto jederzeit unter „Konto & Abo“ löschen.</p>
      </Section>
      <Section title="4. Abo">
        <p>
          Das Abo schaltet den Abo-Bereich für die gebuchte Laufzeit frei. Es wird nach Zahlungseingang aktiviert und verlängert sich <b className="text-white">nicht</b> automatisch – zum Verlängern stellst du einfach eine neue Anfrage. Preise siehe Preisseite.
        </p>
        <p>
          Widerrufsrecht: Als Verbraucher hast du grundsätzlich ein 14-tägiges Widerrufsrecht. Bei digitalen Inhalten erlischt es, wenn wir mit der Bereitstellung beginnen, nachdem du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist beginnen, und du deine Kenntnis vom Verlust des Widerrufsrechts bestätigt hast.
        </p>
      </Section>
      <Section title="5. Exklusive Inhalte">
        <p>Alle Inhalte im Abo-Bereich sind urheberrechtlich geschützt und nur für den privaten Gebrauch bestimmt. Herunterladen, Aufzeichnen, Weitergeben oder Veröffentlichen ist untersagt und führt zur sofortigen Sperrung.</p>
      </Section>
      <Section title="6. Community-Regeln">
        <p>Im Social Hub und im Chat gilt: respektvoller Umgang. Nicht erlaubt sind insbesondere Beleidigungen, Belästigung, Hassrede, Spam, Werbung ohne Erlaubnis, Inhalte mit Minderjährigen, Inhalte ohne Einwilligung der gezeigten Personen sowie Inhalte, die Rechte Dritter oder Gesetze verletzen.</p>
        <p>Du behältst die Rechte an deinen Posts und räumst uns nur die Rechte ein, die zur Anzeige im Abo-Bereich nötig sind. Wir dürfen Inhalte, die gegen diese Regeln verstoßen, entfernen und Konten sperren.</p>
      </Section>
      <Section title="7. Verfügbarkeit">
        <p>Wir bemühen uns um eine durchgehende Erreichbarkeit, können diese aber nicht garantieren (z. B. bei Wartung).</p>
      </Section>
      <Section title="8. Kontakt">
        <p>
          Fragen oder Hinweise auf Verstöße: <MailLink />
        </p>
      </Section>
    </>
  );
}

export function LegalContent({ type }: { type: Exclude<LegalModalType, 'none'> }) {
  const title = TABS.find((t) => t.id === type)?.label ?? '';
  return (
    <div>
      <h1 className="mb-6 border-b border-white/10 pb-3 font-oswald text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">{title === 'Datenschutz' ? 'Datenschutzerklärung' : title}</h1>
      <div className="space-y-4">
        {type === 'impressum' && <Impressum />}
        {type === 'privacy' && <Privacy />}
        {type === 'terms' && <Terms />}
      </div>
    </div>
  );
}

export function LegalModal({ type, onClose, onSwitchType }: LegalModalProps) {
  if (type === 'none') return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Rechtliche Hinweise" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-6">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0c101a] shadow-2xl sm:rounded-3xl">
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#07090e]/70 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSwitchType(t.id)}
                className={`rounded-lg px-3 py-1.5 font-oswald text-xs uppercase tracking-wider transition-all ${type === t.id ? 'border border-cyan-500/40 bg-cyan-500/20 font-bold text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/15 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-6 text-sm leading-relaxed sm:px-10">
          <LegalContent type={type} />
        </div>
        <div className="flex flex-shrink-0 items-center justify-between border-t border-white/10 bg-[#07090e]/90 px-6 py-4">
          <span className="text-xs text-slate-400">Stand: {new Date().getFullYear()} | BAREBASTIAN</span>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white/20">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
