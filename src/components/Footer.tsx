import React from 'react';
import { Mail, MapPin, Shield, FileText, Sparkles, Heart } from 'lucide-react';
import { CREATOR_INFO } from '../data/content';
import { LegalModalType } from '../types';

interface FooterProps {
  onOpenModal: (type: LegalModalType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenModal }) => {
  return (
    <footer className="relative z-10 w-full bg-[#04060a] border-t border-white/10 pt-12 pb-10 px-4 sm:px-6 mt-12 sm:mt-16">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 text-xs text-slate-400 text-center sm:text-left">
        {/* Address */}
        <div className="flex flex-col gap-2.5 items-center sm:items-start">
          <h4 className="text-white font-oswald font-bold uppercase tracking-widest text-sm sm:border-l-2 border-cyan-500 sm:pl-2.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Address & Legal Notice</span>
          </h4>
          <p className="leading-relaxed font-mono text-[11px] text-slate-300">
            {CREATOR_INFO.address.line1}<br />
            {CREATOR_INFO.address.line2}<br />
            {CREATOR_INFO.address.city}<br />
            {CREATOR_INFO.address.country}
          </p>
        </div>

        {/* Contacts */}
        <div className="flex flex-col gap-2.5 items-center sm:items-start border-t border-white/5 sm:border-none pt-6 sm:pt-0">
          <h4 className="text-white font-oswald font-bold uppercase tracking-widest text-sm sm:border-l-2 border-purple-500 sm:pl-2.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-purple-400" />
            <span>Inquiries & Booking</span>
          </h4>
          <p className="leading-relaxed">
            For business collaborations, custom requests, and press:
          </p>
          <a
            href={`mailto:${CREATOR_INFO.email}`}
            className="text-cyan-400 hover:text-cyan-300 font-semibold tracking-wider transition-colors inline-block text-xs uppercase"
          >
            {CREATOR_INFO.email}
          </a>
        </div>

        {/* Legal & Links */}
        <div className="flex flex-col gap-3 items-center sm:items-start border-t border-white/5 sm:border-none pt-6 sm:pt-0">
          <h4 className="text-white font-oswald font-bold uppercase tracking-widest text-sm sm:border-l-2 border-pink-500 sm:pl-2.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-pink-400" />
            <span>Legal & Privacy</span>
          </h4>
          <div className="flex flex-col gap-2 font-medium tracking-wide uppercase">
            <button
              onClick={() => onOpenModal('newsletter')}
              className="text-slate-400 hover:text-purple-400 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>VIP Newsletter</span>
            </button>
            <button
              onClick={() => onOpenModal('impressum')}
              className="text-slate-400 hover:text-cyan-400 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>Impressum (Legal Notice)</span>
            </button>
            <button
              onClick={() => onOpenModal('privacy')}
              className="text-slate-400 hover:text-cyan-400 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Datenschutz (Privacy Policy)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
        <p>
          &copy; {CREATOR_INFO.copyrightYear} {CREATOR_INFO.name}. All rights reserved.
        </p>
        <div className="flex items-center gap-2">
          <span>Official Creator Link Hub</span>
          <span>•</span>
          <span className="text-slate-400">German Content Creator</span>
        </div>
      </div>
    </footer>
  );
};
