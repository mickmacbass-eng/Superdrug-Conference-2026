import React from 'react';
import { WifiOff, MapPin, Navigation, QrCode } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useBrand } from '../config/BrandContext';

interface HeaderProps {
  onOpenVenueMap: () => void;
  onOpenSplash?: () => void;
  onOpenQRCode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVenueMap,
  onOpenSplash,
  onOpenQRCode,
}) => {
  const isOnline = useOnlineStatus();
  const { config } = useBrand();

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${config.venue || 'The Brewery, London'}, ${config.venueAddress || '52 Chiswell Street, London EC1Y 4SD'}`
  )}`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-3 sm:px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        {/* Zone 1: Brand Wordmark (Hyperlink to Splash Screen) */}
        <a
          href="#splash"
          onClick={(e) => {
            e.preventDefault();
            onOpenSplash?.();
          }}
          className="group flex items-center gap-2 shrink-0 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5007D] rounded-xl p-1 -m-1 transition-all"
          title="Return to Welcome Splash Page"
          aria-label="Return to Welcome Splash Page"
        >
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 group-hover:ring-2 group-hover:ring-[#E5007D]/50 transition-all">
            {/* Dynamic Brand Star Graphic */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" style={{ fill: config.colors.primaryAccent }}>
              <path d="M12 2l2.4 6.8H21l-5.6 4.3 2.1 6.9-5.5-4.2-5.5 4.2 2.1-6.9L3 8.8h6.6z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-tighter text-black uppercase leading-none group-hover:text-[#E5007D] transition-colors">
              {config.name}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-500 tracking-wider uppercase mt-0.5 group-hover:text-black transition-colors">
              {config.subTitle}
            </span>
          </div>
        </a>

        {/* Zone 2: Navigation & Actions Cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Top Travel Button linking to Google Maps */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold bg-[#E5007D] hover:bg-[#c4006b] active:scale-95 text-white px-2.5 sm:px-3 py-1.5 rounded-full shadow-xs transition-all tap-highlight"
            title="Open Google Maps directions to The Brewery, London"
            aria-label="Travel directions on Google Maps"
          >
            <Navigation className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>Travel</span>
          </a>

          {/* Web App QR Code Trigger with Superdrug Star */}
          {onOpenQRCode && (
            <button
              onClick={onOpenQRCode}
              className="flex items-center gap-1 text-xs text-neutral-800 hover:text-black py-1.5 px-2 rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap border border-neutral-200"
              title="Official Web App QR Code (incorporating Superdrug Star)"
              aria-label="Open Web App QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
              <span className="font-semibold text-xs hidden xs:inline">QR</span>
            </button>
          )}

          {/* Venue Floor Plan Trigger */}
          <button
            onClick={onOpenVenueMap}
            className="flex items-center gap-1 text-xs text-neutral-700 hover:text-black py-1.5 px-2 rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap"
            title={`View ${config.venue} Floor Plan`}
          >
            <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span className="font-medium text-xs hidden xs:inline">Map</span>
          </button>

          {!isOnline && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

