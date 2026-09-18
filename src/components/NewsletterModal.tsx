import React, { useState } from 'react';
import { Mail, CheckCircle2, ShieldCheck, Sparkles, X, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy: () => void;
}

export const NewsletterModal: React.FC<NewsletterModalProps> = ({
  isOpen,
  onClose,
  onOpenPrivacy,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    if (!agreed) {
      setError('Bitte stimme der Datenschutzerklärung zu.');
      return;
    }

    setError('');
    setSubmitted(true);

    // Confetti effect
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#a855f7', '#ec4899']
    });

    // Store in localStorage for user session
    try {
      localStorage.setItem('barebastian_newsletter_subscribed', 'true');
      localStorage.setItem('barebastian_newsletter_email', email);
    } catch {
      // Ignore localStorage errors in sandbox
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0d121e] border border-purple-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-900/30 overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-oswald text-2xl font-bold text-white uppercase tracking-wider mb-2">
              Willkommen im VIP-Verteiler!
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mb-6">
              Danke für deine Anmeldung ({email}). Du erhältst ab sofort exklusive Ankündigungen für neue Releases, Livestreams & Aktionen.
            </p>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-oswald text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-neon-cyan"
            >
              Fertig
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">VIP Insider List</span>
            </div>

            <h2 className="font-oswald text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider mb-2">
              Stay Updated
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
              Trag dich ein für exklusive Updates, Secret Releases, Livestream-Benachrichtigungen und Sonderaktionen direkt in dein Postfach. Kein Spam, garantiert.
            </p>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  E-Mail-Adresse <span className="text-purple-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              {/* DSGVO Checkbox */}
              <div className="flex items-start gap-2.5 text-left pt-1">
                <input
                  type="checkbox"
                  id="dsgvo-consent"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded bg-black/40 border-white/20 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-500"
                />
                <label htmlFor="dsgvo-consent" className="text-[11px] text-slate-400 leading-snug cursor-pointer">
                  Ich stimme zu, dass meine Daten zur Bearbeitung meiner Anfrage gespeichert werden. Weitere Infos findest du in der{' '}
                  <button
                    type="button"
                    onClick={onOpenPrivacy}
                    className="text-cyan-400 hover:underline inline font-medium"
                  >
                    Datenschutzerklärung
                  </button>
                  . *
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-oswald text-base font-bold uppercase tracking-wider shadow-neon-purple active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Jetzt eintragen</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
