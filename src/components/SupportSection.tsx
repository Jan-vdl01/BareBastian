import React, { useState } from 'react';
import { Film, Gift, Heart, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SUPPORT_ITEMS } from '../data/content';

export const SupportSection: React.FC = () => {
  const [customTip, setCustomTip] = useState<number | null>(null);

  const triggerTipConfetti = (amount?: number) => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#06b6d4', '#a855f7', '#ec4899', '#f43f5e']
    });

    const url = amount
      ? `${SUPPORT_ITEMS.paypal.url}/${amount}EUR`
      : SUPPORT_ITEMS.paypal.url;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="font-oswald text-xl sm:text-2xl font-bold text-white uppercase tracking-wider border-l-4 border-slate-500 pl-3 sm:pl-4">
          Support & Extras
        </h2>
        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase hidden sm:inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
          <Heart className="w-3.5 h-3.5 text-pink-400" /> Direct Fan Support
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Clips4sale Full Store */}
        <a
          href={SUPPORT_ITEMS.clips4sale.url}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel group relative p-5 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col justify-between hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 border border-white/10 hover:border-cyan-500/40 hover:shadow-neon-cyan"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Film className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                A La Carte
              </span>
            </div>

            <h3 className="font-oswald text-xl font-bold text-white uppercase tracking-wider group-hover:text-cyan-400 transition-colors">
              Clips4sale Store
            </h3>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {SUPPORT_ITEMS.clips4sale.description}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-cyan-400">
            <span>Browse Catalog</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </a>

        {/* Throne Wishlist */}
        <a
          href={SUPPORT_ITEMS.throne.url}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel group relative p-5 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col justify-between hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 border border-white/10 hover:border-purple-500/40 hover:shadow-neon-purple"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Gift className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                100% Private
              </span>
            </div>

            <h3 className="font-oswald text-xl font-bold text-white uppercase tracking-wider group-hover:text-purple-400 transition-colors">
              Throne Wishlist
            </h3>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {SUPPORT_ITEMS.throne.description}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-purple-400">
            <span>Send a Gift</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </a>

        {/* Tip via PayPal with Amount Selector */}
        <div className="glass-panel group relative p-5 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col justify-between border border-white/10 hover:border-pink-500/40 hover:shadow-neon-rose transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[11px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Direct Tip
              </span>
            </div>

            <h3 className="font-oswald text-xl font-bold text-white uppercase tracking-wider group-hover:text-pink-400 transition-colors">
              Tip via PayPal
            </h3>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {SUPPORT_ITEMS.paypal.description}
            </p>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-1.5 mt-3">
              {[5, 15, 30, 50].map((amt) => (
                <button
                  key={amt}
                  onClick={() => triggerTipConfetti(amt)}
                  className="py-1 px-1 rounded-lg bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 text-[11px] font-bold text-slate-200 hover:text-pink-300 transition-all cursor-pointer"
                >
                  €{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <button
              onClick={() => triggerTipConfetti()}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-oswald text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>Send Custom Tip</span>
              <Heart className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
