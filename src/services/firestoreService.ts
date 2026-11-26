import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import {
  db,
  formatFirestoreError,
  OperationType,
  withTimeout,
} from '../config/firebase';
import { INITIAL_POLLS, Poll, PollOption } from '../data/conferenceData';
import { FeedbackSubmission } from '../data/feedbackData';

export type SpeakerQuestionStatus = 'pending' | 'approved' | 'answered';

export interface SpeakerQuestion {
  id: string;
  questionText: string;
  delegateName: string;
  sessionName: string;
  status: SpeakerQuestionStatus;
  createdAtMs: number;
  createdAtLabel: string;
}

const VOTED_POLLS_STORAGE_KEY = 'sd_firestore_voted_polls_v1';
const LOCAL_QUESTIONS_KEY = 'sd_fallback_speaker_questions_v1';
const LOCAL_POLLS_KEY = 'sd_fallback_polls_v1';
const LOCAL_FEEDBACK_KEY = 'sd_fallback_event_feedback_v1';

const LOCAL_QUESTIONS_EVENT = 'sd:local-questions-updated';
const LOCAL_POLLS_EVENT = 'sd:local-polls-updated';
const LOCAL_FEEDBACK_EVENT = 'sd:local-feedback-updated';

const WRITE_TIMEOUT_MS = 4500;
const INITIAL_SNAPSHOT_FALLBACK_MS = 2500;

let hasAttemptedPollSeed = false;

function timestampToMs(value: unknown): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number') {
    return value;
  }
  return Date.now();
}

function formatTimeLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

function dispatchLocalEvent(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

// ============================================================================
// LOCAL FALLBACK HELPERS (ensures UI never hangs if Firestore is unreachable)
// ============================================================================

function readLocalQuestions(): SpeakerQuestion[] {
  try {
    const raw = localStorage.getItem(LOCAL_QUESTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SpeakerQuestion[]) : [];
  } catch {
    return [];
  }
}

function writeLocalQuestions(items: SpeakerQuestion[]) {
  try {
    localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
  dispatchLocalEvent(LOCAL_QUESTIONS_EVENT);
}

function defaultZeroPolls(): Poll[] {
  return INITIAL_POLLS.map((p) => ({
    ...p,
    totalVotes: 0,
    options: p.options.map((o) => ({ ...o, votes: 0 })),
  }));
}

function readLocalPolls(): Poll[] {
  try {
    const raw = localStorage.getItem(LOCAL_POLLS_KEY);
    if (!raw) return defaultZeroPolls();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Poll[]) : defaultZeroPolls();
  } catch {
    return defaultZeroPolls();
  }
}

function writeLocalPolls(polls: Poll[]) {
  try {
    localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify(polls));
  } catch {
    // ignore
  }
  dispatchLocalEvent(LOCAL_POLLS_EVENT);
}

function readLocalFeedback(): FeedbackSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackSubmission[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFeedback(items: FeedbackSubmission[]) {
  try {
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
  dispatchLocalEvent(LOCAL_FEEDBACK_EVENT);
}

// ============================================================================
// 1. PRIVATE SPEAKER Q&A (speaker_questions collection)
// ============================================================================

export async function submitSpeakerQuestion(input: {
  questionText: string;
  delegateName: string;
  sessionName: string;
}): Promise<string> {
  const questionText = input.questionText.trim().slice(0, 280);
  const delegateName = input.delegateName.trim().slice(0, 80) || 'Anonymous';
  const sessionName = input.sessionName.trim().slice(0, 140) || 'Executive Keynote Panel';

  if (!questionText) {
    throw new Error('Please enter a question before submitting.');
  }

  const nowMs = Date.now();
  const saveLocally = (): string => {
    const localId = `local_q_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
    const nextItem: SpeakerQuestion = {
      id: localId,
      questionText,
      delegateName,
      sessionName,
      status: 'pending',
      createdAtMs: nowMs,
      createdAtLabel: formatTimeLabel(nowMs),
    };
    writeLocalQuestions([nextItem, ...readLocalQuestions()]);
    return localId;
  };

  if (!db) {
    return saveLocally();
  }

  try {
    const docRef = await withTimeout(
      addDoc(collection(db, 'speaker_questions'), {
        questionText,
        delegateName,
        sessionName,
        status: 'pending' as SpeakerQuestionStatus,
        createdAt: serverTimestamp(),
      }),
      WRITE_TIMEOUT_MS,
      'Submit speaker question'
    );
    return docRef.id;
  } catch (error) {
    formatFirestoreError(error, OperationType.CREATE, 'speaker_questions');
    return saveLocally();
  }
}

export function subscribeSpeakerQuestions(
  onData: (questions: SpeakerQuestion[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  let remoteQuestions: SpeakerQuestion[] = [];
  let hasRemoteSnapshot = false;

  const emitMerged = () => {
    const localItems = readLocalQuestions();
    const seenIds = new Set(remoteQuestions.map((q) => q.id));
    const merged = [
      ...remoteQuestions,
      ...localItems.filter((item) => !seenIds.has(item.id)),
    ].sort((a, b) => b.createdAtMs - a.createdAtMs);
    onData(merged);
  };

  const handleLocalChange = () => emitMerged();
  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_QUESTIONS_EVENT, handleLocalChange);
  }

  if (!db) {
    emitMerged();
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOCAL_QUESTIONS_EVENT, handleLocalChange);
      }
    };
  }

  // Ensure Moderator UI never stays stuck on a loading spinner if Firestore is slow/offline
  const fallbackTimer = window.setTimeout(() => {
    if (!hasRemoteSnapshot) {
      emitMerged();
    }
  }, INITIAL_SNAPSHOT_FALLBACK_MS);

  let unsubFirestore: Unsubscribe = () => {};
  try {
    const q = query(collection(db, 'speaker_questions'), orderBy('createdAt', 'desc'));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        hasRemoteSnapshot = true;
        window.clearTimeout(fallbackTimer);
        remoteQuestions = snapshot.docs.map((snap) => {
          const data = snap.data();
          const createdAtMs = timestampToMs(data.createdAt);
          const rawStatus = data.status;
          const status: SpeakerQuestionStatus =
            rawStatus === 'approved' || rawStatus === 'answered' ? rawStatus : 'pending';

          return {
            id: snap.id,
            questionText: typeof data.questionText === 'string' ? data.questionText : '',
            delegateName:
              typeof data.delegateName === 'string' && data.delegateName.trim()
                ? data.delegateName
                : 'Anonymous',
            sessionName:
              typeof data.sessionName === 'string' && data.sessionName.trim()
                ? data.sessionName
                : 'General Session',
            status,
            createdAtMs,
            createdAtLabel: formatTimeLabel(createdAtMs),
          };
        });
        emitMerged();
      },
      (error) => {
        hasRemoteSnapshot = true;
        window.clearTimeout(fallbackTimer);
        formatFirestoreError(error, OperationType.LIST, 'speaker_questions');
        emitMerged();
        onError?.('Live cloud sync paused — showing local queue.');
      }
    );
  } catch (error) {
    window.clearTimeout(fallbackTimer);
    formatFirestoreError(error, OperationType.LIST, 'speaker_questions');
    emitMerged();
  }

  return () => {
    window.clearTimeout(fallbackTimer);
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(LOCAL_QUESTIONS_EVENT, handleLocalChange);
    }
  };
}

export async function updateSpeakerQuestionStatus(
  questionId: string,
  status: SpeakerQuestionStatus
): Promise<void> {
  const updateLocally = () => {
    const items = readLocalQuestions();
    if (items.some((q) => q.id === questionId)) {
      writeLocalQuestions(
        items.map((q) => (q.id === questionId ? { ...q, status } : q))
      );
    }
  };

  if (!db || questionId.startsWith('local_q_')) {
    updateLocally();
    return;
  }

  try {
    await withTimeout(
      updateDoc(doc(db, 'speaker_questions', questionId), { status }),
      WRITE_TIMEOUT_MS,
      'Update question status'
    );
  } catch (error) {
    formatFirestoreError(error, OperationType.UPDATE, `speaker_questions/${questionId}`);
    updateLocally();
  }
}

export async function deleteSpeakerQuestion(questionId: string): Promise<void> {
  const deleteLocally = () => {
    const items = readLocalQuestions();
    if (items.some((q) => q.id === questionId)) {
      writeLocalQuestions(items.filter((q) => q.id !== questionId));
    }
  };

  if (!db || questionId.startsWith('local_q_')) {
    deleteLocally();
    return;
  }

  try {
    await withTimeout(
      deleteDoc(doc(db, 'speaker_questions', questionId)),
      WRITE_TIMEOUT_MS,
      'Delete speaker question'
    );
    deleteLocally();
  } catch (error) {
    formatFirestoreError(error, OperationType.DELETE, `speaker_questions/${questionId}`);
    deleteLocally();
  }
}

// ============================================================================
// 2. LIVE POLLS (polls collection + per-device localStorage duplicate guard)
// ============================================================================

export function getLocalVotedPolls(): Record<string, string> {
  try {
    const raw = localStorage.getItem(VOTED_POLLS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveLocalPollVote(pollId: string, optionId: string): Record<string, string> {
  const current = getLocalVotedPolls();
  const updated = { ...current, [pollId]: optionId };
  try {
    localStorage.setItem(VOTED_POLLS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}

export function clearLocalPollVote(pollId: string): Record<string, string> {
  const current = getLocalVotedPolls();
  const updated = { ...current };
  delete updated[pollId];
  try {
    localStorage.setItem(VOTED_POLLS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

async function seedDefaultPollsIfEmpty(): Promise<void> {
  const firestore = db;
  if (!firestore || hasAttemptedPollSeed) return;
  hasAttemptedPollSeed = true;

  try {
    await withTimeout(
      Promise.all(
        INITIAL_POLLS.map((poll, index) =>
          setDoc(
            doc(firestore, 'polls', poll.id),
            {
              question: poll.question,
              sessionTitle: poll.sessionTitle,
              order: index + 1,
              totalVotes: 0,
              options: poll.options.map((opt) => ({
                id: opt.id,
                text: opt.text,
                votes: 0,
              })),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          )
        )
      ),
      WRITE_TIMEOUT_MS,
      'Seed default polls'
    );
  } catch (error) {
    formatFirestoreError(error, OperationType.WRITE, 'polls');
  }
}

export function subscribePolls(
  onData: (polls: Poll[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  const handleLocalChange = () => {
    onData(readLocalPolls());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_POLLS_EVENT, handleLocalChange);
  }

  if (!db) {
    onData(readLocalPolls());
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOCAL_POLLS_EVENT, handleLocalChange);
      }
    };
  }

  let unsubFirestore: Unsubscribe = () => {};
  try {
    unsubFirestore = onSnapshot(
      collection(db, 'polls'),
      (snapshot) => {
        if (snapshot.empty) {
          void seedDefaultPollsIfEmpty();
          onData(readLocalPolls());
          return;
        }

        const items = snapshot.docs
          .map((snap) => {
            const data = snap.data();
            const rawOptions = Array.isArray(data.options) ? data.options : [];
            const options: PollOption[] = rawOptions.map(
              (opt: Record<string, unknown>, idx: number) => ({
                id: typeof opt.id === 'string' ? opt.id : `opt_${idx}`,
                text: typeof opt.text === 'string' ? opt.text : '',
                votes: typeof opt.votes === 'number' && Number.isFinite(opt.votes) ? opt.votes : 0,
              })
            );
            const computedTotal = options.reduce((sum, opt) => sum + opt.votes, 0);
            const totalVotes =
              typeof data.totalVotes === 'number' && Number.isFinite(data.totalVotes)
                ? Math.max(data.totalVotes, computedTotal)
                : computedTotal;

            return {
              order: typeof data.order === 'number' ? data.order : 999,
              poll: {
                id: snap.id,
                question: typeof data.question === 'string' ? data.question : '',
                sessionTitle: typeof data.sessionTitle === 'string' ? data.sessionTitle : '',
                totalVotes,
                options,
              } as Poll,
            };
          })
          .sort((a, b) => a.order - b.order)
          .map((entry) => entry.poll);

        // Cache latest live tallies locally for seamless offline fallback
        try {
          localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify(items));
        } catch {
          // ignore
        }
        onData(items);
      },
      (error) => {
        formatFirestoreError(error, OperationType.LIST, 'polls');
        onData(readLocalPolls());
        onError?.('Live cloud sync paused — votes will still be recorded locally.');
      }
    );
  } catch (error) {
    formatFirestoreError(error, OperationType.LIST, 'polls');
    onData(readLocalPolls());
  }

  return () => {
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(LOCAL_POLLS_EVENT, handleLocalChange);
    }
  };
}

export async function castPollVote(pollId: string, optionId: string): Promise<void> {
  const existingVotes = getLocalVotedPolls();
  if (existingVotes[pollId]) {
    return;
  }

  const voteLocally = () => {
    const localPolls = readLocalPolls().map((poll) => {
      if (poll.id !== pollId) return poll;
      const updatedOptions = poll.options.map((opt) =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      );
      return {
        ...poll,
        options: updatedOptions,
        totalVotes: updatedOptions.reduce((sum, opt) => sum + opt.votes, 0),
      };
    });
    saveLocalPollVote(pollId, optionId);
    writeLocalPolls(localPolls);
  };

  if (!db) {
    voteLocally();
    return;
  }

  const pollRef = doc(db, 'polls', pollId);
  try {
    await withTimeout(
      runTransaction(db, async (transaction) => {
        const snap = await transaction.get(pollRef);

        if (!snap.exists()) {
          const fallback = INITIAL_POLLS.find((p) => p.id === pollId);
          if (!fallback) {
            throw new Error('Poll not found.');
          }
          const seededOptions = fallback.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.id === optionId ? 1 : 0,
          }));
          transaction.set(pollRef, {
            question: fallback.question,
            sessionTitle: fallback.sessionTitle,
            order: INITIAL_POLLS.findIndex((p) => p.id === pollId) + 1,
            totalVotes: 1,
            options: seededOptions,
            createdAt: serverTimestamp(),
          });
          return;
        }

        const data = snap.data();
        const rawOptions = Array.isArray(data.options) ? data.options : [];
        let matched = false;
        const updatedOptions = rawOptions.map((opt: Record<string, unknown>) => {
          const currentVotes = typeof opt.votes === 'number' ? opt.votes : 0;
          if (opt.id === optionId) {
            matched = true;
            return { ...opt, votes: currentVotes + 1 };
          }
          return { ...opt, votes: currentVotes };
        });

        if (!matched) {
          throw new Error('Selected poll option no longer exists.');
        }

        const newTotal = updatedOptions.reduce(
          (sum: number, opt: { votes: number }) => sum + opt.votes,
          0
        );

        transaction.update(pollRef, {
          options: updatedOptions,
          totalVotes: newTotal,
        });
      }),
      WRITE_TIMEOUT_MS,
      'Cast poll vote'
    );

    saveLocalPollVote(pollId, optionId);
  } catch (error) {
    formatFirestoreError(error, OperationType.UPDATE, `polls/${pollId}`);
    voteLocally();
  }
}

export async function resetPollVotes(poll: Poll): Promise<void> {
  const resetLocally = () => {
    const localPolls = readLocalPolls().map((p) =>
      p.id === poll.id
        ? {
            ...p,
            totalVotes: 0,
            options: p.options.map((opt) => ({ ...opt, votes: 0 })),
          }
        : p
    );
    clearLocalPollVote(poll.id);
    writeLocalPolls(localPolls);
  };

  if (!db) {
    resetLocally();
    return;
  }

  const pollRef = doc(db, 'polls', poll.id);
  try {
    await withTimeout(
      updateDoc(pollRef, {
        totalVotes: 0,
        options: poll.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          votes: 0,
        })),
      }),
      WRITE_TIMEOUT_MS,
      'Reset poll votes'
    );
    clearLocalPollVote(poll.id);
  } catch (error) {
    formatFirestoreError(error, OperationType.UPDATE, `polls/${poll.id}`);
    resetLocally();
  }
}

// ============================================================================
// 3. EVENT FEEDBACK (event_feedback collection)
// ============================================================================

export async function submitEventFeedback(
  submission: Omit<FeedbackSubmission, 'id' | 'timestamp'>,
  existingDocId?: string
): Promise<string> {
  const payload = {
    overallRating: Math.min(5, Math.max(1, Math.round(submission.overallRating))),
    categoryRatings: {
      content: Math.min(5, Math.max(1, Math.round(submission.categoryRatings.content))),
      venue: Math.min(5, Math.max(1, Math.round(submission.categoryRatings.venue))),
      organization: Math.min(5, Math.max(1, Math.round(submission.categoryRatings.organization))),
    },
    selectedTags: (submission.selectedTags || []).slice(0, 10),
    comment: (submission.comment || '').trim().slice(0, 1000),
    name: (submission.name || 'Anonymous Delegate').trim().slice(0, 80),
    company: (submission.company || '').trim().slice(0, 120),
    isAnonymous: Boolean(submission.isAnonymous),
    submittedAt: submission.submittedAt,
  };

  const saveLocally = (): string => {
    const localId =
      existingDocId || `local_fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: FeedbackSubmission = {
      ...payload,
      id: localId,
      timestamp: Date.now(),
    };
    const existing = readLocalFeedback().filter((item) => item.id !== localId);
    writeLocalFeedback([record, ...existing]);
    return localId;
  };

  if (!db) {
    return saveLocally();
  }

  try {
    if (existingDocId && !existingDocId.startsWith('local_fb_')) {
      await withTimeout(
        setDoc(
          doc(db, 'event_feedback', existingDocId),
          {
            ...payload,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        ),
        WRITE_TIMEOUT_MS,
        'Update event feedback'
      );
      return existingDocId;
    }

    const docRef = await withTimeout(
      addDoc(collection(db, 'event_feedback'), {
        ...payload,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }),
      WRITE_TIMEOUT_MS,
      'Submit event feedback'
    );
    return docRef.id;
  } catch (error) {
    formatFirestoreError(
      error,
      existingDocId ? OperationType.UPDATE : OperationType.CREATE,
      existingDocId ? `event_feedback/${existingDocId}` : 'event_feedback'
    );
    return saveLocally();
  }
}

export function subscribeEventFeedback(
  onData: (items: FeedbackSubmission[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  let remoteItems: FeedbackSubmission[] = [];
  let hasRemoteSnapshot = false;

  const emitMerged = () => {
    const localItems = readLocalFeedback();
    const seenIds = new Set(remoteItems.map((item) => item.id));
    const merged = [
      ...remoteItems,
      ...localItems.filter((item) => !seenIds.has(item.id)),
    ].sort((a, b) => b.timestamp - a.timestamp);
    onData(merged);
  };

  const handleLocalChange = () => emitMerged();
  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_FEEDBACK_EVENT, handleLocalChange);
  }

  if (!db) {
    emitMerged();
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOCAL_FEEDBACK_EVENT, handleLocalChange);
      }
    };
  }

  const fallbackTimer = window.setTimeout(() => {
    if (!hasRemoteSnapshot) {
      emitMerged();
    }
  }, INITIAL_SNAPSHOT_FALLBACK_MS);

  let unsubFirestore: Unsubscribe = () => {};
  try {
    const q = query(collection(db, 'event_feedback'), orderBy('createdAt', 'desc'));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        hasRemoteSnapshot = true;
        window.clearTimeout(fallbackTimer);
        remoteItems = snapshot.docs.map((snap) => {
          const data = snap.data();
          const ts = timestampToMs(data.createdAt);
          const overall = typeof data.overallRating === 'number' ? data.overallRating : 5;
          const rawCats =
            data.categoryRatings && typeof data.categoryRatings === 'object'
              ? (data.categoryRatings as Record<string, unknown>)
              : {};

          return {
            id: snap.id,
            overallRating: overall,
            categoryRatings: {
              content: typeof rawCats.content === 'number' ? rawCats.content : overall,
              venue: typeof rawCats.venue === 'number' ? rawCats.venue : overall,
              organization: typeof rawCats.organization === 'number' ? rawCats.organization : overall,
            },
            selectedTags: Array.isArray(data.selectedTags)
              ? data.selectedTags.filter((t): t is string => typeof t === 'string')
              : [],
            comment: typeof data.comment === 'string' ? data.comment : '',
            name: typeof data.name === 'string' ? data.name : 'Anonymous Delegate',
            company: typeof data.company === 'string' ? data.company : '',
            isAnonymous: Boolean(data.isAnonymous),
            submittedAt:
              typeof data.submittedAt === 'string' && data.submittedAt
                ? data.submittedAt
                : formatTimeLabel(ts),
            timestamp: ts,
          };
        });
        emitMerged();
      },
      (error) => {
        hasRemoteSnapshot = true;
        window.clearTimeout(fallbackTimer);
        formatFirestoreError(error, OperationType.LIST, 'event_feedback');
        emitMerged();
        onError?.('Live cloud sync paused — showing local feedback.');
      }
    );
  } catch (error) {
    window.clearTimeout(fallbackTimer);
    formatFirestoreError(error, OperationType.LIST, 'event_feedback');
    emitMerged();
  }

  return () => {
    window.clearTimeout(fallbackTimer);
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(LOCAL_FEEDBACK_EVENT, handleLocalChange);
    }
  };
}

export async function deleteEventFeedback(feedbackId: string): Promise<void> {
  const deleteLocally = () => {
    const items = readLocalFeedback();
    if (items.some((item) => item.id === feedbackId)) {
      writeLocalFeedback(items.filter((item) => item.id !== feedbackId));
    }
  };

  if (!db || feedbackId.startsWith('local_fb_')) {
    deleteLocally();
    return;
  }

  try {
    await withTimeout(
      deleteDoc(doc(db, 'event_feedback', feedbackId)),
      WRITE_TIMEOUT_MS,
      'Delete event feedback'
    );
    deleteLocally();
  } catch (error) {
    formatFirestoreError(error, OperationType.DELETE, `event_feedback/${feedbackId}`);
    deleteLocally();
  }
}
