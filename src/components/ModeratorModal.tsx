import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_SESSIONS, Poll } from '../data/conferenceData';
import {
  Shield,
  Trash2,
  X,
  Download,
  Star,
  BarChart3,
  Search,
  CheckCircle2,
  TrendingUp,
  Lock,
  KeyRound,
  Palette,
  AlertCircle,
  Loader2,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Radio,
  Pause,
  Check,
  RefreshCw,
  Armchair,
} from 'lucide-react';
import { OrganizerTablePlanTab } from './OrganizerTablePlanTab';
import {
  downloadFeedbackCSV,
  FeedbackSubmission,
} from '../data/feedbackData';
import { useBrand } from '../config/BrandContext';
import {
  getOrganizerPasscodeStatus,
  OrganizerPasscodeStatus,
  refreshOrganizerPasscodeSync,
  subscribeOrganizerPasscodeStatus,
} from '../utils/organizerAuth';
import {
  OWNER_SECURITY_DOC_PATH,
  subscribeEventFeedback,
  deleteEventFeedback,
  resetPollVotes,
  setPollResultsRevealed,
  createPoll,
  updatePoll,
  setPollActive,
  deletePoll,
  TablePlanData,
  EMPTY_TABLE_PLAN,
} from '../services/firestoreService';

interface ModeratorModalProps {
  onClose: () => void;
  polls: Poll[];
  tablePlan?: TablePlanData;
  initialTab?: 'feedback' | 'polls' | 'tables';
  onLockOrganizer?: () => void;
  onOpenBrandStudio?: () => void;
}

export const ModeratorModal: React.FC<ModeratorModalProps> = ({
  onClose,
  polls,
  tablePlan = EMPTY_TABLE_PLAN,
  initialTab = 'feedback',
  onLockOrganizer,
  onOpenBrandStudio,
}) => {
  const { config } = useBrand();
  const [activeTab, setActiveTab] = useState<'feedback' | 'polls' | 'tables'>(initialTab);
  const [actionError, setActionError] = useState<string | null>(null);

  // Read-only owner-locked passcode sync panel state
  const [showPasscodePanel, setShowPasscodePanel] = useState(false);
  const [passcodeStatus, setPasscodeStatus] = useState<OrganizerPasscodeStatus>(() =>
    getOrganizerPasscodeStatus()
  );
  const [refreshingPasscodeSync, setRefreshingPasscodeSync] = useState(false);
  const [syncVerifiedNotice, setSyncVerifiedNotice] = useState(false);

  // Real-time Firestore event_feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);
  const [resettingPollId, setResettingPollId] = useState<string | null>(null);
  const [togglingRevealPollId, setTogglingRevealPollId] = useState<string | null>(null);
  const [togglingActivePollId, setTogglingActivePollId] = useState<string | null>(null);
  const [confirmDeletePollId, setConfirmDeletePollId] = useState<string | null>(null);
  const [deletingPollId, setDeletingPollId] = useState<string | null>(null);

  // Poll Composer state (new draft poll)
  const sessionOptions = useMemo(
    () => [
      'General Conference Plenary',
      ...INITIAL_SESSIONS.filter((s) => !s.isBreak).map((s) => `${s.time} · ${s.title}`),
    ],
    []
  );
  const [showNewPollForm, setShowNewPollForm] = useState(false);
  const [newPollSession, setNewPollSession] = useState('General Conference Plenary');
  const [newPollCustomSession, setNewPollCustomSession] = useState('');
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollFormError, setPollFormError] = useState<string | null>(null);

  // Inline Edit Poll state
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editOptions, setEditOptions] = useState<{ id?: string; text: string; votes?: number }[]>([]);
  const [savingEditPoll, setSavingEditPoll] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Subscribe to Firestore event_feedback (ordered by createdAt desc)
  useEffect(() => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    const unsubscribe = subscribeEventFeedback(
      (items) => {
        setFeedbackList(items);
        setFeedbackLoading(false);
        setFeedbackError(null);
      },
      (errMessage) => {
        setFeedbackLoading(false);
        setFeedbackError(errMessage);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to live owner-locked passcode sync status
  useEffect(() => {
    return subscribeOrganizerPasscodeStatus((status) => {
      setPasscodeStatus(status);
    });
  }, []);

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

  const handleDeleteFeedback = async (id: string) => {
    setActionError(null);
    try {
      await deleteEventFeedback(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete feedback.');
    }
  };

  const handleResetPoll = async (poll: Poll) => {
    setResettingPollId(poll.id);
    setActionError(null);
    try {
      await resetPollVotes(poll);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to reset poll votes.');
    } finally {
      setResettingPollId(null);
    }
  };

  const handleToggleRevealPoll = async (poll: Poll) => {
    setTogglingRevealPollId(poll.id);
    setActionError(null);
    try {
      await setPollResultsRevealed(poll, !poll.resultsRevealed);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update poll result visibility.');
    } finally {
      setTogglingRevealPollId(null);
    }
  };

  const handleToggleActivePoll = async (poll: Poll) => {
    setTogglingActivePollId(poll.id);
    setActionError(null);
    try {
      const currentlyActive = poll.isActive !== false;
      await setPollActive(poll, !currentlyActive);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update poll live status.');
    } finally {
      setTogglingActivePollId(null);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setPollFormError(null);
    const resolvedSession =
      newPollSession === '__custom__'
        ? newPollCustomSession.trim() || 'General Conference Plenary'
        : newPollSession;
    const validOptions = newPollOptions.map((o) => o.trim()).filter(Boolean);

    if (!newPollQuestion.trim()) {
      setPollFormError('Please enter a poll question.');
      return;
    }
    if (validOptions.length < 2) {
      setPollFormError('Please enter at least 2 answer options.');
      return;
    }

    setCreatingPoll(true);
    setActionError(null);
    try {
      await createPoll({
        question: newPollQuestion,
        sessionTitle: resolvedSession,
        options: validOptions,
        isActive: false, // Hidden draft until organiser activates it
        order: polls.length + 1,
      });
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      setNewPollCustomSession('');
      setShowNewPollForm(false);
    } catch (err) {
      setPollFormError(err instanceof Error ? err.message : 'Unable to create poll.');
    } finally {
      setCreatingPoll(false);
    }
  };

  const startEditingPoll = (poll: Poll) => {
    setShowNewPollForm(false);
    setConfirmDeletePollId(null);
    setEditFormError(null);
    setEditingPollId(poll.id);
    setEditSessionTitle(poll.sessionTitle);
    setEditQuestion(poll.question);
    setEditOptions(poll.options.map((o) => ({ id: o.id, text: o.text, votes: o.votes })));
  };

  const handleSaveEditPoll = async (e: React.FormEvent, poll: Poll) => {
    e.preventDefault();
    setEditFormError(null);
    const validOptions = editOptions.filter((o) => o.text.trim().length > 0);
    if (!editQuestion.trim()) {
      setEditFormError('Please enter a poll question.');
      return;
    }
    if (validOptions.length < 2) {
      setEditFormError('Please keep at least 2 non-empty answer options.');
      return;
    }

    setSavingEditPoll(true);
    setActionError(null);
    try {
      await updatePoll(poll, {
        question: editQuestion,
        sessionTitle: editSessionTitle,
        options: validOptions.map((o) => ({ id: o.id, text: o.text })),
      });
      setEditingPollId(null);
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : 'Unable to update poll.');
    } finally {
      setSavingEditPoll(false);
    }
  };

  const handleConfirmDeletePoll = async (pollId: string) => {
    setDeletingPollId(pollId);
    setActionError(null);
    try {
      await deletePoll(pollId);
      setConfirmDeletePollId(null);
      if (editingPollId === pollId) {
        setEditingPollId(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete poll.');
    } finally {
      setDeletingPollId(null);
    }
  };

  const handleRefreshPasscodeSync = async () => {
    setRefreshingPasscodeSync(true);
    setSyncVerifiedNotice(false);
    try {
      const updated = await refreshOrganizerPasscodeSync();
      setPasscodeStatus(updated);
      if (!updated.syncError) {
        setSyncVerifiedNotice(true);
        setTimeout(() => setSyncVerifiedNotice(false), 3000);
      }
    } finally {
      setRefreshingPasscodeSync(false);
    }
  };

  const formatSyncTime = (ms: number | null): string => {
    if (!ms) return 'Not checked yet';
    try {
      return new Date(ms).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Just now';
    }
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
                setSyncVerifiedNotice(false);
              }}
              className={`text-xs font-bold py-1.5 px-2.5 rounded-full border flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                showPasscodePanel
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
              title="View owner-locked passcode status"
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

        {/* Read-Only Owner-Locked Passcode Status Panel */}
        {showPasscodePanel && (
          <div className="mt-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-black">
                  <Lock className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
                  <span>Owner-Locked Passcode</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Passcode editing is disabled in-app. Only the event owner can rotate the organiser passcode via Firebase, and updates apply automatically across all devices.
                </p>
              </div>
            </div>

            {/* Unboxed Status Metadata */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-600">
              <span className="font-semibold text-black">
                {passcodeStatus.source === 'firebase'
                  ? 'Synced via Firebase'
                  : 'Built-In Event Default'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {passcodeStatus.source === 'firebase'
                  ? passcodeStatus.usesHashedStorage
                    ? 'SHA-256 hash active'
                    : 'Owner record active'
                  : 'No Firebase override set yet'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Checked {formatSyncTime(passcodeStatus.lastSyncedAt)}
              </span>
            </div>

            {/* Owner Management Reference */}
            <div className="rounded-xl bg-white border border-neutral-200 px-3 py-2.5 text-[11px] text-neutral-600 leading-relaxed">
              <div className="font-semibold text-neutral-900">Owner Rotation Path</div>
              <div className="mt-0.5 break-all font-mono text-[11px] text-neutral-700">
                Firestore: {OWNER_SECURITY_DOC_PATH} (passcodeHash or passcode)
              </div>
            </div>

            {passcodeStatus.syncError && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>{passcodeStatus.syncError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
              <div className="text-[11px] font-semibold text-emerald-700 min-h-[16px]">
                {syncVerifiedNotice && 'Firebase passcode sync verified.'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshPasscodeSync}
                  disabled={refreshingPasscodeSync}
                  className="min-h-[40px] px-3.5 py-2 rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 shrink-0 ${refreshingPasscodeSync ? 'animate-spin' : ''}`}
                  />
                  <span>{refreshingPasscodeSync ? 'Checking...' : 'Refresh Sync'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasscodePanel(false)}
                  className="min-h-[40px] px-3.5 py-2 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl mt-3 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
            <span>
              Feedback<span className="hidden sm:inline"> &amp; CSV</span>
            </span>
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full tabular-nums">
              {feedbackList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('polls')}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'polls'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
            <span>Live Polls</span>
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full tabular-nums">
              {polls.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'tables'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Armchair className="w-3.5 h-3.5 text-[#E5007D] shrink-0" />
            <span>Table Plan</span>
            {tablePlan.delegateCount > 0 && (
              <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full tabular-nums">
                {tablePlan.delegateCount}
              </span>
            )}
          </button>
        </div>

        {/* Action / Firestore Error Banner */}
        {actionError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

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
            {feedbackError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{feedbackError}</span>
              </div>
            )}
            {feedbackLoading && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E5007D]" />
                <span>Connecting to live Firestore feedback stream...</span>
              </div>
            )}
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
                    Live Firestore Submissions ({filteredFeedback.length})
                  </span>
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

        {/* TAB 2: LIVE POLLS MANAGER (Real-Time Firestore polls) */}
        {activeTab === 'polls' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  Audience Polls ({polls.length})
                </span>
                <div className="text-[11px] text-neutral-500">
                  {polls.filter((p) => p.isActive !== false).length} Live ·{' '}
                  {polls.filter((p) => p.isActive === false).length} Draft · Real-Time Cloud Sync
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingPollId(null);
                  setConfirmDeletePollId(null);
                  setPollFormError(null);
                  setShowNewPollForm((prev) => !prev);
                }}
                className={`min-h-[38px] text-xs font-bold py-1.5 px-3.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 tap-highlight ${
                  showNewPollForm
                    ? 'bg-neutral-200 text-black hover:bg-neutral-300'
                    : 'bg-[#E5007D] text-white hover:bg-[#c4006b] shadow-sm'
                }`}
              >
                {showNewPollForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{showNewPollForm ? 'Close Form' : 'New Poll'}</span>
              </button>
            </div>

            {/* Inline New Poll Composer (Saved as Hidden Draft) */}
            {showNewPollForm && (
              <form
                onSubmit={(e) => void handleCreatePoll(e)}
                className="border-2 border-black rounded-2xl p-4 bg-neutral-50 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-black">
                      Create New Poll Question
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Saved as a hidden draft until you tap Go Live.
                    </p>
                  </div>
                </div>

                {/* Session Picker */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-700 block">
                    Session / Topic
                  </label>
                  <select
                    value={newPollSession}
                    onChange={(e) => setNewPollSession(e.target.value)}
                    className="w-full min-h-[40px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black focus:outline-none focus:border-black font-medium"
                  >
                    {sessionOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                    <option value="__custom__">Custom Session Title...</option>
                  </select>

                  {newPollSession === '__custom__' && (
                    <input
                      type="text"
                      value={newPollCustomSession}
                      onChange={(e) => setNewPollCustomSession(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Afternoon Trading Panel"
                      className="w-full min-h-[40px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus:outline-none focus:border-black"
                    />
                  )}
                </div>

                {/* Poll Question */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 block">
                    Poll Question
                  </label>
                  <input
                    type="text"
                    value={newPollQuestion}
                    onChange={(e) => setNewPollQuestion(e.target.value)}
                    maxLength={220}
                    placeholder="e.g. Which retail growth lever matters most for Q1 2027?"
                    className="w-full min-h-[42px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus:outline-none focus:border-black font-medium"
                  />
                </div>

                {/* Answer Options (2 to 6) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-neutral-700">
                      Answer Options ({newPollOptions.length}/6)
                    </label>
                    {newPollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={() => setNewPollOptions((prev) => [...prev, ''])}
                        className="text-[11px] font-bold text-[#E5007D] hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {newPollOptions.map((optText, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-neutral-400 w-4 shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={optText}
                          onChange={(e) =>
                            setNewPollOptions((prev) =>
                              prev.map((val, i) => (i === idx ? e.target.value : val))
                            )
                          }
                          maxLength={120}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 min-h-[40px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus:outline-none focus:border-black"
                        />
                        {newPollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewPollOptions((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                            aria-label={`Remove option ${idx + 1}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {pollFormError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{pollFormError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewPollForm(false)}
                    className="min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:text-black border border-neutral-300 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPoll}
                    className="min-h-[40px] px-5 py-2 rounded-full text-xs font-bold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {creatingPoll ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#E5007D]" />
                        <span>Save as Draft</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Polls List */}
            {polls.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-2xl space-y-2">
                <div className="font-bold text-black">No polls created yet</div>
                <p className="text-[11px]">
                  Tap <strong>New Poll</strong> above to draft a poll question and push it live to delegate phones when ready.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => {
                  const totalVotes = poll.totalVotes || 0;
                  const isActive = poll.isActive !== false;
                  const isEditingThis = editingPollId === poll.id;
                  const isConfirmingDelete = confirmDeletePollId === poll.id;

                  if (isEditingThis) {
                    return (
                      <form
                        key={poll.id}
                        onSubmit={(e) => void handleSaveEditPoll(e, poll)}
                        className="border-2 border-black rounded-2xl p-4 bg-neutral-50 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-black">
                            Edit Poll
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            Existing votes on kept options are preserved
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-700 block">
                            Session / Topic
                          </label>
                          <input
                            type="text"
                            value={editSessionTitle}
                            onChange={(e) => setEditSessionTitle(e.target.value)}
                            maxLength={120}
                            className="w-full min-h-[40px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black focus:outline-none focus:border-black"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-700 block">
                            Poll Question
                          </label>
                          <input
                            type="text"
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            maxLength={220}
                            className="w-full min-h-[42px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black focus:outline-none focus:border-black font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-neutral-700">
                              Answer Options ({editOptions.length}/6)
                            </label>
                            {editOptions.length < 6 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditOptions((prev) => [...prev, { text: '', votes: 0 }])
                                }
                                className="text-[11px] font-bold text-[#E5007D] hover:underline flex items-center gap-0.5"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Option</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {editOptions.map((opt, idx) => (
                              <div key={opt.id || `new_${idx}`} className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-neutral-400 w-4 shrink-0">
                                  {idx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) =>
                                    setEditOptions((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, text: e.target.value } : item
                                      )
                                    )
                                  }
                                  maxLength={120}
                                  placeholder={`Option ${idx + 1}`}
                                  className="flex-1 min-h-[40px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white text-black focus:outline-none focus:border-black"
                                />
                                {typeof opt.votes === 'number' && opt.votes > 0 && (
                                  <span className="text-[10px] font-mono text-neutral-500 tabular-nums whitespace-nowrap shrink-0">
                                    {opt.votes}v
                                  </span>
                                )}
                                {editOptions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditOptions((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                                    aria-label={`Remove option ${idx + 1}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {editFormError && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{editFormError}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingPollId(null)}
                            className="min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:text-black border border-neutral-300 bg-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingEditPoll}
                            className="min-h-[40px] px-5 py-2 rounded-full text-xs font-bold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                          >
                            {savingEditPoll ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#E5007D]" />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={poll.id}
                      className={`border rounded-2xl p-4 space-y-3 transition-colors ${
                        isActive
                          ? 'border-neutral-200 bg-white'
                          : 'border-dashed border-neutral-300 bg-neutral-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider flex-wrap">
                            <span className="text-[#E5007D]">{poll.sessionTitle}</span>
                            <span className="text-neutral-300">·</span>
                            <span
                              className={
                                isActive ? 'text-emerald-700' : 'text-amber-700'
                              }
                            >
                              {isActive ? 'Live to Delegates' : 'Draft · Hidden'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-black mt-0.5">
                            {poll.question}
                          </h4>
                        </div>

                        <span className="text-xs font-mono font-bold text-neutral-600 tabular-nums whitespace-nowrap shrink-0">
                          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {poll.options.map((opt) => {
                          const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                          return (
                            <div key={opt.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs gap-2">
                                <span className="text-neutral-700 font-medium">{opt.text}</span>
                                <span className="font-mono font-bold text-black tabular-nums whitespace-nowrap shrink-0">
                                  {opt.votes} ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#E5007D] rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Poll Action Controls */}
                      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Go Live / Pause Toggle */}
                          <button
                            type="button"
                            disabled={togglingActivePollId === poll.id}
                            onClick={() => void handleToggleActivePoll(poll)}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap ${
                              isActive
                                ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                                : 'bg-[#E5007D] text-white hover:bg-[#c4006b] shadow-xs'
                            }`}
                            title={
                              isActive
                                ? 'Pause poll and move back to hidden draft'
                                : 'Publish poll live to all delegate screens'
                            }
                          >
                            {togglingActivePollId === poll.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isActive ? (
                              <Pause className="w-3 h-3 shrink-0" />
                            ) : (
                              <Radio className="w-3 h-3 shrink-0" />
                            )}
                            <span>{isActive ? 'Pause to Draft' : 'Go Live'}</span>
                          </button>

                          {/* Reveal / Hide Pie Chart Results */}
                          <button
                            type="button"
                            disabled={togglingRevealPollId === poll.id}
                            onClick={() => void handleToggleRevealPoll(poll)}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap ${
                              poll.resultsRevealed
                                ? 'bg-black text-white hover:bg-neutral-800'
                                : 'text-neutral-700 hover:text-black border border-neutral-300 hover:border-black bg-white'
                            }`}
                            title={
                              poll.resultsRevealed
                                ? 'Hide chart & percentages from delegates who have not voted yet'
                                : 'Reveal pie chart & results to all delegate screens now'
                            }
                          >
                            {poll.resultsRevealed ? (
                              <>
                                <EyeOff className="w-3 h-3 shrink-0 text-[#E5007D]" />
                                <span>Hide Results</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3 shrink-0 text-[#E5007D]" />
                                <span>Reveal Results</span>
                              </>
                            )}
                          </button>

                          {/* Edit Poll */}
                          <button
                            type="button"
                            onClick={() => startEditingPoll(poll)}
                            className="text-[11px] font-semibold text-neutral-700 hover:text-black border border-neutral-200 hover:border-neutral-400 bg-white px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap"
                            title="Edit poll question or options"
                          >
                            <Pencil className="w-3 h-3 shrink-0" />
                            <span>Edit</span>
                          </button>

                          {/* Reset Votes */}
                          <button
                            type="button"
                            disabled={resettingPollId === poll.id}
                            onClick={() => void handleResetPoll(poll)}
                            className="text-[11px] font-semibold text-neutral-500 hover:text-black border border-neutral-200 hover:border-neutral-400 bg-white px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-colors whitespace-nowrap"
                            title="Reset poll votes to zero in Firestore"
                          >
                            <RotateCcw className={`w-3 h-3 ${resettingPollId === poll.id ? 'animate-spin' : ''}`} />
                            <span>Reset</span>
                          </button>
                        </div>

                        {/* Inline Two-Step Delete */}
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={deletingPollId === poll.id}
                              onClick={() => void handleConfirmDeletePoll(poll.id)}
                              className="text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-full whitespace-nowrap"
                            >
                              {deletingPollId === poll.id ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePollId(null)}
                              className="text-[11px] font-semibold text-neutral-600 hover:text-black px-2 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePollId(poll.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                            title="Delete poll"
                            aria-label="Delete poll"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TABLE PLAN UPLOAD & MANAGEMENT */}
        {activeTab === 'tables' && (
          <OrganizerTablePlanTab
            tablePlan={tablePlan}
            accentColor={config.colors.primaryAccent}
          />
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
