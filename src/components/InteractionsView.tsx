import React, { useState } from 'react';
import { Poll, QAQuestion, Speaker } from '../data/conferenceData';
import {
  Vote,
  MessageSquare,
  Heart,
  Send,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InteractionsViewProps {
  polls: Poll[];
  qaQuestions: QAQuestion[];
  speakers: Speaker[];
  onVotePoll: (pollId: string, optionId: string) => void;
  onSubmitQuestion: (newQuestion: { text: string; targetSpeaker: string; isAnonymous: boolean }) => void;
  onToggleUpvote: (questionId: string) => void;
  initialTargetSpeaker?: string;
}

export const InteractionsView: React.FC<InteractionsViewProps> = ({
  polls,
  qaQuestions,
  speakers,
  onVotePoll,
  onSubmitQuestion,
  onToggleUpvote,
  initialTargetSpeaker,
}) => {
  const [activeTab, setActiveTab] = useState<'polls' | 'qa' | 'speakers'>('polls');
  const [qaSort, setQaSort] = useState<'top' | 'recent'>('top');

  // Question form state
  const [questionText, setQuestionText] = useState('');
  const [targetSpeaker, setTargetSpeaker] = useState(
    initialTargetSpeaker || (speakers[0] ? speakers[0].name : 'All Keynote Panel')
  );
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittedToast, setSubmittedToast] = useState(false);

  const handleVote = (pollId: string, optionId: string) => {
    onVotePoll(pollId, optionId);
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#E5007D', '#000000', '#ffffff'],
      });
    } catch {
      // Fallback
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    onSubmitQuestion({
      text: questionText.trim(),
      targetSpeaker,
      isAnonymous,
    });

    setQuestionText('');
    setSubmittedToast(true);
    setTimeout(() => setSubmittedToast(false), 3000);
  };

  const sortedQuestions = [...qaQuestions].sort((a, b) => {
    if (qaSort === 'top') {
      return b.upvotes - a.upvotes;
    }
    return 0; // retain natural recent order
  });

  return (
    <div className="space-y-5 pb-4">
      {/* Title & Segmented Sub-Navigation */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight">
            Interactions
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Live audience polling, floor Q&amp;A &amp; speaker engagement
          </p>
        </div>

        {/* 3-Way Segmented Tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
          <button
            onClick={() => setActiveTab('polls')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all tap-highlight flex items-center justify-center gap-1.5 ${
              activeTab === 'polls'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Vote className={`w-3.5 h-3.5 ${activeTab === 'polls' ? 'text-[#E5007D]' : ''}`} />
            <span>Live Polls</span>
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all tap-highlight flex items-center justify-center gap-1.5 ${
              activeTab === 'qa'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'qa' ? 'text-[#E5007D]' : ''}`} />
            <span>Floor Q&amp;A</span>
          </button>

          <button
            onClick={() => setActiveTab('speakers')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all tap-highlight flex items-center justify-center gap-1.5 ${
              activeTab === 'speakers'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeTab === 'speakers' ? 'text-[#E5007D]' : ''}`} />
            <span>Speakers</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE POLLS */}
      {activeTab === 'polls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Active Floor Questions
            </span>
            <span className="text-[11px] text-[#E5007D] font-bold">Live Synced</span>
          </div>

          {polls.map((poll) => {
            const hasVoted = Boolean(poll.userVotedOptionId);

            return (
              <div
                key={poll.id}
                className="border border-neutral-200 rounded-3xl p-5 bg-white space-y-4 shadow-sm"
              >
                <div>
                  <div className="text-[11px] font-semibold text-neutral-500 mb-1">
                    {poll.sessionTitle}
                  </div>
                  <h3 className="text-base font-bold text-black leading-snug">
                    {poll.question}
                  </h3>
                </div>

                {/* Poll Options */}
                <div className="space-y-2.5">
                  {poll.options.map((option) => {
                    const isSelected = poll.userVotedOptionId === option.id;
                    const percentage = poll.totalVotes > 0
                      ? Math.round((option.votes / poll.totalVotes) * 100)
                      : 0;

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleVote(poll.id, option.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden tap-highlight ${
                          isSelected
                            ? 'border-black bg-neutral-50 ring-1 ring-black'
                            : 'border-neutral-200 hover:border-neutral-400 bg-white'
                        }`}
                      >
                        {/* Dynamic Progress Bar Fill */}
                        {hasVoted && (
                          <div
                            className={`absolute left-0 top-0 bottom-0 opacity-15 transition-all duration-500 ${
                              isSelected ? 'bg-[#E5007D]' : 'bg-neutral-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-[#E5007D] bg-[#E5007D]'
                                  : 'border-neutral-400'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>
                            <span className={`text-xs font-medium leading-snug ${
                              isSelected ? 'text-black font-bold' : 'text-neutral-800'
                            }`}>
                              {option.text}
                            </span>
                          </div>

                          {hasVoted && (
                            <span className="font-mono text-xs font-bold text-black tabular-nums shrink-0">
                              {percentage}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Poll Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
                  <span className="tabular-nums font-mono font-medium">
                    {poll.totalVotes} total responses
                  </span>
                  {hasVoted ? (
                    <span className="text-[#E5007D] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Vote recorded
                    </span>
                  ) : (
                    <span className="text-neutral-400 font-medium">
                      Tap an option to cast your vote
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: AUDIENCE Q&A */}
      {activeTab === 'qa' && (
        <div className="space-y-5">
          {/* Ask Question Form */}
          <form
            onSubmit={handleQuestionSubmit}
            className="border-2 border-neutral-200 rounded-3xl p-5 bg-white space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Submit a Question to Speakers
              </span>
              <span className="text-[11px] text-neutral-500">Session Floor</span>
            </div>

            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask an executive or panel speaker a question..."
              rows={3}
              maxLength={280}
              className="w-full text-xs p-3 rounded-2xl border border-neutral-200 focus:outline-none focus:border-black text-black placeholder:text-neutral-400 transition-colors resize-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-neutral-500 font-medium block mb-1">
                  Direct question to:
                </label>
                <select
                  value={targetSpeaker}
                  onChange={(e) => setTargetSpeaker(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-neutral-200 bg-white text-black focus:outline-none focus:border-black font-medium"
                >
                  <option value="All Keynote Panel">Executive Keynote Panel</option>
                  {speakers.map((sp) => (
                    <option key={sp.id} value={`${sp.name} (${sp.role})`}>
                      {sp.name} — {sp.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="anonCheckbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-neutral-300 text-black focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="anonCheckbox" className="text-xs text-neutral-700 cursor-pointer select-none">
                  Submit anonymously
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 tabular-nums">
                {280 - questionText.length} characters left
              </span>

              {/* Pill-shaped CTA button strictly using #E5007D */}
              <button
                type="submit"
                disabled={!questionText.trim()}
                className="bg-[#E5007D] text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-sm hover:bg-[#c4006b] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5 tap-highlight"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Question</span>
              </button>
            </div>

            {submittedToast && (
              <div className="p-2.5 bg-neutral-900 text-white rounded-xl text-xs font-medium text-center animate-fade-in flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#E5007D]" />
                Your question has been sent to the conference moderator queue!
              </div>
            )}
          </form>

          {/* Q&A Stream & Sorting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Floor Questions ({qaQuestions.length})
              </span>

              {/* Sort pills */}
              <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-0.5">
                <button
                  onClick={() => setQaSort('top')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    qaSort === 'top' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  Top Voted
                </button>
                <button
                  onClick={() => setQaSort('recent')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    qaSort === 'recent' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  Recent
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="border border-neutral-200 rounded-2xl p-4 bg-white space-y-2 hover:border-black transition-colors shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1 flex-wrap">
                        <span className="font-semibold text-black">{q.author}</span>
                        <span className="text-neutral-300">·</span>
                        <span>{q.role}</span>
                        <span className="text-neutral-300">·</span>
                        <span>{q.timestamp}</span>
                      </div>
                      <div className="text-[11px] font-bold text-[#E5007D] mt-0.5">
                        To: {q.targetSpeaker}
                      </div>
                    </div>

                    {/* Upvote Button with #E5007D active state */}
                    <button
                      onClick={() => onToggleUpvote(q.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all tap-highlight ${
                        q.isUpvoted
                          ? 'border-[#E5007D] bg-[#E5007D] text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-black'
                      }`}
                      title="Upvote this question"
                    >
                      <ArrowUp className={`w-3.5 h-3.5 ${q.isUpvoted ? 'text-white' : 'text-neutral-500'}`} />
                      <span className="tabular-nums font-mono">{q.upvotes}</span>
                    </button>
                  </div>

                  <p className="text-xs text-black leading-relaxed font-normal pt-1">
                    {q.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPEAKERS DIRECT ENGAGEMENT */}
      {activeTab === 'speakers' && (
        <div className="space-y-4">
          <div className="px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Keynote Speakers &amp; Leaders
            </span>
          </div>

          <div className="space-y-3">
            {speakers.map((sp) => (
              <div
                key={sp.id}
                className="border border-neutral-200 rounded-3xl p-5 bg-white space-y-3 shadow-sm hover:border-black transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-black">{sp.name}</h3>
                    <div className="text-xs font-semibold text-[#E5007D] mt-0.5">
                      {sp.role}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      Session: <span className="text-black font-medium">{sp.sessionTitle}</span>
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-black text-xs border border-neutral-200 shrink-0">
                    {sp.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {sp.bio}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setTargetSpeaker(`${sp.name} (${sp.role})`);
                      setActiveTab('qa');
                    }}
                    className="w-full bg-[#E5007D] text-white text-xs font-bold py-2.5 px-4 rounded-full shadow-sm hover:bg-[#c4006b] active:scale-95 transition-all tap-highlight flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Direct Question to {sp.name}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
