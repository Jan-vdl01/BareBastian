import React, { useState } from 'react';
import { X, Copy, Check, QrCode, Share2, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://bare-bastian.de';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#06b6d4', '#3b82f6', '#10b981']
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const shareViaWeb = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BAREBASTIAN | Official Link Hub',
          text: 'Check out the official creator hub, VIP subscriptions & latest video releases of Barebastian:',
          url: currentUrl
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-[#0d121e] border border-cyan-500/40 rounded-2xl sm:rounded-3xl p-6 shadow-2xl shadow-cyan-950/40 text-center overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-md">
          <Share2 className="w-6 h-6" />
        </div>

        <h2 className="font-oswald text-2xl font-bold text-white uppercase tracking-wider mb-1">
          Share Hub
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Scan QR-code or copy the link to share with friends or add to socials.
        </p>

        {/* QR Code container */}
        <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto mb-5 flex items-center justify-center shadow-lg border border-cyan-400/30">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
              currentUrl
            )}&color=07090e`}
            alt="Hub QR Code"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Copy Link Input & Button */}
        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl p-1.5 mb-4">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="bg-transparent text-xs text-slate-300 px-2 flex-1 outline-none truncate font-mono"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Web Share or Telegram Share */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={shareViaWeb}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Share Sheet</span>
          </button>

          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(
              'BAREBASTIAN Official Link Hub:'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-[#24A1DE]/20 hover:bg-[#24A1DE]/30 border border-[#24A1DE]/40 text-xs font-semibold text-[#24A1DE] flex items-center justify-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </div>
  );
};
