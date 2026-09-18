import React, { useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { CustomVideoCard } from './components/CustomVideoCard';
import { VideoReleasesCarousel } from './components/VideoReleasesCarousel';
import { LiveBroadcasts } from './components/LiveBroadcasts';
import { SupportSection } from './components/SupportSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import { NewsletterModal } from './components/NewsletterModal';
import { ShareModal } from './components/ShareModal';
import { LegalModalType } from './types';
import { Sparkles, Layers, Video, Radio, Heart } from 'lucide-react';

export default function App() {
  const [modalType, setModalType] = useState<LegalModalType>('none');
  const [activeFilter, setActiveFilter] = useState<'all' | 'vip' | 'videos' | 'live' | 'support'>('all');

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative selection:bg-cyan-500 selection:text-white overflow-x-hidden">
      {/* Dynamic Ambient Background Glow Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] bg-rose-600/08 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      {/* Header */}
      <Header
        onOpenModal={(type) => setModalType(type)}
        onScrollToContact={scrollToContact}
      />

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-22 sm:pt-28 pb-10 flex flex-col gap-10 sm:gap-14 flex-grow">
        {/* Navigation Category Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none justify-start sm:justify-center border-b border-white/5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-oswald uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-cyan-500 text-black font-bold shadow-neon-cyan'
                : 'glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Hub</span>
          </button>

          <button
            onClick={() => setActiveFilter('vip')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-oswald uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'vip'
                ? 'bg-cyan-500 text-black font-bold shadow-neon-cyan'
                : 'glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>VIP Access</span>
          </button>

          <button
            onClick={() => setActiveFilter('videos')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-oswald uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'videos'
                ? 'bg-purple-500 text-white font-bold shadow-neon-purple'
                : 'glass-panel text-slate-300 hover:text-white hover:border-purple-500/40'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-purple-400" />
            <span>Releases</span>
          </button>

          <button
            onClick={() => setActiveFilter('live')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-oswald uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'live'
                ? 'bg-rose-500 text-white font-bold shadow-neon-rose'
                : 'glass-panel text-slate-300 hover:text-white hover:border-rose-500/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span>Live Streams</span>
          </button>

          <button
            onClick={() => setActiveFilter('support')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-oswald uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'support'
                ? 'bg-pink-500 text-white font-bold shadow-sm'
                : 'glass-panel text-slate-300 hover:text-white hover:border-pink-500/40'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>Store & Tip</span>
          </button>
        </div>

        {/* SECTION 1: HERO & PREMIUM TIERS */}
        {(activeFilter === 'all' || activeFilter === 'vip') && (
          <HeroSection />
        )}

        {/* SECTION 2: CUSTOM CONTENT */}
        {(activeFilter === 'all' || activeFilter === 'vip' || activeFilter === 'videos') && (
          <CustomVideoCard />
        )}

        {/* SECTION 3: VIDEO RELEASES CAROUSEL */}
        {(activeFilter === 'all' || activeFilter === 'videos') && (
          <VideoReleasesCarousel />
        )}

        {/* SECTION 4: LIVE BROADCASTS */}
        {(activeFilter === 'all' || activeFilter === 'live') && (
          <LiveBroadcasts />
        )}

        {/* SECTION 5: SUPPORT & EXTRAS */}
        {(activeFilter === 'all' || activeFilter === 'support') && (
          <SupportSection />
        )}

        {/* SECTION 6: CONTACT & SOCIALS */}
        <ContactSection onOpenModal={(type) => setModalType(type)} />
      </main>

      {/* Footer */}
      <Footer onOpenModal={(type) => setModalType(type)} />

      {/* MODALS */}
      <LegalModal
        type={modalType}
        onClose={() => setModalType('none')}
        onSwitchType={(t) => setModalType(t)}
      />

      <NewsletterModal
        isOpen={modalType === 'newsletter'}
        onClose={() => setModalType('none')}
        onOpenPrivacy={() => setModalType('privacy')}
      />

      <ShareModal
        isOpen={modalType === 'share'}
        onClose={() => setModalType('none')}
      />
    </div>
  );
}
