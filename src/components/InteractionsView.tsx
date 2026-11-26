import React, { useEffect, useState } from 'react';
import { Poll, Session, Speaker } from '../data/conferenceData';
import {
  Vote,
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBrand } from '../config/BrandContext';

interface InteractionsViewProps {
  polls: Poll[];
  sessions: Session[];
  speakers: Speaker[];
  pollsError?: string | null;
  onVotePoll: (pollId: string, optionId: string) => Promise<void>;
  onSubmitQuestion: (newQuestion: {
    questionText: string;
    delegateName: string;
    sessionName: string;
  }) => Promise<void>;
  initialTargetSpeaker?: string;
}

export const InteractionsView: React.FC<InteractionsViewProps> = ({
  polls,
  sessions,
  speakers,
  pollsError,
  onVotePoll,
  onSubmitQuestion,
  initialTargetSpeaker,
}) => {
  const { config } = useBrand();
  const speakerQuestionsEnabled = config.features.enableSpeakerQuestions !== false;

  const [activeTab, setActiveTab] = useState<'polls' | 'qa' | 'speakers'>(
    initialTargetSpeaker && speakerQuestionsEnabled ? 'qa' : 'polls'
  );

  // Live poll submission states
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Private speaker question form state
  const nonBreakSessions = sessions.filter((s) => !s.isBreak);
  const defaultSessionName =
    initialTargetSpeaker ||
    (nonBreakSessions[0] ? `${nonBreakSessions[0].title} (${nonBreakSessions[0].presenters})` : 'Executive Keynote Panel');

  const [questionText, setQuestionText] = useState('');
  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [delegateName, setDelegateName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [submittedToast, setSubmittedToast] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!speakerQuestionsEnabled && activeTab === 'qa') {
      setActiveTab('polls');
    }
  }, [speakerQuestionsEnabled, activeTab]);

  useEffect(() => {
    if (initialTargetSpeaker && speakerQuestionsEnabled) {
      setSessionName(initialTargetSpeaker);
      setActiveTab('qa');
    }
  }, [initialTargetSpeaker, speakerQuestionsEnabled]);

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

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion || isSubmittingQuestion) return;

    setIsSubmittingQuestion(true);
    setSubmitError(null);
    setSubmittedToast(false);

    try {
      await onSubmitQuestion({
        questionText: trimmedQuestion,
        delegateName: isAnonymous ? 'Anonymous' : delegateName.trim() || 'Anonymous',
        sessionName,
      });

      setQuestionText('');
      setSubmittedToast(true);
      setTimeout(() => setSubmittedToast(false), 5000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to send question.');
    } finally {
      setIsSubmittingQuestion(false);
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
            {speakerQuestionsEnabled
              ? 'Live audience polling, private speaker Q&A & speaker directory'
              : 'Live audience polling & keynote speaker directory'}
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

          {speakerQuestionsEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab('qa')}
              className={`flex-1 min-h-[40px] py-2 text-xs font-bold rounded-xl transition-all tap-highlight flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'qa'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'qa' ? 'text-[#E5007D]' : ''}`} />
              <span>Ask Speaker</span>
            </button>
          )}

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

          {polls.map((poll) => {
            const hasVoted = Boolean(poll.userVotedOptionId);
            const isVotingThisPoll = votingPollId === poll.id;

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
                    const percentage =
                      poll.totalVotes > 0
                        ? Math.round((option.votes / poll.totalVotes) * 100)
                        : 0;

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
                            <span
                              className={`text-xs font-medium leading-snug ${
                                isSelected ? 'text-black font-bold' : 'text-neutral-800'
                              }`}
                            >
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

      {/* TAB 2: PRIVATE SPEAKER Q&A (Questions hidden from regular delegates) */}
      {speakerQuestionsEnabled && activeTab === 'qa' && (
        <div className="space-y-4">
          <form
            onSubmit={handleQuestionSubmit}
            className="border-2 border-neutral-200 rounded-3xl p-5 bg-white space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Submit a Question to Speakers
              </span>
              <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1 whitespace-nowrap shrink-0">
                <Lock className="w-3 h-3 text-[#E5007D]" />
                Private to Moderator
              </span>
            </div>

            {/* Session / Speaker Selector */}
            <div>
              <label
                htmlFor="qa-session-select"
                className="text-[11px] text-neutral-600 font-semibold block mb-1"
              >
                Session or Speaker
              </label>
              <select
                id="qa-session-select"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full min-h-[44px] text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white text-black focus:outline-none focus:border-black font-medium"
              >
                <option value="Executive Keynote Panel">Executive Keynote Panel</option>
                <optgroup label="Conference Sessions">
                  {nonBreakSessions.map((s) => (
                    <option key={s.id} value={`${s.title} (${s.presenters})`}>
                      {s.time} · {s.title} — {s.presenters}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Keynote Speakers">
                  {speakers.map((sp) => (
                    <option key={sp.id} value={`${sp.name} (${sp.role})`}>
                      {sp.name} — {sp.role}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Delegate Name + Anonymous Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="qa-delegate-name"
                  className="text-[11px] text-neutral-600 font-semibold"
                >
                  Your Name (optional)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-neutral-300 text-black focus:ring-0 w-4 h-4 cursor-pointer accent-[#E5007D]"
                  />
                  <span>Submit anonymously</span>
                </label>
              </div>

              {!isAnonymous && (
                <input
                  id="qa-delegate-name"
                  type="text"
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Sarah Jenkins, L'Oréal UK"
                  className="w-full min-h-[44px] text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white text-black placeholder:text-neutral-400 focus:outline-none focus:border-black"
                />
              )}
            </div>

            {/* Question Input */}
            <div>
              <label
                htmlFor="qa-question-input"
                className="text-[11px] text-neutral-600 font-semibold block mb-1"
              >
                Your Question
              </label>
              <textarea
                id="qa-question-input"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ask an executive or panel speaker a question..."
                rows={4}
                maxLength={280}
                className="w-full text-xs p-3 rounded-2xl border border-neutral-200 focus:outline-none focus:border-black text-black placeholder:text-neutral-400 transition-colors resize-none"
              />
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {submittedToast && (
              <div
                role="status"
                className="p-3 bg-neutral-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#E5007D] shrink-0" />
                <span>Question sent to the moderator</span>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-400 tabular-nums">
                {280 - questionText.length} characters left
              </span>

              <button
                type="submit"
                disabled={!questionText.trim() || isSubmittingQuestion}
                className="min-h-[44px] bg-[#E5007D] text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-sm hover:bg-[#c4006b] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5 tap-highlight whitespace-nowrap shrink-0"
              >
                {isSubmittingQuestion ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Question</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Privacy Assurance Note (replaces public delegate Q&A feed) */}
          <div className="border border-neutral-200 rounded-2xl p-4 bg-neutral-50 text-xs text-neutral-600 leading-relaxed space-y-1">
            <div className="font-bold text-black">Private Stage Queue</div>
            <p className="text-[11px]">
              Submitted questions are routed privately to the conference moderator desk for live review and are not displayed publicly to other attendees.
            </p>
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
                    {sp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">{sp.bio}</p>

                {speakerQuestionsEnabled && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSessionName(`${sp.name} (${sp.role})`);
                        setActiveTab('qa');
                      }}
                      className="w-full min-h-[44px] bg-[#E5007D] text-white text-xs font-bold py-2.5 px-4 rounded-full shadow-sm hover:bg-[#c4006b] active:scale-95 transition-all tap-highlight flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Direct Question to {sp.name}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
