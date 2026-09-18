import React, { useState } from 'react';
import { X, FileText, Shield, ArrowLeft } from 'lucide-react';
import { LegalModalType } from '../types';

interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
  onSwitchType: (type: LegalModalType) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose, onSwitchType }) => {
  if (type !== 'impressum' && type !== 'privacy') return null;

  const isImpressum = type === 'impressum';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c101a] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#07090e]/70 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchType('impressum')}
              className={`px-3 py-1.5 rounded-lg text-xs font-oswald uppercase tracking-wider transition-all cursor-pointer ${
                isImpressum
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Impressum
            </button>
            <button
              onClick={() => onSwitchType('privacy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-oswald uppercase tracking-wider transition-all cursor-pointer ${
                !isImpressum
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Datenschutzerklärung
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 sm:px-10 py-6 text-sm text-slate-300 leading-relaxed space-y-6">
          {isImpressum ? (
            <div>
              <h1 className="font-oswald text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider mb-6 border-b border-white/10 pb-3">
                Impressum
              </h1>

              <section className="space-y-2">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  Angaben gemäß § 5 TMG
                </h2>
                <p className="text-slate-300">
                  Jan Sebastian van de Logt<br />
                  C/O IP-MANAGEMENT #8862<br />
                  LUDWIG-ERHARD-STRASSE 18<br />
                  20459 HAMBURG<br />
                  DEUTSCHLAND
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  Kontakt
                </h2>
                <p className="text-slate-300">
                  E-Mail:{' '}
                  <a href="mailto:contact@bare-bastian.de" className="text-cyan-400 hover:underline">
                    contact@bare-bastian.de
                  </a>
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  Umsatzsteuer
                </h2>
                <p className="text-slate-300">
                  Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  EU-Streitschlichtung
                </h2>
                <p className="text-slate-300">
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                  <a
                    href="https://ec.europa.eu/consumers/odr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    https://ec.europa.eu/consumers/odr/
                  </a>
                  .<br />
                  Unsere E-Mail-Adresse finden Sie oben im Impressum.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  Verbraucherstreitbeilegung / Universalschlichtungsstelle
                </h2>
                <p className="text-slate-300">
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  Haftung für Inhalte
                </h2>
                <p className="text-slate-300">
                  Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  Haftung für Links
                </h2>
                <p className="text-slate-300">
                  Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">
                  Urheberrecht
                </h2>
                <p className="text-slate-300">
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                </p>
              </section>
            </div>
          ) : (
            <div>
              <h1 className="font-oswald text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider mb-6 border-b border-white/10 pb-3">
                Datenschutzerklärung
              </h1>

              <section className="space-y-2">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-purple-400 uppercase tracking-wide">
                  1. Datenschutz auf einen Blick
                </h2>
                <p className="text-slate-300">
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-purple-400 uppercase tracking-wide">
                  2. Hosting
                </h2>
                <p className="text-slate-300">
                  Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Kontaktdaten und Websitezugriffe handeln.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-purple-400 uppercase tracking-wide">
                  3. Allgemeine Hinweise und Pflichtinformationen
                </h2>
                <p className="text-slate-300 font-semibold text-white">Hinweis zur verantwortlichen Stelle:</p>
                <p className="text-slate-300">
                  Jan Sebastian van de Logt<br />
                  C/O IP-MANAGEMENT #8862<br />
                  LUDWIG-ERHARD-STRASSE 18<br />
                  20459 HAMBURG<br />
                  E-Mail:{' '}
                  <a href="mailto:contact@bare-bastian.de" className="text-purple-400 hover:underline">
                    contact@bare-bastian.de
                  </a>
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-purple-400 uppercase tracking-wide">
                  4. Datenerfassung auf dieser Website
                </h2>
                <p className="text-slate-300">
                  Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt (Browsertyp, Betriebssystem, Referrer URL, Hostname, Uhrzeit, IP-Adresse). Die Erfassung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-purple-400 uppercase tracking-wide">
                  5. Soziale Medien & Externe Links
                </h2>
                <p className="text-slate-300">
                  Auf dieser Website sind Links zu externen Plattformen (z. B. OnlyFans, Twitter/X, Instagram, Telegram, Clips4sale, Throne, PayPal) eingebunden. Dabei handelt es sich nicht um Tracking-Plugins, sondern um reguläre Hyperlinks. Erst wenn Sie auf einen dieser Links klicken, werden Sie auf die Server der jeweiligen Netzwerke weitergeleitet.
                </p>
              </section>

              <section className="space-y-2 pt-3 border-t border-white/5">
                <h2 className="font-oswald text-base sm:text-lg font-bold text-purple-400 uppercase tracking-wide">
                  6. Ihre Rechte (Auskunft, Löschung, Sperrung)
                </h2>
                <p className="text-slate-300">
                  Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-[#07090e]/90 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-400">
            Stand: 2026 | BAREBASTIAN
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
