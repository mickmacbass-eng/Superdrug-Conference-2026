import React, { useState } from 'react';
import { Poll, Speaker } from '../data/conferenceData';
import {
  Vote,
  Users,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PollResultsPieChart, POLL_CHART_COLORS } from './PollResultsPieChart';

interface InteractionsViewProps {
  polls: Poll[];
  speakers: Speaker[];
  pollsError?: string | null;
  onVotePoll: (pollId: string, optionId: string) => Promise<void>;
}

export const InteractionsView: React.FC<InteractionsViewProps> = ({
  polls,
  speakers,
  pollsError,
  onVotePoll,
}) => {
  const [activeTab, setActiveTab] = useState<'polls' | 'speakers'>('polls');

  // Live poll submission states
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const handleVote = async (pollId: string, optionId: string, alreadyVoted: boolean) => {
    if (alreadyVoted || votingPollId === pollId) return;

    setVotingPollId(pollId);
    setVoteError(null);
    try {
      await onVotePoll(pollId, optionId);
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
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Unable to record your vote.');
    } finally {
      setVotingPollId(null);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Title & Segmented Sub-Navigation */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight">
            Interactions
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Live audience polling &amp; keynote speaker directory
          </p>
        </div>

        {/* Segmented Tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('polls')}
            className={`flex-1 min-h-[40px] py-2 text-xs font-bold rounded-xl transition-all tap-highlight flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'polls'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Vote className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'polls' ? 'text-[#E5007D]' : ''}`} />
            <span>Live Polls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('speakers')}
            className={`flex-1 min-h-[40px] py-2 text-xs font-bold rounded-xl transition-all tap-highlight flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'speakers'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Users className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'speakers' ? 'text-[#E5007D]' : ''}`} />
            <span>Speakers</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE POLLS (Real-Time Firestore Sync) */}
      {activeTab === 'polls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Active Floor Polls
            </span>
            <span className="text-[11px] text-[#E5007D] font-bold">Real-Time Cloud Sync</span>
          </div>

          {(pollsError || voteError) && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{voteError || pollsError}</span>
            </div>
          )}

          {polls.length === 0 ? (
            <div className="border border-dashed border-neutral-200 rounded-3xl p-8 bg-neutral-50/70 text-center space-y-2">
              <Vote className="w-7 h-7 text-neutral-400 mx-auto" />
              <h3 className="text-sm font-bold text-black">No Live Polls Open Right Now</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Check back during the next stage session — new floor polls appear here automatically as soon as the host activates them.
              </p>
            </div>
          ) : polls.map((poll) => {
            const hasVoted = Boolean(poll.userVotedOptionId);
            const isRevealed = Boolean(poll.resultsRevealed);
            const showResults = hasVoted || isRevealed;
            const isVotingThisPoll = votingPollId === poll.id;

            return (
              <div
                key={poll.id}
                className="border border-neutral-200 rounded-3xl p-5 bg-white space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-neutral-500">
                      {poll.sessionTitle}
                    </span>
                    {isRevealed && !hasVoted && (
                      <span className="text-[11px] font-bold text-[#E5007D] flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Eye className="w-3 h-3" />
                        Results Live
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-black leading-snug">
                    {poll.question}
                  </h3>
                </div>

                {/* Poll Options */}
                <div className="space-y-2.5">
                  {poll.options.map((option, optIndex) => {
                    const isSelected = poll.userVotedOptionId === option.id;
                    const percentage =
                      poll.totalVotes > 0
                        ? Math.round((option.votes / poll.totalVotes) * 100)
                        : 0;
                    const sliceColor = POLL_CHART_COLORS[optIndex % POLL_CHART_COLORS.length];

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={hasVoted || isVotingThisPoll}
                        onClick={() => handleVote(poll.id, option.id, hasVoted)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden tap-highlight ${
                          isSelected
                            ? 'border-black bg-neutral-50 ring-1 ring-black'
                            : hasVoted
                            ? 'border-neutral-200 bg-white cursor-default'
                            : 'border-neutral-200 hover:border-neutral-400 bg-white cursor-pointer'
                        }`}
                      >
                        {/* Dynamic Progress Bar Fill */}
                        {showResults && (
                          <div
                            className="absolute left-0 top-0 bottom-0 opacity-12 transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: sliceColor,
                            }}
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
                            <span
                              className={`text-xs font-medium leading-snug ${
                                isSelected ? 'text-black font-bold' : 'text-neutral-800'
                              }`}
                            >
                              {option.text}
                            </span>
                          </div>

                          {showResults && (
                            <span className="font-mono text-xs font-bold text-black tabular-nums shrink-0">
                              {percentage}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Recharts Pie Chart Visualization (when voted or moderator reveals results) */}
                {showResults && (
                  <PollResultsPieChart
                    poll={poll}
                    revealedByModerator={isRevealed && !hasVoted}
                  />
                )}

                {/* Poll Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
                  <span className="tabular-nums font-mono font-medium">
                    {poll.totalVotes} {poll.totalVotes === 1 ? 'response' : 'responses'}
                  </span>
                  {isVotingThisPoll ? (
                    <span className="text-neutral-600 font-semibold flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E5007D]" />
                      Recording vote...
                    </span>
                  ) : hasVoted ? (
                    <span className="text-[#E5007D] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Vote recorded · Live results
                    </span>
                  ) : isRevealed ? (
                    <span className="text-neutral-600 font-medium">
                      Results revealed · Tap to vote
                    </span>
                  ) : (
                    <span className="text-neutral-400 font-medium">
                      Tap once to cast your vote
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: KEYNOTE SPEAKERS DIRECTORY */}
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
                    {sp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">{sp.bio}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
