import React from 'react';
import { Send, Share2, Mail, ExternalLink, Sparkles, MessageSquare } from 'lucide-react';
import { CREATOR_INFO, SOCIAL_LINKS } from '../data/content';
import { LegalModalType } from '../types';

interface HeaderProps {
  onOpenModal: (type: LegalModalType) => void;
  onScrollToContact: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenModal, onScrollToContact }) => {
  return (
    <header
      id="main-header"
      className="fixed top-0 left-0 w-full z-50 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#07090e]/85 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left Side: Brand Name & Online Status */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <a
            href="#"
            className="group flex items-center gap-2 font-oswald text-xl sm:text-2xl font-bold tracking-[0.15em] sm:tracking-[0.2em] text-white hover:text-cyan-400 transition-colors uppercase"
          >
            <span>{CREATOR_INFO.name}</span>
            <span className="hidden md:inline-block text-[10px] tracking-normal font-sans font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              OFFICIAL HUB
            </span>
          </a>

          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>ACTIVE DAILY</span>
          </div>
        </div>

        {/* Center/Right: Quick Socials & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Social Icons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Instagram */}
            <a
              href="https://instagram.com/bare.bastian"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @bare.bastian"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-500/50 hover:scale-105 transition-all"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            {/* X (Twitter) */}
            <a
              href="https://X.com/Bare_Bastian"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter) @Bare_Bastian"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-500/50 hover:scale-105 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/Bare_Bastian"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram @Bare_Bastian"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center text-[#24A1DE] hover:text-white hover:border-cyan-500/50 hover:scale-105 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-0.5 hidden sm:block"></div>

          {/* Share / QR Code Button */}
          <button
            onClick={() => onOpenModal('share')}
            title="Share & QR Code"
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg glass-panel text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Share</span>
          </button>

          {/* Newsletter Button */}
          <button
            onClick={() => onOpenModal('newsletter')}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg glass-panel text-slate-300 hover:text-purple-300 hover:border-purple-500/50 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>VIP Updates</span>
          </button>

          {/* Contact Scroll / Action */}
          <button
            onClick={onScrollToContact}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contact</span>
          </button>
        </div>
      </div>
    </header>
  );
};
