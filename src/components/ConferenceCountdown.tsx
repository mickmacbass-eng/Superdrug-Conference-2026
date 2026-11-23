import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck2, Clock } from 'lucide-react';
import { CONFERENCE_INFO } from '../data/conferenceData';
import { useBrand } from '../config/BrandContext';

interface ConferenceCountdownProps {
  onOpenRunningOrder: () => void;
}

type CountdownPhase = 'countdown' | 'live' | 'concluded';

interface CountdownSnapshot {
  phase: CountdownPhase;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EVENT_START_MS = Date.parse(CONFERENCE_INFO.eventStartIso);
const EVENT_END_MS = Date.parse(CONFERENCE_INFO.eventEndIso);

function computeCountdownSnapshot(nowMs: number): CountdownSnapshot {
  if (nowMs < EVENT_START_MS) {
    const remainingSeconds = Math.max(0, Math.floor((EVENT_START_MS - nowMs) / 1000));
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return {
      phase: 'countdown',
      days,
      hours,
      minutes,
      seconds,
    };
  }

  if (nowMs <= EVENT_END_MS) {
    return {
      phase: 'live',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  return {
    phase: 'concluded',
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

export const ConferenceCountdown: React.FC<ConferenceCountdownProps> = ({
  onOpenRunningOrder,
}) => {
  const { config } = useBrand();
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(() =>
    computeCountdownSnapshot(Date.now())
  );

  useEffect(() => {
    if (snapshot.phase === 'concluded') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSnapshot(computeCountdownSnapshot(Date.now()));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [snapshot.phase]);

  const accentColor = config.colors.primaryAccent;

  // Event-Day Live State (15 Oct 2026 · 08:30–19:00 BST)
  if (snapshot.phase === 'live') {
    return (
      <section
        aria-label="Conference Live Status"
        className="bg-white border-2 border-black rounded-3xl p-5 shadow-sm space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ backgroundColor: accentColor }}
              />
            </span>
            <h2 className="text-sm font-black text-black tracking-tight">
              Doors Open · Conference Live Today
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap shrink-0">
            15 Oct 2026
          </span>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          Welcome to {config.venue}. Registration &amp; Morning Coffee is open in the King George III Room, with main stage sessions in The Porter Tun.
        </p>

        <button
          type="button"
          onClick={onOpenRunningOrder}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all tap-highlight whitespace-nowrap"
        >
          <span>View Running Order</span>
          <ArrowRight className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
        </button>
      </section>
    );
  }

  // Post-Event State (After 15 Oct 2026 · 19:00 BST)
  if (snapshot.phase === 'concluded') {
    return (
      <section
        aria-label="Conference Summary"
        className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
            <h2 className="text-sm font-bold text-black tracking-tight">
              {config.eventName} Concluded
            </h2>
          </div>
          <span className="text-[11px] font-medium text-neutral-500 whitespace-nowrap shrink-0">
            15 Oct 2026
          </span>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          Thank you for joining us at {config.venue}. Session details remain available in the Running Order, and you can still share your event feedback below.
        </p>
      </section>
    );
  }

  // Pre-Event Countdown State (Before 15 Oct 2026 · 08:30 BST)
  const units = [
    { label: 'Days', value: String(snapshot.days), isAccent: false },
    { label: 'Hours', value: padTwo(snapshot.hours), isAccent: false },
    { label: 'Mins', value: padTwo(snapshot.minutes), isAccent: false },
    { label: 'Secs', value: padTwo(snapshot.seconds), isAccent: true },
  ];

  return (
    <section
      aria-label="Countdown to Conference Start"
      className="bg-white border-2 border-neutral-200 rounded-3xl p-5 shadow-sm space-y-4"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
          <h2 className="text-sm font-black text-black tracking-tight truncate">
            Countdown to Doors Open
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap shrink-0">
          15 Oct · 08:30 BST
        </span>
      </div>

      {/* 4-Column Tabular Countdown Grid */}
      <div
        className="grid grid-cols-4 gap-2 sm:gap-2.5"
        role="timer"
        aria-live="off"
      >
        {units.map((unit) => (
          <div
            key={unit.label}
            className="rounded-2xl bg-neutral-50 border border-neutral-200 py-3 px-1.5 flex flex-col items-center justify-center"
          >
            <span
              className="text-2xl sm:text-3xl font-black tracking-tight leading-none tabular-nums"
              style={{ color: unit.isAccent ? accentColor : '#000000' }}
            >
              {unit.value}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mt-1.5 whitespace-nowrap">
              {unit.label}
            </span>
          </div>
        ))}
      </div>

      {/* Quiet Metadata Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
        <span className="truncate">Registration &amp; Morning Coffee</span>
        <span className="font-medium text-neutral-700 whitespace-nowrap shrink-0">
          {config.venue}
        </span>
      </div>
    </section>
  );
};
