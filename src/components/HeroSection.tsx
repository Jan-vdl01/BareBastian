import React from 'react';
import { Lock, ArrowRight, Gem, Send, Star, ShieldCheck, Sparkles } from 'lucide-react';
import { CREATOR_INFO, SUBSCRIPTION_TIERS } from '../data/content';

export const HeroSection: React.FC = () => {
  return (
    <section className="w-full flex flex-col gap-4 sm:gap-6">
      {/* Featured #1 Card: OnlyFans */}
      <div className="relative group">
        {/* Glow ambient background */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-3xl blur-md sm:blur-xl opacity-50 group-hover:opacity-85 transition duration-500 animate-pulse-slow"></div>

        <a
          href={CREATOR_INFO.onlyFansUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex flex-col lg:flex-row items-center justify-between bg-gradient-to-br from-[#111726] via-[#0d121e] to-[#07090e] border border-cyan-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl transition-all duration-300 hover:scale-[1.01] overflow-hidden"
        >
          {/* Subtle background ambient graphic */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Left Text / Info Column */}
          <div className="flex flex-col gap-3 text-center lg:text-left z-10 w-full lg:max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 text-xs font-semibold tracking-wider uppercase w-fit mx-auto lg:mx-0 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              #1 EXCLUSIVE PLATFORM
            </div>

            <h1 className="font-oswald text-4xl sm:text-6xl font-bold tracking-wider text-white uppercase drop-shadow-md flex items-center justify-center lg:justify-start gap-3">
              <Lock className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-400 flex-shrink-0" />
              <span>OnlyFans</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
              Unlock full uncensored access, private streams, direct daily 1-on-1 messaging, and exclusive member discounts.
            </p>

            {/* Perks Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Daily Messaging
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Full HD & 4K Vault
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> Free Clips Included
              </span>
            </div>
          </div>

          {/* Right Visual / Button Column */}
          <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full lg:w-auto mt-6 lg:mt-0 justify-center lg:justify-end">
            {/* Image Preview Frames */}
            <div className="flex gap-2.5 sm:gap-3 h-32 sm:h-44 flex-shrink-0">
              {CREATOR_INFO.heroImages.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="w-24 sm:w-32 h-full cyber-image-frame overflow-hidden bg-slate-900 border border-white/15 relative group/img shadow-lg"
                >
                  <img
                    src={imgSrc}
                    alt={`OnlyFans Preview ${idx + 1}`}
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
              ))}
            </div>

            {/* Large Call-To-Action Button */}
            <div className="w-full sm:w-auto h-13 sm:h-16 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center gap-2 text-base sm:text-lg font-oswald font-bold tracking-widest uppercase shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all flex-shrink-0 cursor-pointer">
              <span>Subscribe Now</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </a>
      </div>

      {/* 3 Secondary Subscription Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const isTelegram = tier.name.includes('Telegram');
          const isFansly = tier.name.includes('Fansly');

          return (
            <a
              key={tier.name}
              href={tier.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel group relative overflow-hidden py-4 px-5 rounded-xl sm:rounded-2xl flex items-center justify-between hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 shadow-glass"
            >
              <div className="flex items-center gap-3.5 z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 ${tier.color}`}>
                  {isFansly && <Gem className="w-5 h-5" />}
                  {isTelegram && <Send className="w-5 h-5" />}
                  {!isFansly && !isTelegram && <Star className="w-5 h-5" />}
                </div>

                <div className="flex flex-col text-left">
                  <span className="font-oswald text-lg sm:text-xl font-bold tracking-wider text-white uppercase group-hover:text-cyan-400 transition-colors">
                    {tier.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {tier.highlightText}
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
