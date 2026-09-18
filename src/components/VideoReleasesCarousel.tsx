import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, ExternalLink, Unlock, Sparkles, Film } from 'lucide-react';
import { VIDEO_RELEASES, CREATOR_INFO } from '../data/content';
import { VideoRelease } from '../types';

export const VideoReleasesCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoRelease | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Determine items per view based on window width
  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, VIDEO_RELEASES.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  // Autoplay
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 4500);
    return () => clearInterval(interval);
  }, [isPaused, maxIndex]);

  // Touch handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    touchStartX.current = null;
  };

  return (
    <section className="w-full relative pt-2">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 border-l-4 border-cyan-500 pl-3 sm:pl-4">
        <div>
          <h2 className="font-oswald text-xl sm:text-2xl font-bold tracking-widest text-white uppercase flex items-center gap-2">
            <span>Latest Releases</span>
            <span className="text-xs font-sans font-normal text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
              Clips & Highlights
            </span>
          </h2>
        </div>

        {/* Banner: In OnlyFans Abo Included */}
        <a
          href={CREATOR_INFO.onlyFansUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 border border-cyan-500/40 w-fit hover:border-cyan-400 transition-all shadow-sm"
        >
          <Unlock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Alle Videos im <span className="text-cyan-400 font-extrabold underline underline-offset-2">OnlyFans</span> Abo inklusive
          </span>
        </a>
      </div>

      {/* Carousel Container */}
      <div
        className="relative overflow-hidden glass-panel rounded-2xl p-2 sm:p-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          aria-label="Previous Slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md hover:bg-cyan-500 hover:border-cyan-400 hover:scale-110 active:scale-95 transition-all shadow-xl cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={nextSlide}
          aria-label="Next Slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md hover:bg-cyan-500 hover:border-cyan-400 hover:scale-110 active:scale-95 transition-all shadow-xl cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Carousel Track */}
        <div className="overflow-hidden w-full">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
            }}
          >
            {VIDEO_RELEASES.map((video) => (
              <div
                key={video.id}
                style={{ width: `${100 / itemsPerView}%` }}
                className="flex-shrink-0 px-1.5 sm:px-2.5"
              >
                <div className="group/item flex flex-col h-full bg-[#0a0e17]/80 border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/50 hover:shadow-neon-cyan transition-all duration-300">
                  {/* Thumbnail area with play overlay */}
                  <div
                    onClick={() => setSelectedVideo(video)}
                    className="relative aspect-[16/10] sm:aspect-video w-full overflow-hidden cursor-pointer bg-slate-900"
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-108"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                    {/* Duration Badge */}
                    {video.duration && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
                        {video.duration}
                      </span>
                    )}

                    {/* Category Pill */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
                      {video.category}
                    </span>

                    {/* Play Button Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-cyan-500/30 border border-cyan-400/60 backdrop-blur-md flex items-center justify-center group-hover/item:scale-115 group-hover/item:bg-cyan-500 transition-all shadow-lg">
                        <Play className="w-5 h-5 sm:w-7 sm:h-7 text-white fill-current ml-0.5 sm:ml-1" />
                      </div>
                    </div>
                  </div>

                  {/* Video Meta & Actions */}
                  <div className="p-3 sm:p-4 flex flex-col justify-between flex-grow gap-2.5">
                    <div>
                      <h3
                        onClick={() => setSelectedVideo(video)}
                        className="font-oswald text-base sm:text-lg font-bold text-white uppercase tracking-wide line-clamp-2 hover:text-cyan-400 cursor-pointer transition-colors"
                        title={video.title}
                      >
                        {video.title}
                      </h3>

                      {/* Tag chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {video.tags?.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Link button */}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 px-3 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/10 text-xs font-semibold text-slate-200 hover:text-cyan-300 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Buy on Clips4sale</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Indicators / Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === idx
                  ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Video Details Modal / Lightbox */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0d121e] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>

            {/* Thumbnail Preview */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
              <img
                src={selectedVideo.thumbnail}
                alt={selectedVideo.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-cyan-500 text-black text-xs font-bold uppercase tracking-wider">
                    {selectedVideo.category}
                  </span>
                  {selectedVideo.duration && (
                    <span className="px-2 py-1 rounded bg-black/80 text-xs font-mono text-slate-200 border border-white/15">
                      {selectedVideo.duration}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Title & Info */}
            <div>
              <h3 className="font-oswald text-xl sm:text-2xl font-bold text-white uppercase tracking-wide mb-2">
                {selectedVideo.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Available as an instant full-quality download on Clips4sale, or stream without additional fees as an active OnlyFans VIP subscriber.
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedVideo.tags?.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={selectedVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-oswald font-bold uppercase tracking-wider text-center text-sm flex items-center justify-center gap-2 shadow-neon-cyan transition-all"
              >
                <span>Buy & Download (Clips4sale)</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <a
                href={CREATOR_INFO.onlyFansUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-oswald font-bold uppercase tracking-wider text-center text-sm flex items-center justify-center gap-2 shadow-neon-purple transition-all"
              >
                <span>Watch on OnlyFans (Included)</span>
                <Unlock className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
