import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { NavTab } from './BottomNav';

interface SplashScreenProps {
  onEnter: (targetTab?: NavTab) => void;
  onOpenVenue?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sd_skip_splash') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDontShowAgain = (checked: boolean) => {
    setDontShowAgain(checked);
    try {
      localStorage.setItem('sd_skip_splash', checked ? 'true' : 'false');
    } catch {
      // ignore
    }
  };

  const handleEnter = (tab: NavTab = 'hub') => {
    try {
      localStorage.setItem('sd_skip_splash', dontShowAgain ? 'true' : 'false');
    } catch {
      // ignore
    }
    onEnter(tab);
  };

  // Keyboard shortcut: Press Enter or Space to proceed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dontShowAgain]);

  return (
    <div className="min-h-screen bg-[#11000b] flex flex-col justify-between p-3 sm:p-4 relative overflow-y-auto selection:bg-[#E5007D] selection:text-white">
      {/* Subtle ambient hot pink glow in background */}
      <div className="absolute top-1/4 -right-12 w-64 h-64 bg-[#E5007D]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-12 w-64 h-64 bg-[#E5007D]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Poster Image Showcase */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto">
        <div 
          onClick={() => handleEnter()}
          className="relative w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl shadow-[#E5007D]/20 border border-white/10 group cursor-pointer transition-transform duration-200 active:scale-[0.99]"
          title="Click to Enter"
        >
          <img
            src="./assets/aistudio/superdrug_portrait_add855b7.jpg"
            alt="Superdrug Supplier Conference 2026 - Grow as One"
            referrerPolicy="no-referrer"
            className="w-full h-auto block select-none"
          />

          {/* Hover highlight overlay */}
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
        </div>
      </div>

      {/* Simple, Bold Enter Action Section */}
      <div className="relative z-10 w-full max-w-sm mx-auto pt-3 pb-2 space-y-2.5">
        <button
          type="button"
          onClick={() => handleEnter()}
          className="w-full py-4 px-6 bg-[#E5007D] hover:bg-[#c9006e] active:scale-[0.98] text-white font-extrabold text-lg tracking-wide rounded-2xl shadow-xl shadow-[#E5007D]/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-white/20 group hover:shadow-2xl hover:shadow-[#E5007D]/50"
        >
          <span>Enter</span>
          <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
        </button>

        {/* Minimal preference controls */}
        <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
          <label className="flex items-center gap-2 cursor-pointer select-none hover:text-neutral-200 transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleToggleDontShowAgain(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-900 text-[#E5007D] focus:ring-[#E5007D] w-3.5 h-3.5 cursor-pointer accent-[#E5007D]"
            />
            <span>Don't show on launch</span>
          </label>

          <span className="text-neutral-500 text-[10px]">
            Superdrug Supplier Conference 2026
          </span>
        </div>
      </div>
    </div>
  );
};
