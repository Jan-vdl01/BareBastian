import React, { useState } from 'react';
import { Mail, Send, Copy, Check, MessageSquare, ExternalLink, Sparkles, Heart } from 'lucide-react';
import { CREATOR_INFO } from '../data/content';
import { LegalModalType } from '../types';

interface ContactSectionProps {
  onOpenModal: (type: LegalModalType) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onOpenModal }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(CREATOR_INFO.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <section id="contact" className="w-full pt-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="font-oswald text-xl sm:text-2xl font-bold text-white uppercase tracking-wider border-l-4 border-cyan-500 pl-3 sm:pl-4 flex items-center gap-2">
          <span>Direct Contact & Socials</span>
        </h2>
        <span className="text-xs text-cyan-400 font-semibold tracking-wider uppercase hidden sm:inline-flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
          <MessageSquare className="w-3.5 h-3.5" /> 24h Response
        </span>
      </div>

      <div className="glass-panel rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col text-center md:text-left max-w-lg">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">
              Let's Connect
            </span>
            <h3 className="font-oswald text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider mb-2">
              Have Questions or Requests?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Reach out directly via email for custom shoots, brand collaborations, or send a message on Telegram.
            </p>

            {/* Email pill */}
            <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 pl-3 w-fit mx-auto md:mx-0">
              <Mail className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-slate-200">{CREATOR_INFO.email}</span>
              <button
                onClick={copyEmail}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ml-1"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Chat / Social Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 w-full md:w-auto justify-center">
            <a
              href="https://t.me/Bare_Bastian"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl bg-[#24A1DE]/15 hover:bg-[#24A1DE]/30 border border-[#24A1DE]/40 text-[#24A1DE] hover:text-white text-xs font-bold font-oswald uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Telegram Chat</span>
            </a>

            <a
              href="https://instagram.com/bare.bastian"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl bg-pink-500/15 hover:bg-pink-500/30 border border-pink-500/40 text-pink-400 hover:text-white text-xs font-bold font-oswald uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span>Instagram DM</span>
            </a>

            <a
              href="https://X.com/Bare_Bastian"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white text-xs font-bold font-oswald uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X (Twitter) DM</span>
            </a>

            <button
              onClick={() => onOpenModal('newsletter')}
              className="py-3 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold font-oswald uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Join Newsletter</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
