import React from 'react';
import { Video, PlayCircle, Zap, Radio, ExternalLink } from 'lucide-react';
import { LIVE_PLATFORMS } from '../data/content';

export const LiveBroadcasts: React.FC = () => {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="font-oswald text-xl sm:text-2xl font-bold text-white uppercase tracking-wider border-l-4 border-rose-500 pl-3 sm:pl-4 flex items-center gap-2">
          <span>Live Broadcasts</span>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
        </h2>
        <span className="text-xs text-rose-400 font-semibold tracking-wider uppercase hidden sm:inline-flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
          <Radio className="w-3.5 h-3.5" /> Interactive Cam Shows
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {LIVE_PLATFORMS.map((platform) => {
          const isBrozr = platform.name === 'Brozr';
          const isChaturbate = platform.name === 'Chaturbate';
          const isCam4 = platform.name === 'Cam4';

          return (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel group relative py-5 sm:py-7 px-3 sm:px-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-between text-center transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] border border-white/10 hover:border-rose-500/40 hover:shadow-neon-rose overflow-hidden"
            >
              {/* Badge for new platforms */}
              {platform.badge && (
                <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg transform rotate-2">
                  {platform.badge}
                </span>
              )}

              {/* Icon Container with glowing background on hover */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:bg-rose-500/20 group-hover:border-rose-500/40 transition-all duration-300">
                {isBrozr ? (
                  <Zap className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                ) : isChaturbate ? (
                  <PlayCircle className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                ) : isCam4 ? (
                  <Video className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
                ) : (
                  <Video className="w-6 h-6 text-rose-500 group-hover:scale-110 transition-transform" />
                )}
              </div>

              {/* Title */}
              <div className="flex flex-col items-center gap-1">
                <span className="font-oswald text-base sm:text-lg font-bold tracking-wider uppercase text-white group-hover:text-rose-400 transition-colors">
                  {platform.name}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-2 leading-tight">
                  {platform.description}
                </span>
              </div>

              {/* Tiny Enter Link indicator */}
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-white transition-colors">
                <span>Join Stream</span>
                <ExternalLink className="w-3 h-3 text-rose-400" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
