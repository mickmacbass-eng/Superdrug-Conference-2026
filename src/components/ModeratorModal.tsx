import React, { useState, useMemo } from 'react';
import { QAQuestion, Poll, CONFERENCE_INFO } from '../data/conferenceData';
import {
  Shield,
  Tv,
  CheckCircle,
  Pin,
  ArrowUp,
  Minimize2,
  Trash2,
  X,
  Download,
  Star,
  BarChart3,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Lock,
  KeyRound,
  Palette,
} from 'lucide-react';
import {
  getAllFeedbackSubmissions,
  downloadFeedbackCSV,
  FeedbackSubmission,
  FEEDBACK_STORAGE_KEY,
  INITIAL_FEEDBACK_ENTRIES,
} from '../data/feedbackData';
import { useBrand } from '../config/BrandContext';
import {
  setCustomOrganizerPasscode,
  resetOrganizerPasscode,
  hasCustomOrganizerPasscode,
} from '../utils/organizerAuth';

interface ModeratorModalProps {
  onClose: () => void;
  questions: QAQuestion[];
  polls: Poll[];
  onToggleUpvote: (id: string) => void;
  onMarkAnswered: (id: string) => void;
  onDeleteQuestion: (id: string) => void;
  initialTab?: 'questions' | 'polls' | 'feedback';
  onLockOrganizer?: () => void;
  onOpenBrandStudio?: () => void;
}

export const ModeratorModal: React.FC<ModeratorModalProps> = ({
  onClose,
  questions,
  polls,
  onToggleUpvote,
  onMarkAnswered,
  onDeleteQuestion,
  initialTab = 'questions',
  onLockOrganizer,
  onOpenBrandStudio,
}) => {
  const { config } = useBrand();
  const [activeTab, setActiveTab] = useState<'questions' | 'polls' | 'feedback'>(initialTab);
  const [stageModeActive, setStageModeActive] = useState(false);
  const [pinnedQuestionId, setPinnedQuestionId] = useState<string | null>(
    questions[0]?.id || null
  );

  // Passcode management panel state
  const [showPasscodePanel, setShowPasscodePanel] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeMessage, setPasscodeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCustomPasscode, setIsCustomPasscode] = useState(() => hasCustomOrganizerPasscode(config.id));

  // Feedback states
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>(() => {
    return getAllFeedbackSubmissions();
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);

  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      if (a.answered && !b.answered) return 1;
      if (!a.answered && b.answered) return -1;
      return b.upvotes - a.upvotes;
    });
  }, [questions]);

  const pinnedQuestion = questions.find((q) => q.id === pinnedQuestionId) || sortedQuestions[0];

  // Feedback Analytics Calculations
  const metrics = useMemo(() => {
    if (feedbackList.length === 0) {
      return {
        avgOverall: 0,
        avgContent: 0,
        avgVenue: 0,
        avgOrg: 0,
        promoterRate: 0,
        tagCounts: {} as Record<string, number>,
      };
    }

    let totalOverall = 0;
    let totalContent = 0;
    let totalVenue = 0;
    let totalOrg = 0;
    let promoterCount = 0;
    const tagCounts: Record<string, number> = {};

    feedbackList.forEach((fb) => {
      totalOverall += fb.overallRating;
      totalContent += fb.categoryRatings?.content || fb.overallRating;
      totalVenue += fb.categoryRatings?.venue || fb.overallRating;
      totalOrg += fb.categoryRatings?.organization || fb.overallRating;
      if (fb.overallRating >= 4) {
        promoterCount++;
      }
      fb.selectedTags?.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    const count = feedbackList.length;
    return {
      avgOverall: Number((totalOverall / count).toFixed(1)),
      avgContent: Number((totalContent / count).toFixed(1)),
      avgVenue: Number((totalVenue / count).toFixed(1)),
      avgOrg: Number((totalOrg / count).toFixed(1)),
      promoterRate: Math.round((promoterCount / count) * 100),
      tagCounts,
    };
  }, [feedbackList]);

  // Filtered Feedback
  const filteredFeedback = useMemo(() => {
    return feedbackList.filter((item) => {
      // Rating filter
      if (ratingFilter === '5' && item.overallRating !== 5) return false;
      if (ratingFilter === '4' && item.overallRating !== 4) return false;
      if (ratingFilter === '3' && item.overallRating > 3) return false;

      // Tag filter
      if (selectedTagFilter && !item.selectedTags?.includes(selectedTagFilter)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesComment = item.comment.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCompany = item.company.toLowerCase().includes(q);
        const matchesTags = item.selectedTags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesComment && !matchesName && !matchesCompany && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [feedbackList, ratingFilter, selectedTagFilter, searchQuery]);

  const handleExportCSV = () => {
    const success = downloadFeedbackCSV(feedbackList);
    if (success) {
      setDownloadSuccessToast(true);
      setTimeout(() => setDownloadSuccessToast(false), 3500);
    }
  };

  const handleDeleteFeedback = (id: string) => {
    const updated = feedbackList.filter((fb) => fb.id !== id);
    setFeedbackList(updated);
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleResetFeedback = () => {
    setFeedbackList(INITIAL_FEEDBACK_ENTRIES);
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(INITIAL_FEEDBACK_ENTRIES));
    } catch {
      // ignore
    }
  };

  // 1. STAGE CONFIDENCE MONITOR MODE (Full-screen for stage podium / prompter)
  if (stageModeActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black text-white p-6 flex flex-col justify-between overflow-y-auto">
        {/* Stage Top Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#E5007D] animate-ping" />
            <span className="text-xs font-bold tracking-widest uppercase text-[#E5007D]">
              STAGE CONFIDENCE MONITOR · THE PORTER TUN
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStageModeActive(false)}
              className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Back to Moderator Desk</span>
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big Screen Active Question */}
        {pinnedQuestion ? (
          <div className="my-auto py-8 max-w-3xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between text-neutral-400 text-xs border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{pinnedQuestion.author}</span>
                <span>·</span>
                <span>{pinnedQuestion.role}</span>
              </div>
              <div className="flex items-center gap-2 font-mono font-bold text-[#E5007D] text-sm">
                <ArrowUp className="w-4 h-4" />
                <span>{pinnedQuestion.upvotes} UPVOTES</span>
              </div>
            </div>

            <div className="text-xs font-bold text-[#E5007D] uppercase tracking-wider">
              Question for: {pinnedQuestion.targetSpeaker}
            </div>

            <blockquote className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-snug text-white">
              &ldquo;{pinnedQuestion.text}&rdquo;
            </blockquote>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={() => {
                  onMarkAnswered(pinnedQuestion.id);
                  const nextQ = sortedQuestions.find((q) => q.id !== pinnedQuestion.id && !q.answered);
                  if (nextQ) setPinnedQuestionId(nextQ.id);
                }}
                className="bg-[#E5007D] text-white text-sm font-bold py-3 px-6 rounded-full flex items-center gap-2 hover:bg-[#c4006b] shadow-lg tap-highlight cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark Question Answered &amp; Next</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center my-auto py-12 text-neutral-500">
            No questions currently in stage queue.
          </div>
        )}

        {/* Stage Bottom Status */}
        <div className="border-t border-neutral-800 pt-3 flex items-center justify-between text-xs text-neutral-400">
          <span>{CONFERENCE_INFO.name} · {CONFERENCE_INFO.dateShort}</span>
          <span className="font-mono text-neutral-300">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  const handleUpdatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeMessage(null);
    const trimmed = newPasscode.trim();
    if (trimmed.length < 4) {
      setPasscodeMessage({ type: 'error', text: 'Passcode must be at least 4 characters.' });
      return;
    }
    if (trimmed !== confirmPasscode.trim()) {
      setPasscodeMessage({ type: 'error', text: 'Passcodes do not match.' });
      return;
    }
    try {
      await setCustomOrganizerPasscode(trimmed, config.id);
      setIsCustomPasscode(true);
      setNewPasscode('');
      setConfirmPasscode('');
      setPasscodeMessage({ type: 'success', text: 'Organizer passcode updated.' });
      setTimeout(() => setPasscodeMessage(null), 3000);
    } catch (err) {
      setPasscodeMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update passcode.',
      });
    }
  };

  const handleResetPasscode = () => {
    resetOrganizerPasscode(config.id);
    setIsCustomPasscode(false);
    setNewPasscode('');
    setConfirmPasscode('');
    setPasscodeMessage({ type: 'success', text: 'Passcode reset to default.' });
    setTimeout(() => setPasscodeMessage(null), 3000);
  };

  // 2. ORGANIZER & MODERATOR DESK (Protected by OrganizerAuthModal)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-3xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-black flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-[#E5007D] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-black">
                Conference Organizer &amp; Moderator Desk
              </h2>
              <div className="text-[10px] text-neutral-500 font-semibold">
                {config.eventName} · Protected Host Dashboard
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {activeTab === 'questions' && (
              <button
                onClick={() => setStageModeActive(true)}
                className="bg-black text-white hover:bg-neutral-800 text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1.5 tap-highlight whitespace-nowrap shrink-0"
                title="Launch Stage Confidence Monitor"
              >
                <Tv className="w-3.5 h-3.5 text-[#E5007D]" />
                <span className="hidden xs:inline">Stage Screen</span>
              </button>
            )}

            {activeTab === 'feedback' && (
              <button
                onClick={handleExportCSV}
                className="bg-[#E5007D] hover:bg-[#c4006b] text-white text-xs font-bold py-1.5 px-3.5 rounded-full flex items-center gap-1.5 shadow-sm tap-highlight whitespace-nowrap shrink-0"
                title="Download attendee feedback spreadsheet"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            {onOpenBrandStudio && (
              <button
                type="button"
                onClick={onOpenBrandStudio}
                className="bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-100 text-xs font-bold py-1.5 px-2.5 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                title="Open Brand & Event Studio"
              >
                <Palette className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
                <span className="hidden sm:inline">Brand Studio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowPasscodePanel((prev) => !prev);
                setPasscodeMessage(null);
              }}
              className={`text-xs font-bold py-1.5 px-2.5 rounded-full border flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                showPasscodePanel
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
              title="Change organizer passcode"
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Passcode</span>
            </button>

            {onLockOrganizer && (
              <button
                type="button"
                onClick={onLockOrganizer}
                className="bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                title="Lock organizer access for this session"
              >
                <Lock className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
                <span>Lock</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-black transition-colors"
              aria-label="Close Organizer Desk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Passcode Settings Panel */}
        {showPasscodePanel && (
          <form
            onSubmit={handleUpdatePasscode}
            className="mt-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-bold text-black">Change Organizer Passcode</div>
                <div className="text-[11px] text-neutral-500">
                  {isCustomPasscode
                    ? 'Custom passcode active on this device.'
                    : 'Using default event passcode.'}
                </div>
              </div>
              {isCustomPasscode && (
                <button
                  type="button"
                  onClick={handleResetPasscode}
                  className="text-[11px] font-semibold text-neutral-600 hover:text-black underline"
                >
                  Reset to Default
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="password"
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                placeholder="New passcode (min 4 chars)"
                className="min-h-[40px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                type="password"
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="Confirm new passcode"
                className="min-h-[40px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px]">
                {passcodeMessage && (
                  <span
                    className={
                      passcodeMessage.type === 'error'
                        ? 'text-red-600 font-semibold'
                        : 'text-emerald-700 font-semibold'
                    }
                  >
                    {passcodeMessage.text}
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold text-white whitespace-nowrap"
                style={{ backgroundColor: config.colors.primaryAccent }}
              >
                Save Passcode
              </button>
            </div>
          </form>
        )}

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl mt-3 text-xs">
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'questions'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#E5007D]" />
            <span>Stage Q&amp;A Queue</span>
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full">
              {questions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'feedback'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#E5007D]" />
            <span>Feedback &amp; CSV</span>
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full">
              {feedbackList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('polls')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'polls'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#E5007D]" />
            <span>Live Polls</span>
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full">
              {polls.length}
            </span>
          </button>
        </div>

        {/* Download Success Banner */}
        {downloadSuccessToast && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">
                Feedback CSV file generated! ({feedbackList.length} supplier responses exported)
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-mono">
              superdrug-supplier-conference-feedback-2026.csv
            </span>
          </div>
        )}

        {/* TAB 1: FEEDBACK & ANALYTICS DASHBOARD */}
        {activeTab === 'feedback' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Average Rating
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-black">
                    {metrics.avgOverall}
                  </span>
                  <span className="text-xs text-neutral-400">/ 5.0</span>
                </div>
                <div className="flex items-center gap-0.5 mt-1 text-[#E5007D]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= Math.round(metrics.avgOverall)
                          ? 'fill-[#E5007D]'
                          : 'text-neutral-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Total Reviews
                </div>
                <div className="text-2xl font-black text-black mt-1">
                  {feedbackList.length}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                  {metrics.promoterRate}% Promoters (4-5★)
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Content &amp; Strategy
                </div>
                <div className="text-2xl font-black text-black mt-1">
                  {metrics.avgContent}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  Keynotes &amp; Retail Panels
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Venue &amp; Logistics
                </div>
                <div className="text-2xl font-black text-black mt-1">
                  {metrics.avgVenue}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  The Brewery &amp; Catering
                </div>
              </div>
            </div>

            {/* Category Score Breakdown Progress Bars */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  Category Performance Breakdown
                </span>
                <span className="text-[11px] text-neutral-400">Target Benchmark: 4.5+</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-neutral-700">Keynote Sessions &amp; Commercial Strategy</span>
                    <span className="font-bold text-black">{metrics.avgContent} / 5.0</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full transition-all duration-500"
                      style={{ width: `${(metrics.avgContent / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-neutral-700">The Brewery Venue &amp; Catering Experience</span>
                    <span className="font-bold text-black">{metrics.avgVenue} / 5.0</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E5007D] rounded-full transition-all duration-500"
                      style={{ width: `${(metrics.avgVenue / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-neutral-700">Conference App &amp; Session Logistics</span>
                    <span className="font-bold text-black">{metrics.avgOrg} / 5.0</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-800 rounded-full transition-all duration-500"
                      style={{ width: `${(metrics.avgOrg / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tag Breakdown Pills */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  Attendee Highlight Mentions
                </span>
                {selectedTagFilter && (
                  <button
                    onClick={() => setSelectedTagFilter(null)}
                    className="text-[11px] text-[#E5007D] font-bold hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(metrics.tagCounts).map(([tag, count]) => {
                  const isSelected = selectedTagFilter === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-black text-white border-black font-bold'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-black'
                      }`}
                    >
                      <span>{tag}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-[#E5007D] text-white' : 'bg-neutral-200 text-black'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verbatim Feedback Section & Search Toolbar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-black">
                    Supplier Verbatim Submissions ({filteredFeedback.length})
                  </span>
                  <button
                    onClick={handleResetFeedback}
                    className="text-[11px] text-neutral-400 hover:text-black flex items-center gap-1"
                    title="Reset sample feedback data"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Data</span>
                  </button>
                </div>

                {/* CSV Download Trigger */}
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black hover:bg-neutral-800 px-3 py-1.5 rounded-full transition-colors tap-highlight"
                >
                  <Download className="w-3.5 h-3.5 text-[#E5007D]" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search comments, supplier, or brand..."
                    className="w-full text-xs pl-8 pr-3 py-2 border border-neutral-200 rounded-xl focus:border-black outline-none bg-neutral-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setRatingFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      ratingFilter === 'all'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-neutral-500 hover:text-black'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setRatingFilter('5')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      ratingFilter === '5'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-neutral-500 hover:text-black'
                    }`}
                  >
                    5★
                  </button>
                  <button
                    onClick={() => setRatingFilter('4')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      ratingFilter === '4'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-neutral-500 hover:text-black'
                    }`}
                  >
                    4★
                  </button>
                  <button
                    onClick={() => setRatingFilter('3')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      ratingFilter === '3'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-neutral-500 hover:text-black'
                    }`}
                  >
                    ≤3★
                  </button>
                </div>
              </div>

              {/* Feedback Item Cards */}
              <div className="space-y-2.5">
                {filteredFeedback.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl">
                    No feedback records match the current filters.
                  </div>
                ) : (
                  filteredFeedback.map((item) => (
                    <div
                      key={item.id}
                      className="border border-neutral-200 hover:border-black rounded-2xl p-4 bg-white transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-black">
                              {item.name}
                            </span>
                            {item.company && (
                              <span className="text-xs text-neutral-500">
                                · {item.company}
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-400">
                              · {item.submittedAt}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= item.overallRating
                                      ? 'text-[#E5007D] fill-[#E5007D]'
                                      : 'text-neutral-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-black">
                              {item.overallRating}.0
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              (Content: {item.categoryRatings?.content ?? item.overallRating}★ · Venue: {item.categoryRatings?.venue ?? item.overallRating}★ · Org: {item.categoryRatings?.organization ?? item.overallRating}★)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="text-neutral-300 hover:text-red-600 p-1 transition-colors"
                          title="Remove response"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {item.selectedTags && item.selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.selectedTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.comment && (
                        <p className="text-xs text-neutral-800 leading-relaxed italic bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100">
                          &ldquo;{item.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE QUESTIONS QUEUE */}
        {activeTab === 'questions' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Live Incoming Questions Queue ({questions.length})
              </span>
              <span className="text-[11px] text-neutral-500">
                Ranked by Audience Upvotes
              </span>
            </div>

            <div className="space-y-3">
              {sortedQuestions.map((q) => {
                const isPinned = pinnedQuestionId === q.id;

                return (
                  <div
                    key={q.id}
                    className={`border rounded-2xl p-4 transition-all space-y-2 ${
                      q.answered
                        ? 'border-neutral-200 bg-neutral-50 opacity-60'
                        : isPinned
                        ? 'border-black bg-neutral-50 ring-2 ring-black'
                        : 'border-neutral-200 bg-white hover:border-black'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 flex-wrap">
                          <span className="font-bold text-black">{q.author}</span>
                          <span>·</span>
                          <span>{q.role}</span>
                          <span>·</span>
                          <span>{q.timestamp}</span>
                        </div>
                        <div className="text-xs font-bold text-[#E5007D] mt-0.5">
                          Directed To: {q.targetSpeaker}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-neutral-100 text-black px-2.5 py-1 rounded-full">
                          ▲ {q.upvotes}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-black leading-relaxed">
                      {q.text}
                    </p>

                    {/* Moderator Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPinnedQuestionId(q.id)}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${
                            isPinned
                              ? 'bg-[#E5007D] text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-black hover:text-white'
                          }`}
                        >
                          <Pin className="w-3 h-3" />
                          <span>{isPinned ? 'Pushed to Stage' : 'Push to Stage'}</span>
                        </button>

                        <button
                          onClick={() => onMarkAnswered(q.id)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                            q.answered
                              ? 'text-neutral-400'
                              : 'text-neutral-600 hover:text-black border border-neutral-200'
                          }`}
                        >
                          <CheckCircle className="w-3 h-3 text-[#E5007D]" />
                          <span>{q.answered ? 'Answered' : 'Mark Answered'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onDeleteQuestion(q.id)}
                        className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                        title="Archive question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE POLLS STATUS */}
        {activeTab === 'polls' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Active Audience Polls ({polls.length})
              </span>
              <span className="text-[11px] text-neutral-500">Live Stage Tallies</span>
            </div>

            <div className="space-y-4">
              {polls.map((poll) => {
                const totalVotes = poll.totalVotes || 1;
                return (
                  <div
                    key={poll.id}
                    className="border border-neutral-200 rounded-2xl p-4 bg-white space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-[#E5007D] uppercase tracking-wider">
                          {poll.sessionTitle}
                        </span>
                        <h4 className="text-sm font-bold text-black mt-0.5">
                          {poll.question}
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold bg-neutral-100 text-black px-2 py-0.5 rounded-full shrink-0">
                        {poll.totalVotes} votes
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {poll.options.map((opt) => {
                        const pct = Math.round((opt.votes / totalVotes) * 100);
                        return (
                          <div key={opt.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-700 font-medium">{opt.text}</span>
                              <span className="font-mono font-bold text-black">
                                {opt.votes} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#E5007D] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="border-t border-neutral-200 pt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>Superdrug Supplier Conference Host Control</span>
          <button
            onClick={onClose}
            className="bg-black text-white font-bold py-2 px-5 rounded-full text-xs hover:bg-neutral-800 tap-highlight cursor-pointer"
          >
            Close Organizer Panel
          </button>
        </div>
      </div>
    </div>
  );
};
