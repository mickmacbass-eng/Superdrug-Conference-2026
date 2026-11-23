import React from 'react';
import { Session } from '../data/conferenceData';
import { NavTab } from './BottomNav';
import { useBrand } from '../config/BrandContext';
import { MapPin, Radio, Clock, QrCode } from 'lucide-react';
import { EventFeedback } from './EventFeedback';
import { ConferenceCountdown } from './ConferenceCountdown';

interface HubViewProps {
  currentLiveSession?: Session;
  onNavigateTab: (tab: NavTab) => void;
  onOpenVenueModal: () => void;
  onOpenSessionModal: (session: Session) => void;
  onOpenQRCode?: () => void;
}

export const HubView: React.FC<HubViewProps> = ({
  currentLiveSession,
  onNavigateTab,
  onOpenVenueModal,
  onOpenSessionModal,
  onOpenQRCode,
}) => {
  const { config } = useBrand();

  return (
    <div className="space-y-6 pb-4">
      {/* Hero Welcome Card */}
      <section className="bg-black text-white rounded-3xl p-6 relative overflow-hidden shadow-md">
        {/* Subtle decorative brand geometry */}
        <div
          className="absolute -right-8 -top-8 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-20"
          style={{ backgroundColor: config.colors.primaryAccent }}
        />
        <div
          className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-xl pointer-events-none opacity-10"
          style={{ backgroundColor: config.colors.primaryAccent }}
        />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest text-brand uppercase">
              Official Portal
            </span>
            <span className="text-[11px] font-medium text-neutral-300">
              {config.venue}
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-brand tracking-wide mb-1">
              {config.date}
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-tight">
              {config.tagline || 'Partnering for Retail Growth & Disruption'}
            </h1>
            <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
              {config.eventName} · Uniting brand partners, healthcare innovators, and retail leadership to accelerate high street volume and customer loyalty.
            </p>
          </div>

          {/* Key Conference KPIs (tabular nums) */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800">
            <div>
              <div className="text-lg font-extrabold text-white tabular-nums">350+</div>
              <div className="text-[10px] text-neutral-400 font-medium">Brand Partners</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-[#E5007D] tabular-nums">9</div>
              <div className="text-[10px] text-neutral-400 font-medium">Stage Sessions</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-white tabular-nums">15 Oct</div>
              <div className="text-[10px] text-neutral-400 font-medium">The Brewery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Conference Countdown Banner (15 Oct 2026 · 08:30 BST) */}
      <ConferenceCountdown
        onOpenRunningOrder={() => onNavigateTab('running-order')}
      />

      {/* Happening Right Now Spotlight */}
      {currentLiveSession && (
        <section className="bg-white border-2 border-neutral-200 rounded-3xl p-5 shadow-sm space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
              </span>
              <span className="text-[11px] font-bold text-brand tracking-wider uppercase">
                Happening Right Now
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-black tabular-nums">
              {currentLiveSession.time} - {currentLiveSession.endTime}
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-black leading-snug">
              {currentLiveSession.title}
            </h2>
            <div className="text-xs text-neutral-600 mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-black">{currentLiveSession.stage}</span>
              <span className="text-neutral-400">·</span>
              <span>{currentLiveSession.speakers.map(s => s.name).join(', ')}</span>
            </div>
          </div>

          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
            {currentLiveSession.description}
          </p>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('interactions')}
              className="flex-1 bg-brand text-white text-xs font-semibold py-2.5 px-4 rounded-full shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 tap-highlight"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Ask Speaker / Live Poll</span>
            </button>
            <button
              onClick={() => onOpenSessionModal(currentLiveSession)}
              className="border border-neutral-300 text-black text-xs font-semibold py-2.5 px-3.5 rounded-full hover:bg-neutral-50 active:scale-95 transition-all"
            >
              Details
            </button>
          </div>
        </section>
      )}



      {/* Quick Launchpad Strip */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
          Quick Access
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigateTab('running-order')}
            className="flex flex-col text-left p-4 rounded-2xl border border-neutral-200 bg-white hover:border-black active:scale-[0.98] transition-all group tap-highlight"
          >
            <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center mb-3 group-hover:bg-black transition-colors">
              <Clock className="w-4 h-4 text-brand" />
            </div>
            <span className="text-sm font-bold text-black">Running Order</span>
            <span className="text-[11px] text-neutral-500 mt-0.5">Full schedule &amp; saved sessions</span>
          </button>

          <button
            onClick={onOpenVenueModal}
            className="flex flex-col text-left p-4 rounded-2xl border border-neutral-200 bg-white hover:border-black active:scale-[0.98] transition-all group tap-highlight"
          >
            <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center mb-3 group-hover:bg-black transition-colors">
              <MapPin className="w-4 h-4 text-brand" />
            </div>
            <span className="text-sm font-bold text-black">{config.venue} Map</span>
            <span className="text-[11px] text-neutral-500 mt-0.5">Floor plan &amp; breakout zones</span>
          </button>
        </div>

        {/* Featured Conference Web App QR Code Card */}
        {onOpenQRCode && (
          <button
            onClick={onOpenQRCode}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-neutral-200 bg-gradient-to-r from-neutral-900 to-black text-white hover:border-[#E5007D] active:scale-[0.99] transition-all group tap-highlight shadow-sm text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm relative">
                <QrCode className="w-full h-full text-black" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#E5007D] flex items-center justify-center">
                    <span className="text-[8px] text-white font-black leading-none">★</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white group-hover:text-[#E5007D] transition-colors">
                    Official Web App QR Code
                  </span>
                  <span className="text-[9px] font-bold bg-[#E5007D] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Superdrug Star
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 mt-0.5">
                  Scannable on all phones · Download PNG for print posters &amp; table stands
                </p>
              </div>
            </div>
            <div className="hidden xs:flex items-center text-xs font-semibold text-neutral-300 group-hover:text-white transition-colors">
              <span>View</span>
              <span className="ml-1 text-[#E5007D]">→</span>
            </div>
          </button>
        )}
      </section>

      {/* Official Conference Notices */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Live Notices &amp; Updates
          </h3>
          <span className="text-[11px] text-[#E5007D] font-semibold">15 Oct 2026</span>
        </div>

        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-3xl bg-white overflow-hidden">
          <div className="p-4 space-y-1 hover:bg-neutral-50/50 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-black">Supplier of the Year Awards 2026</span>
              <span className="text-neutral-400">16:30 Today</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Award ceremony starts at 16:30 in The Porter Tun, honoring category excellence across Supply Chain, Innovation, and ESG Sustainability.
            </p>
          </div>

          <div className="p-4 space-y-1 hover:bg-neutral-50/50 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-black">Supplier Networking Luncheon</span>
              <span className="text-neutral-400">12:45 - 14:00</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Two-course seated luncheon served across the historic Sugar Rooms and The Brewery cobbled courtyard.
            </p>
          </div>

          <div className="p-4 space-y-1 hover:bg-neutral-50/50 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-black">Venue High-Speed Wi-Fi</span>
              <span className="text-[#E5007D] font-semibold">Free Delegate Access</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Network: <span className="font-mono text-black font-semibold">TheBrewery-Guest</span> · Password: <span className="font-mono text-black font-semibold">SuperSuppliers26</span>
            </p>
          </div>

          <div className="p-4 space-y-1 hover:bg-neutral-50/50 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-black">Executive JBP Meeting Suites</span>
              <span className="text-neutral-400">Queen Charlotte</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Pre-booked supplier Joint Business Planning bilateral meeting pods available on Level 1.
            </p>
          </div>
        </div>
      </section>

      {/* Delegate Event Experience Feedback Section */}
      <EventFeedback />

      {/* Executive Leadership Quote */}
      <section className="border border-neutral-200 rounded-3xl p-5 bg-white space-y-2">
        <p className="text-xs italic text-neutral-700 leading-relaxed">
          &ldquo;Our suppliers and brand partners are essential to Superdrug’s continued market growth. Together, we are creating accessible luxury in beauty, essential everyday healthcare, and high street excitement for millions of UK customers.&rdquo;
        </p>
        <div className="text-[11px] text-neutral-500 pt-1">
          <span className="font-bold text-black">Peter Macnab</span> — Chief Executive Officer, Superdrug
        </div>
      </section>
    </div>
  );
};
