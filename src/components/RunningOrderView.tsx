import React, { useState, useMemo } from 'react';
import { Session, CONFERENCE_INFO } from '../data/conferenceData';
import {
  Bookmark,
  BookmarkCheck,
  Search,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  Coffee,
  Utensils,
  Wine,
} from 'lucide-react';

interface RunningOrderViewProps {
  sessions: Session[];
  bookmarkedIds: Set<string>;
  onToggleBookmark: (sessionId: string) => void;
  onSelectSession: (session: Session) => void;
  onNavigateToInteractions: (speakerName?: string) => void;
}

export const RunningOrderView: React.FC<RunningOrderViewProps> = ({
  sessions,
  bookmarkedIds,
  onToggleBookmark,
  onSelectSession,
  onNavigateToInteractions,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'saved'>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (activeFilter === 'saved' && !bookmarkedIds.has(session.id) && !session.isBreak) return false;
      if (selectedTrack !== 'all' && session.track !== selectedTrack) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = session.title.toLowerCase().includes(query);
        const matchesStage = session.stage.toLowerCase().includes(query);
        const matchesPresenters = session.presenters?.toLowerCase().includes(query);
        const matchesTrack = session.track.toLowerCase().includes(query);
        return matchesTitle || matchesStage || matchesPresenters || matchesTrack;
      }

      return true;
    });
  }, [sessions, activeFilter, selectedTrack, bookmarkedIds, searchQuery]);

  const savedCount = useMemo(() => {
    return sessions.filter((s) => !s.isBreak && bookmarkedIds.has(s.id)).length;
  }, [sessions, bookmarkedIds]);

  const tracks = ['all', 'Plenary', 'Trading', 'Supply Chain', 'Healthcare', 'Awards'];

  return (
    <div className="space-y-5 pb-4">
      {/* Title & Date Banner */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">
              Running Order
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Thursday 15th October 2026 · {CONFERENCE_INFO.venue}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
            {filteredSessions.length} Events
          </span>
        </div>

        {/* Date / Venue Strip */}
        <div className="flex items-center justify-between bg-black text-white px-4 py-2.5 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5007D]" />
            <span className="font-bold">Official Conference Schedule</span>
          </div>
          <span className="text-neutral-300 font-medium">15 Oct 2026</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* All vs Saved Toggles */}
          <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-0.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeFilter === 'all'
                  ? 'bg-black text-white'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              All Sessions
            </button>
            <button
              onClick={() => setActiveFilter('saved')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeFilter === 'saved'
                  ? 'bg-black text-white'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${activeFilter === 'saved' ? 'text-[#E5007D]' : ''}`} />
              <span>My Agenda</span>
              <span className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                activeFilter === 'saved' ? 'bg-[#E5007D] text-white' : 'bg-neutral-100 text-neutral-700'
              }`}>
                {savedCount}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search session or presenter..."
              className="w-full text-xs bg-white border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        {/* Category Track Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {tracks.map((t) => {
            const isSelected = selectedTrack === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedTrack(t)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap transition-colors tap-highlight ${
                  isSelected
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:text-black'
                }`}
              >
                {t === 'all' ? 'All Tracks' : t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronological Timeline */}
      <div className="relative border-l-2 border-neutral-200 ml-4 pl-4 space-y-4">
        {filteredSessions.map((session) => {
          const isBookmarked = bookmarkedIds.has(session.id);

          // Render Break / Lunch / Drinks Highlight Banner
          if (session.isBreak) {
            const isDrinks = session.title.toLowerCase().includes('drinks');
            const isLunch = session.title.toLowerCase().includes('lunch');

            return (
              <div key={session.id} className="relative my-2">
                {/* Node */}
                <div className="absolute -left-[23px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-[#E5007D] bg-[#E5007D]" />

                <div
                  className={`rounded-2xl p-3.5 text-white shadow-sm transition-all flex items-center justify-between gap-3 ${
                    isDrinks
                      ? 'bg-black border-2 border-[#E5007D]'
                      : 'bg-[#E5007D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      {isDrinks ? (
                        <Wine className="w-4 h-4 text-white" />
                      ) : isLunch ? (
                        <Utensils className="w-4 h-4 text-white" />
                      ) : (
                        <Coffee className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-sm tracking-tight text-white flex items-center gap-2">
                        <span>{session.title}</span>
                      </div>
                      <div className="text-[11px] text-white/90 font-medium">
                        {session.stage} · {session.presenters}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-white tabular-nums shrink-0">
                    {session.time}
                  </span>
                </div>
              </div>
            );
          }

          // Regular Presentation / Plenary Session
          return (
            <div key={session.id} className="relative group">
              {/* Timeline Bullet Node */}
              <div
                className={`absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-white transition-colors ${
                  session.isLive
                    ? 'border-[#E5007D] bg-[#E5007D]'
                    : isBookmarked
                    ? 'border-[#E5007D] bg-[#E5007D]'
                    : 'border-black'
                }`}
              />

              <div
                className={`border rounded-2xl p-4 bg-white transition-all hover:border-black ${
                  session.isLive ? 'border-[#E5007D] ring-1 ring-[#E5007D]/20 shadow-sm' : 'border-neutral-200'
                }`}
              >
                {/* Header row: Time & Bookmark */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-black tabular-nums">
                      {session.time} – {session.endTime}
                    </span>
                    {session.isLive && (
                      <span className="text-[10px] font-black uppercase text-[#E5007D] tracking-wider animate-pulse">
                        LIVE NOW
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onToggleBookmark(session.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-black transition-colors tap-highlight"
                    title={isBookmarked ? 'Remove from My Agenda' : 'Save to My Agenda'}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-5 h-5 text-[#E5007D]" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Session Title */}
                <h3
                  onClick={() => onSelectSession(session)}
                  className="font-bold text-base text-black mt-1.5 cursor-pointer hover:text-neutral-700 leading-snug"
                >
                  {session.title}
                </h3>

                {/* Presenters Highlight (Directly from User Agenda Table) */}
                <div className="mt-1.5 text-xs text-neutral-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
                  <span className="font-semibold text-black">Presenters:</span>
                  <span className="text-neutral-700 font-medium">{session.presenters}</span>
                </div>

                {/* Unboxed Metadata (Zero-pill discipline) */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2 flex-wrap">
                  <span className="font-semibold text-black">{session.stage}</span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-[#E5007D] font-medium">{session.track}</span>
                </div>

                {/* Preview text */}
                <p className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                  {session.description}
                </p>

                {/* Action footer */}
                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <button
                    onClick={() => onSelectSession(session)}
                    className="text-xs font-bold text-black hover:text-[#E5007D] flex items-center gap-1 transition-colors"
                  >
                    <span>Session details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onNavigateToInteractions(session.presenters)}
                    className="text-xs font-semibold text-[#E5007D] hover:underline"
                  >
                    Ask Presenters
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSessions.length === 0 && (
          <div className="py-12 text-center space-y-3 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
            <Clock className="w-8 h-8 text-neutral-400 mx-auto" />
            <div className="text-sm font-bold text-black">No sessions found</div>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              {activeFilter === 'saved'
                ? "You haven't bookmarked any sessions yet. Tap the bookmark icon on any session to add it to your personal agenda."
                : "No sessions match your search or filter. Try clearing the filter."}
            </p>
            {activeFilter === 'saved' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="bg-[#E5007D] text-white text-xs font-bold py-2 px-4 rounded-full shadow-sm hover:bg-[#c4006b] tap-highlight"
              >
                Browse All Sessions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
