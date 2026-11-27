import React, { useState } from 'react';
import { useBrand } from '../config/BrandContext';
import { DEFAULT_BRAND_CONFIG } from '../config/brandConfig';
import {
  Palette,
  RotateCcw,
  X,
  Shield,
  Lock,
} from 'lucide-react';

interface BrandStudioModalProps {
  onClose: () => void;
  onLockOrganizer?: () => void;
  onOpenOrganizerDesk?: () => void;
}

export const BrandStudioModal: React.FC<BrandStudioModalProps> = ({
  onClose,
  onLockOrganizer,
  onOpenOrganizerDesk,
}) => {
  const { config, updateConfig, resetToDefault } = useBrand();

  const [activeTab, setActiveTab] = useState<'features' | 'appearance' | 'details'>('features');

  // Form local state
  const [tempAccent, setTempAccent] = useState(config.colors.primaryAccent);
  const [tempName, setTempName] = useState(config.name);
  const [tempSubTitle, setTempSubTitle] = useState(config.subTitle);
  const [tempEventName, setTempEventName] = useState(config.eventName);
  const [tempDate, setTempDate] = useState(config.date);
  const [tempVenue, setTempVenue] = useState(config.venue);
  const [tempTagline, setTempTagline] = useState(config.tagline);

  const handleResetToDefaults = () => {
    resetToDefault();
    setTempAccent(DEFAULT_BRAND_CONFIG.colors.primaryAccent);
    setTempName(DEFAULT_BRAND_CONFIG.name);
    setTempSubTitle(DEFAULT_BRAND_CONFIG.subTitle);
    setTempEventName(DEFAULT_BRAND_CONFIG.eventName);
    setTempDate(DEFAULT_BRAND_CONFIG.date);
    setTempVenue(DEFAULT_BRAND_CONFIG.venue);
    setTempTagline(DEFAULT_BRAND_CONFIG.tagline);
  };

  const handleApplyAppearance = () => {
    updateConfig({
      name: tempName,
      subTitle: tempSubTitle,
      eventName: tempEventName,
      date: tempDate,
      venue: tempVenue,
      tagline: tempTagline,
      colors: {
        ...config.colors,
        primaryAccent: tempAccent,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-5">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border-2 border-black flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: config.colors.primaryAccent }}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-black">
                Brand &amp; Event Studio
              </h2>
              <div className="text-[11px] text-neutral-500 font-semibold">
                Event Branding &amp; Feature Controls
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenOrganizerDesk && (
              <button
                type="button"
                onClick={onOpenOrganizerDesk}
                className="bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                title="Switch to Organizer & Moderator Desk"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: config.colors.primaryAccent }} />
                <span className="hidden xs:inline">Organizer Desk</span>
              </button>
            )}
            {onLockOrganizer && (
              <button
                type="button"
                onClick={onLockOrganizer}
                className="bg-neutral-200/80 hover:bg-neutral-200 text-black text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                title="Lock organizer access for this session"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: config.colors.primaryAccent }} />
                <span>Lock</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-200/50 transition-colors"
              aria-label="Close Brand Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-neutral-200 bg-white px-6 overflow-x-auto no-scrollbar gap-1 pt-2">
          {[
            { id: 'features', label: 'Feature Flags' },
            { id: 'appearance', label: 'Brand & Color' },
            { id: 'details', label: 'Event Details' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`text-xs font-bold px-3 py-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-black text-black'
                  : 'border-transparent text-neutral-500 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. APPEARANCE & COLORS */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-black">Color &amp; Typography Tokens</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Customize the signature interactive highlight and CTA button color.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-black block mb-1.5">
                    Primary Accent Color (Buttons, Highlights &amp; Active Icons)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={tempAccent}
                      onChange={(e) => setTempAccent(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-neutral-300 p-1"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={tempAccent}
                        onChange={(e) => setTempAccent(e.target.value)}
                        className="w-full font-mono text-xs font-bold p-2.5 rounded-xl border border-neutral-300 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick color swatches */}
                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 block mb-1.5">
                    Quick Color Swatches
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { name: 'Superdrug Pink', color: '#E5007D' },
                      { name: 'Deep Navy', color: '#004B87' },
                      { name: 'Classic Black', color: '#000000' },
                      { name: 'Emerald Health', color: '#059669' },
                      { name: 'Violet Beauty', color: '#7C3AED' },
                      { name: 'Coral Glow', color: '#F43F5E' },
                    ].map((swatch) => (
                      <button
                        key={swatch.name}
                        onClick={() => setTempAccent(swatch.color)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-neutral-200 hover:border-black bg-white"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-300"
                          style={{ backgroundColor: swatch.color }}
                        />
                        <span>{swatch.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleApplyAppearance}
                    className="w-full text-white text-xs font-bold py-3 rounded-full shadow-md tap-highlight"
                    style={{ backgroundColor: tempAccent }}
                  >
                    Apply Live Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. EVENT DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-black">Event Names &amp; Venue</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Update conference titles, dates, and locations across all views.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Brand Wordmark</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Conference Subtitle</label>
                  <input
                    type="text"
                    value={tempSubTitle}
                    onChange={(e) => setTempSubTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Full Event Name</label>
                  <input
                    type="text"
                    value={tempEventName}
                    onChange={(e) => setTempEventName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Date</label>
                    <input
                      type="text"
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Venue Name</label>
                    <input
                      type="text"
                      value={tempVenue}
                      onChange={(e) => setTempVenue(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-300 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Conference Tagline</label>
                  <input
                    type="text"
                    value={tempTagline}
                    onChange={(e) => setTempTagline(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 font-medium"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleApplyAppearance}
                    className="w-full bg-black text-white text-xs font-bold py-3 rounded-full shadow-md tap-highlight"
                  >
                    Save Event Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. FEATURE FLAGS */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-black">Module Feature Flags</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Turn entire views and capabilities on or off with zero code changes.
                </p>
              </div>

              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-white text-xs">
                {[
                  { key: 'enableHub', label: 'Hub View', desc: 'Welcome overview, quick links, live session spotlight' },
                  { key: 'enableRunningOrder', label: 'Running Order Timeline', desc: 'Single-stream schedule with agenda bookmarking' },
                  { key: 'enableInteractions', label: 'Interactions & Live Polls', desc: 'Live audience polling & keynote speaker directory' },
                  { key: 'enableFloorMap', label: 'Interactive Floor Map', desc: 'The Brewery / venue blueprint modal' },
                  { key: 'enableCalendarExport', label: 'Calendar .ICS Sync', desc: 'Export sessions directly to phone calendar' },
                ].map((feat) => {
                  const isChecked = config.features[feat.key as keyof typeof config.features];
                  return (
                    <div key={feat.key} className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-black">{feat.label}</div>
                        <div className="text-[11px] text-neutral-500">{feat.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          updateConfig({
                            features: {
                              ...config.features,
                              [feat.key]: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 rounded border-neutral-300 text-black focus:ring-0 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-3.5 bg-neutral-50 flex items-center justify-between">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="bg-black text-white text-xs font-bold py-2.5 px-5 rounded-full hover:bg-neutral-800 tap-highlight"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
