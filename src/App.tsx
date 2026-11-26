/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HubView } from './components/HubView';
import { RunningOrderView } from './components/RunningOrderView';
import { InteractionsView } from './components/InteractionsView';
import { SessionDetailModal } from './components/SessionDetailModal';
import { VenueModal } from './components/VenueModal';
import { ModeratorModal } from './components/ModeratorModal';
import { BrandStudioModal } from './components/BrandStudioModal';
import { SplashScreen } from './components/SplashScreen';
import { QRCodeModal } from './components/QRCodeModal';
import { OrganizerAuthModal } from './components/OrganizerAuthModal';
import { useBrand } from './config/BrandContext';
import {
  isOrganizerSessionUnlocked,
  setOrganizerSessionUnlocked,
} from './utils/organizerAuth';
import {
  INITIAL_SESSIONS,
  INITIAL_POLLS,
  FEATURED_SPEAKERS,
  Session,
  Poll,
} from './data/conferenceData';
import {
  castPollVote,
  getLocalVotedPolls,
  submitSpeakerQuestion,
  subscribePolls,
} from './services/firestoreService';

export default function App() {
  const { config } = useBrand();
  const [activeTab, setActiveTab] = useState<NavTab>('hub');

  // Bookmarks persistence (personal per-device schedule)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sd_saved_sessions');
      return saved ? new Set(JSON.parse(saved)) : new Set(['s2', 's8']);
    } catch {
      return new Set(['s2', 's8']);
    }
  });

  // Real-Time Firestore Polls + per-device duplicate vote guard
  const [remotePolls, setRemotePolls] = useState<Poll[]>(() =>
    INITIAL_POLLS.map((p) => ({
      ...p,
      totalVotes: 0,
      options: p.options.map((o) => ({ ...o, votes: 0 })),
    }))
  );
  const [pollsError, setPollsError] = useState<string | null>(null);
  const [votedPollsMap, setVotedPollsMap] = useState<Record<string, string>>(() =>
    getLocalVotedPolls()
  );

  useEffect(() => {
    const unsubscribe = subscribePolls(
      (livePolls) => {
        setRemotePolls(livePolls);
        setPollsError(null);
      },
      (errMessage) => {
        setPollsError(errMessage);
      }
    );
    return () => unsubscribe();
  }, []);

  const polls: Poll[] = remotePolls.map((poll) => ({
    ...poll,
    userVotedOptionId: votedPollsMap[poll.id],
  }));

  // Modals & Organizer Access Guard
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showModeratorModal, setShowModeratorModal] = useState(false);
  const [moderatorTab, setModeratorTab] = useState<'questions' | 'polls' | 'feedback'>('questions');
  const [showBrandStudioModal, setShowBrandStudioModal] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [targetSpeakerForQA, setTargetSpeakerForQA] = useState<string | undefined>(undefined);

  type AdminTarget =
    | { type: 'moderator'; tab: 'questions' | 'polls' | 'feedback' }
    | { type: 'brand-studio' };

  const [isOrganizerUnlocked, setIsOrganizerUnlocked] = useState<boolean>(() =>
    isOrganizerSessionUnlocked()
  );
  const [pendingAdminTarget, setPendingAdminTarget] = useState<AdminTarget | null>(null);

  const openAdminTarget = (target: AdminTarget) => {
    if (target.type === 'moderator') {
      setModeratorTab(target.tab);
      setShowModeratorModal(true);
    } else {
      setShowBrandStudioModal(true);
    }
  };

  const requestOrganizerAccess = (target: AdminTarget) => {
    if (isOrganizerUnlocked) {
      openAdminTarget(target);
    } else {
      setPendingAdminTarget(target);
    }
  };

  const handleOrganizerAuthenticated = () => {
    setOrganizerSessionUnlocked(true);
    setIsOrganizerUnlocked(true);
    if (pendingAdminTarget) {
      const target = pendingAdminTarget;
      setPendingAdminTarget(null);
      openAdminTarget(target);
    }
  };

  const handleLockOrganizer = () => {
    setOrganizerSessionUnlocked(false);
    setIsOrganizerUnlocked(false);
    setShowModeratorModal(false);
    setShowBrandStudioModal(false);
    setPendingAdminTarget(null);
  };

  const getPendingTargetLabel = (target: AdminTarget): string => {
    if (target.type === 'brand-studio') return 'Brand & Event Studio';
    if (target.tab === 'feedback') return 'Organizer Feedback Dashboard';
    if (target.tab === 'polls') return 'Live Poll Controls';
    return 'Organizer & Moderator Desk';
  };

  // Hidden 5-tap footer shortcut detector (resets after 2.5s of inactivity)
  const footerTapCountRef = useRef(0);
  const footerTapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (footerTapTimerRef.current !== null) {
        window.clearTimeout(footerTapTimerRef.current);
      }
    };
  }, []);

  const handleCopyrightTap = () => {
    footerTapCountRef.current += 1;

    if (footerTapTimerRef.current !== null) {
      window.clearTimeout(footerTapTimerRef.current);
    }

    if (footerTapCountRef.current >= 5) {
      footerTapCountRef.current = 0;
      footerTapTimerRef.current = null;
      requestOrganizerAccess({ type: 'moderator', tab: 'feedback' });
      return;
    }

    footerTapTimerRef.current = window.setTimeout(() => {
      footerTapCountRef.current = 0;
      footerTapTimerRef.current = null;
    }, 2500);
  };

  // Splash Screen Landing State (defaults to showing unless user toggled skip)
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const searchLower = window.location.search.toLowerCase();
        const hashLower = window.location.hash.toLowerCase();
        if (searchLower.includes('splash') || hashLower.includes('splash')) {
          return true;
        }
        if (
          searchLower.includes('feedback') ||
          searchLower.includes('moderator') ||
          searchLower.includes('organiser') ||
          searchLower.includes('organizer') ||
          searchLower.includes('studio') ||
          searchLower.includes('brand=true') ||
          hashLower.includes('organiser') ||
          hashLower.includes('organizer') ||
          hashLower === '#brand' ||
          searchLower.includes('qr')
        ) {
          return false;
        }
        return localStorage.getItem('sd_skip_splash') !== 'true';
      }
      return true;
    } catch {
      return true;
    }
  });

  // Check URL parameters (?organiser=true, ?organizer=true, ?moderator, ?feedback, ?brand=true, ?studio, ?splash, ?qr)
  // Organizer-specific deep links always route through requestOrganizerAccess before opening
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();

    const hasTruthyParam = (key: string) => {
      if (!params.has(key)) return false;
      const val = params.get(key)?.toLowerCase();
      return val !== 'false' && val !== '0';
    };

    const isOrganiserLink =
      hasTruthyParam('organiser') ||
      hasTruthyParam('organizer') ||
      hash.includes('organiser') ||
      hash.includes('organizer');

    if (params.has('splash') || hash.includes('splash')) {
      setShowSplash(true);
    } else if (params.has('qr') || hash.includes('qr')) {
      setShowSplash(false);
      setShowQRCodeModal(true);
    } else if (
      params.has('feedback') ||
      hash.includes('feedback') ||
      isOrganiserLink
    ) {
      setShowSplash(false);
      requestOrganizerAccess({ type: 'moderator', tab: 'feedback' });
    } else if (params.has('moderator') || hash.includes('moderator')) {
      setShowSplash(false);
      requestOrganizerAccess({ type: 'moderator', tab: 'questions' });
    }

    // Only open Brand Studio modal on explicit ?brand=true, ?studio, or #brand
    // (preserves ?brand=boots / ?brand=sephora public theme links without prompting delegates)
    if (params.get('brand') === 'true' || hasTruthyParam('studio') || hash === '#brand') {
      setShowSplash(false);
      requestOrganizerAccess({ type: 'brand-studio' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sd_saved_sessions', JSON.stringify(Array.from(bookmarkedIds)));
    } catch {
      // ignore
    }
  }, [bookmarkedIds]);

  const toggleBookmark = (sessionId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (votedPollsMap[pollId]) return;
    await castPollVote(pollId, optionId);
    setVotedPollsMap(getLocalVotedPolls());
  };

  const handleSubmitQuestion = async (newQ: {
    questionText: string;
    delegateName: string;
    sessionName: string;
  }) => {
    await submitSpeakerQuestion(newQ);
  };

  const handleNavigateToInteractionsWithSpeaker = (speakerName?: string) => {
    setTargetSpeakerForQA(speakerName);
    setActiveTab('interactions');
  };

  const currentLiveSession = INITIAL_SESSIONS.find((s) => s.isLive) || INITIAL_SESSIONS[1];
  const unvotedPollCount = polls.filter((p) => !p.userVotedOptionId).length;

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#11000b] flex justify-center items-center text-white selection:bg-[#E5007D] selection:text-white sm:py-4">
        <div className="w-full max-w-md min-h-screen sm:min-h-0 sm:rounded-[32px] overflow-hidden bg-[#11000b] flex flex-col shadow-2xl relative">
          <SplashScreen
            onEnter={(tab) => {
              if (tab) setActiveTab(tab);
              setShowSplash(false);
              window.scrollTo({ top: 0 });
            }}
            onOpenVenue={() => {
              setShowSplash(false);
              setShowVenueModal(true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center text-black selection:bg-brand selection:text-white">
      {/* Mobile-First Device Canvas Container */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col relative shadow-2xl border-x border-neutral-200">
        {/* Sticky Top Header */}
        <Header
          onOpenVenueMap={() => setShowVenueModal(true)}
          onOpenSplash={() => setShowSplash(true)}
          onOpenQRCode={() => setShowQRCodeModal(true)}
        />

        {/* Main View Area */}
        <main className="flex-1 px-4 pt-4">
          {activeTab === 'hub' && (
            <HubView
              currentLiveSession={currentLiveSession}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenVenueModal={() => setShowVenueModal(true)}
              onOpenSessionModal={(session) => setSelectedSession(session)}
              onOpenQRCode={() => setShowQRCodeModal(true)}
            />
          )}

          {activeTab === 'running-order' && (
            <RunningOrderView
              sessions={INITIAL_SESSIONS}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              onSelectSession={(session) => setSelectedSession(session)}
              onNavigateToInteractions={handleNavigateToInteractionsWithSpeaker}
            />
          )}

          {activeTab === 'interactions' && (
            <InteractionsView
              polls={polls}
              sessions={INITIAL_SESSIONS}
              speakers={FEATURED_SPEAKERS}
              pollsError={pollsError}
              onVotePoll={handleVotePoll}
              onSubmitQuestion={handleSubmitQuestion}
              initialTargetSpeaker={targetSpeakerForQA}
            />
          )}

          {/* Quiet Copyright Footer (includes hidden 5-tap organiser shortcut) */}
          <footer className="pt-4 pb-24 text-center">
            <div
              onClick={handleCopyrightTap}
              className="inline-flex items-center justify-center min-h-[44px] px-4 text-[11px] text-neutral-400 select-none touch-manipulation"
            >
              <span>
                &copy; 2026 {config.name} &middot; {config.eventName}
              </span>
            </div>
          </footer>
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          savedCount={bookmarkedIds.size}
          unvotedPollCount={unvotedPollCount}
        />

        {/* Modals */}
        {selectedSession && (
          <SessionDetailModal
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            isBookmarked={bookmarkedIds.has(selectedSession.id)}
            onToggleBookmark={toggleBookmark}
            onAskSpeaker={handleNavigateToInteractionsWithSpeaker}
          />
        )}

        {showVenueModal && (
          <VenueModal onClose={() => setShowVenueModal(false)} />
        )}

        {isOrganizerUnlocked && showModeratorModal && (
          <ModeratorModal
            onClose={() => setShowModeratorModal(false)}
            polls={polls}
            initialTab={moderatorTab}
            onLockOrganizer={handleLockOrganizer}
            onOpenBrandStudio={() => {
              setShowModeratorModal(false);
              setShowBrandStudioModal(true);
            }}
          />
        )}

        {isOrganizerUnlocked && showBrandStudioModal && (
          <BrandStudioModal
            onClose={() => setShowBrandStudioModal(false)}
            onLockOrganizer={handleLockOrganizer}
            onOpenOrganizerDesk={() => {
              setShowBrandStudioModal(false);
              setShowModeratorModal(true);
            }}
          />
        )}

        {pendingAdminTarget && (
          <OrganizerAuthModal
            targetLabel={getPendingTargetLabel(pendingAdminTarget)}
            onAuthenticated={handleOrganizerAuthenticated}
            onCancel={() => setPendingAdminTarget(null)}
          />
        )}

        {showQRCodeModal && (
          <QRCodeModal onClose={() => setShowQRCodeModal(false)} />
        )}
      </div>
    </div>
  );
}
