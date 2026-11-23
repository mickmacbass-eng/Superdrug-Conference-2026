import React, { useState } from 'react';
import { X, MapPin, Navigation, Coffee, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

interface VenueModalProps {
  onClose: () => void;
}

export const VenueModal: React.FC<VenueModalProps> = ({ onClose }) => {
  const [selectedZone, setSelectedZone] = useState<string>('porter-tun');

  const zones = [
    {
      id: 'porter-tun',
      name: 'The Porter Tun (Main Plenary Stage)',
      level: 'Ground Floor · Main Entrance',
      description: 'Host space for the Executive Opening Plenary, Commercial Roadmaps, and the Superdrug Supplier of the Year Awards ceremony.',
      amenities: 'Seating for 450, unobstructed timber king-post roof, twin LED stage backdrops, dual live Q&A microphone pods',
    },
    {
      id: 'king-george',
      name: 'King George III Room',
      level: 'Ground Level · Historic Brick Vaults',
      description: 'Morning supplier delegate registration, artisan breakfast coffee bar, and evening cocktail networking reception.',
      amenities: 'Exposed Georgian brickwork, delegate accreditation desk, cloakroom',
    },
    {
      id: 'sugar-rooms',
      name: 'The Sugar Rooms (Luncheon & Breakouts)',
      level: 'Upper & Lower Levels · Courtyard Wing',
      description: 'Seated two-course Supplier Networking Luncheon and specialized category commercial breakout workshops.',
      amenities: 'Natural daylight, exposed timber beams, dedicated bar and hospitality service',
    },
    {
      id: 'queen-charlotte',
      name: 'Queen Charlotte (Executive JBP Suites)',
      level: 'First Floor · Private Executive Wing',
      description: 'Pre-scheduled bilateral Joint Business Planning (JBP) commercial meeting pods between brand teams and Superdrug buying controllers.',
      amenities: 'Private consultation tables, presentation monitors, confidential discussion suites',
    },
    {
      id: 'courtyard',
      name: 'The Brewery Cobbled Courtyard',
      level: 'Outdoor Covered Atrium',
      description: 'Central open-air cobbled courtyard for supplier networking, fresh air breaks, and evening champagne reception.',
      amenities: 'Heated marquee canopy, garden cocktail stations, vintage London brewery architecture',
    },
  ];

  const currentZone = zones.find((z) => z.id === selectedZone) || zones[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#E5007D]" />
            <div>
              <h2 className="text-base font-black text-black">
                The Brewery London Floor Blueprint
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-500 font-medium">
                  52 Chiswell Street, London EC1Y 4SD
                </span>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=The+Brewery+52+Chiswell+Street+London+EC1Y+4SD"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E5007D] hover:underline"
                  title="Open in Google Maps"
                >
                  <Navigation className="w-2.5 h-2.5 fill-current" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimalist Vector Floor Architecture */}
        <div className="border-2 border-black rounded-2xl bg-neutral-50 p-4 relative overflow-hidden">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center mb-2">
            HISTORIC BREWERY SPACES · 15 OCT 2026
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <button
              onClick={() => setSelectedZone('porter-tun')}
              className={`p-3 rounded-xl border font-bold transition-all tap-highlight ${
                selectedZone === 'porter-tun'
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white text-black border-neutral-200 hover:border-black'
              }`}
            >
              <div className="text-[10px] text-[#E5007D] font-mono">MAIN STAGE</div>
              <div>The Porter Tun</div>
            </button>

            <button
              onClick={() => setSelectedZone('king-george')}
              className={`p-3 rounded-xl border font-bold transition-all tap-highlight ${
                selectedZone === 'king-george'
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white text-black border-neutral-200 hover:border-black'
              }`}
            >
              <div className="text-[10px] text-[#E5007D] font-mono">REGISTRATION</div>
              <div>King George III</div>
            </button>

            <button
              onClick={() => setSelectedZone('sugar-rooms')}
              className={`p-3 rounded-xl border font-bold transition-all tap-highlight ${
                selectedZone === 'sugar-rooms'
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white text-black border-neutral-200 hover:border-black'
              }`}
            >
              <div className="text-[10px] text-[#E5007D] font-mono">LUNCHEON</div>
              <div>The Sugar Rooms</div>
            </button>

            <button
              onClick={() => setSelectedZone('queen-charlotte')}
              className={`p-3 rounded-xl border font-bold transition-all tap-highlight ${
                selectedZone === 'queen-charlotte'
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white text-black border-neutral-200 hover:border-black'
              }`}
            >
              <div className="text-[10px] text-[#E5007D] font-mono">JBP SUITES</div>
              <div>Queen Charlotte</div>
            </button>
          </div>

          <div className="mt-2">
            <button
              onClick={() => setSelectedZone('courtyard')}
              className={`w-full p-2.5 rounded-xl border font-bold text-xs transition-all tap-highlight ${
                selectedZone === 'courtyard'
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white text-black border-neutral-200 hover:border-black'
              }`}
            >
              <span className="text-[10px] text-[#E5007D] font-mono mr-2">OUTDOOR</span>
              <span>The Brewery Cobbled Courtyard (Drinks Reception)</span>
            </button>
          </div>
        </div>

        {/* Selected Zone Overview */}
        <div className="border border-neutral-200 rounded-2xl p-4 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-black">{currentZone.name}</h3>
            <span className="text-[11px] font-semibold text-[#E5007D]">
              {currentZone.level}
            </span>
          </div>

          <p className="text-xs text-neutral-600 leading-relaxed">
            {currentZone.description}
          </p>

          <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
            <strong className="text-black">Amenities:</strong> {currentZone.amenities}
          </div>
        </div>

        {/* Venue Services Bar */}
        <div className="flex items-center justify-between text-xs text-neutral-600 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
          <div className="flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-[#E5007D]" />
            <span>Espresso Bar: King George III</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E5007D]" />
            <span>Cloakroom: Entrance Foyer</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <a
            href="https://www.google.com/maps/search/?api=1&query=The+Brewery+52+Chiswell+Street+London+EC1Y+4SD"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold py-3 px-4 rounded-full shadow-sm tap-highlight transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>Open Google Maps</span>
          </a>
          <button
            onClick={onClose}
            className="flex-1 bg-[#E5007D] text-white text-xs font-bold py-3 px-4 rounded-full shadow-sm hover:bg-[#c4006b] tap-highlight transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
