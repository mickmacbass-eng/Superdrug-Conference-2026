import React from 'react';
import { Session } from '../data/conferenceData';
import { X, MapPin, Bookmark, BookmarkCheck, CalendarPlus } from 'lucide-react';

interface SessionDetailModalProps {
  session: Session | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (sessionId: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  onClose,
  isBookmarked,
  onToggleBookmark,
}) => {
  if (!session) return null;

  const downloadIcs = () => {
    // Generate clean .ics calendar file
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Superdrug Annual Conference//EN',
      'BEGIN:VEVENT',
      `SUMMARY:Superdrug Supplier Conf: ${session.title}`,
      `DESCRIPTION:${session.description.replace(/\n/g, ' ')}`,
      `LOCATION:${session.stage}, The Brewery London, 52 Chiswell St`,
      'DTSTART:20261015T093000Z',
      'DTEND:20261015T103000Z',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `superdrug-session-${session.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-black tabular-nums">
              {session.time} – {session.endTime}
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs font-bold text-[#E5007D]">{session.track}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-black text-black leading-snug">
            {session.title}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#E5007D]" />
            <span className="font-bold text-black">{session.stage}</span>
            <span className="text-neutral-300">·</span>
            <span>The Brewery, London</span>
          </div>
          {session.presenters && (
            <div className="text-xs text-neutral-800 mt-2 flex items-center gap-1.5 bg-neutral-100 p-2.5 rounded-xl">
              <span className="font-bold text-black">Presenters:</span>
              <span className="text-neutral-700 font-medium">{session.presenters}</span>
            </div>
          )}
        </div>

        {/* Full Description */}
        <div className="space-y-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Overview
          </h4>
          <p className="text-xs text-neutral-700 leading-relaxed">
            {session.description}
          </p>
        </div>

        {/* Speakers List */}
        <div className="space-y-2 pt-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Speakers
          </h4>
          <div className="space-y-2">
            {session.speakers.map((speaker, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200 bg-neutral-50/50"
              >
                <div>
                  <div className="text-xs font-bold text-black">{speaker.name}</div>
                  <div className="text-[11px] text-neutral-500">
                    {speaker.title} {speaker.company ? `· ${speaker.company}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 space-y-2">
          {/* Pill CTA: Bookmark */}
          <button
            onClick={() => onToggleBookmark(session.id)}
            className={`w-full text-xs font-bold py-3 px-5 rounded-full shadow-sm transition-all flex items-center justify-center gap-2 tap-highlight ${
              isBookmarked
                ? 'bg-black text-white hover:bg-neutral-800'
                : 'bg-[#E5007D] text-white hover:bg-[#c4006b]'
            }`}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[#E5007D]" />
                <span>Saved to My Agenda (Tap to Remove)</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Save Session to My Agenda</span>
              </>
            )}
          </button>

          <button
            onClick={downloadIcs}
            className="w-full border border-neutral-300 text-black text-xs font-bold py-2.5 px-4 rounded-full hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#E5007D]" />
            <span>Export to Phone Calendar (.ics)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
