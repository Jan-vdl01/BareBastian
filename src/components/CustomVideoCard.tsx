import React from 'react';
import { Wand2, ArrowRight, CheckCircle2, Film } from 'lucide-react';
import { CREATOR_INFO } from '../data/content';

export const CustomVideoCard: React.FC = () => {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <h2 className="font-oswald text-xl sm:text-2xl font-bold text-white uppercase tracking-wider border-l-4 border-purple-500 pl-3 sm:pl-4">
          Custom Content
        </h2>
        <span className="text-xs text-purple-400 font-semibold tracking-wider uppercase hidden sm:inline-flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          <Film className="w-3.5 h-3.5" /> Tailored For You
        </span>
      </div>

      <div className="relative group overflow-hidden bg-gradient-to-br from-purple-950/40 via-[#0d101c] to-[#07090e] border border-purple-500/25 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-neon-purple transition-all duration-300 hover:scale-[1.01]">
        {/* Background Image Layer */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url('${CREATOR_INFO.customVideoBg}')` }}
        ></div>

        {/* Ambient Gradient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider mb-3 w-fit mx-auto md:mx-0">
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Personalized Production</span>
            </div>

            <h3 className="font-oswald text-2xl sm:text-4xl font-bold tracking-wider text-white uppercase mb-2">
              Custom Video
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto md:mx-0">
              Order your custom personalized video. You choose the outfit, actions, script, kinks, and limits. Received directly in full 4K or 1080p.
            </p>

            {/* Checklist */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1.5 pt-4 text-xs text-slate-300 justify-center md:justify-start">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Your exact script</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Fast turnaround</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Name shoutout</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Full discretion</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-center gap-2.5 w-full md:w-auto">
            <a
              href={CREATOR_INFO.onlyFansUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto h-12 sm:h-14 px-7 rounded-xl sm:rounded-2xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 text-sm sm:text-base font-oswald font-bold tracking-wider uppercase shadow-neon-purple hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Request on OnlyFans</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="mailto:contact@bare-bastian.de?subject=Custom%20Video%20Inquiry"
              className="text-xs text-purple-300 hover:text-white underline underline-offset-4 hover:underline-offset-2 transition-all font-medium py-1"
            >
              or inquire via email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
