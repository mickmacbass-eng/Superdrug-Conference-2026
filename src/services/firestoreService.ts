import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  ensureFirestoreReady,
  formatFirestoreError,
  getActiveFirestore,
  getFirestoreAvailability,
  isDatabaseNotFoundError,
  OperationType,
  withTimeout,
} from '../config/firebase';
import { INITIAL_POLLS, Poll, PollOption } from '../data/conferenceData';
import { FeedbackSubmission } from '../data/feedbackData';

const VOTED_POLLS_STORAGE_KEY = 'sd_firestore_voted_polls_v1';
const LOCAL_POLLS_KEY = 'sd_fallback_polls_v1';
const LOCAL_FEEDBACK_KEY = 'sd_fallback_event_feedback_v1';

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

const POLLS_INITIALIZED_KEY = 'sd_polls_initialized_v1';

function markPollsInitialized() {
  try {
    localStorage.setItem(POLLS_INITIALIZED_KEY, 'true');
  } catch {
    // ignore
  }
}

function werePollsInitialized(): boolean {
  try {
    return localStorage.getItem(POLLS_INITIALIZED_KEY) === 'true';
  } catch {
    return false;
  }
}

function defaultZeroPolls(): Poll[] {
  return INITIAL_POLLS.map((p) => ({
    ...p,
    totalVotes: 0,
    isActive: true,
    resultsRevealed: false,
    options: p.options.map((o) => ({ ...o, votes: 0 })),
  }));
}

function readLocalPolls(): Poll[] {
  try {
    const raw = localStorage.getItem(LOCAL_POLLS_KEY);
    if (raw === null) return werePollsInitialized() ? [] : defaultZeroPolls();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Poll[];
    }
    return werePollsInitialized() ? [] : defaultZeroPolls();
  } catch {
    return werePollsInitialized() ? [] : defaultZeroPolls();
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
// 1. LIVE POLLS (polls collection + per-device localStorage duplicate guard)
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
  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore || hasAttemptedPollSeed || werePollsInitialized()) return;
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
              isActive: true,
              resultsRevealed: false,
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
    markPollsInitialized();
  } catch (error) {
    formatFirestoreError(error, OperationType.WRITE, 'polls');
  }
}

export function subscribePolls(
  onData: (polls: Poll[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  let cancelled = false;
  let unsubFirestore: Unsubscribe = () => {};

  const handleLocalChange = () => {
    onData(readLocalPolls());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_POLLS_EVENT, handleLocalChange);
  }

  // Serve local/cached polls immediately so UI never blocks during probe
  onData(readLocalPolls());

  void ensureFirestoreReady().then((ready) => {
    if (cancelled) return;
    if (!ready) {
      return;
    }

    const firestore = getActiveFirestore();
    if (!firestore) return;

    try {
      unsubFirestore = onSnapshot(
        collection(firestore, 'polls'),
      (snapshot) => {
        if (snapshot.empty) {
          if (!werePollsInitialized()) {
            void seedDefaultPollsIfEmpty();
            onData(readLocalPolls());
          } else {
            try {
              localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify([]));
            } catch {
              // ignore
            }
            onData([]);
          }
          return;
        }

        markPollsInitialized();

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
                resultsRevealed: Boolean(data.resultsRevealed),
                isActive: data.isActive !== false,
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
        if (!isDatabaseNotFoundError(error)) {
          onError?.('Live cloud sync paused — votes will still be recorded locally.');
        }
      }
    );
    } catch (error) {
      formatFirestoreError(error, OperationType.LIST, 'polls');
      onData(readLocalPolls());
    }
  });

  return () => {
    cancelled = true;
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

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    voteLocally();
    return;
  }

  const pollRef = doc(firestore, 'polls', pollId);
  try {
    await withTimeout(
      runTransaction(firestore, async (transaction) => {
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
            resultsRevealed: false,
            options: p.options.map((opt) => ({ ...opt, votes: 0 })),
          }
        : p
    );
    clearLocalPollVote(poll.id);
    writeLocalPolls(localPolls);
  };

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    resetLocally();
    return;
  }

  const pollRef = doc(firestore, 'polls', poll.id);
  try {
    await withTimeout(
      updateDoc(pollRef, {
        totalVotes: 0,
        resultsRevealed: false,
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

export async function setPollResultsRevealed(
  poll: Poll,
  revealed: boolean
): Promise<void> {
  const updateLocally = () => {
    const localPolls = readLocalPolls().map((p) =>
      p.id === poll.id ? { ...p, resultsRevealed: revealed } : p
    );
    writeLocalPolls(localPolls);
  };

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    updateLocally();
    return;
  }

  const pollRef = doc(firestore, 'polls', poll.id);
  try {
    await withTimeout(
      setDoc(
        pollRef,
        {
          question: poll.question,
          sessionTitle: poll.sessionTitle,
          totalVotes: poll.totalVotes,
          resultsRevealed: revealed,
          isActive: poll.isActive !== false,
          options: poll.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.votes,
          })),
        },
        { merge: true }
      ),
      WRITE_TIMEOUT_MS,
      'Toggle poll results visibility'
    );
  } catch (error) {
    formatFirestoreError(error, OperationType.UPDATE, `polls/${poll.id}`);
    updateLocally();
  }
}

export async function createPoll(input: {
  question: string;
  sessionTitle: string;
  options: string[];
  isActive?: boolean;
  order?: number;
}): Promise<string> {
  const question = input.question.trim().slice(0, 220);
  const sessionTitle = input.sessionTitle.trim().slice(0, 120) || 'General Plenary';
  const cleanedOptions = input.options
    .map((text) => text.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 6);

  if (!question) {
    throw new Error('Please enter a poll question.');
  }
  if (cleanedOptions.length < 2) {
    throw new Error('Please provide at least two answer options.');
  }

  const isActive = input.isActive ?? false; // Hidden draft by default
  const pollId = `poll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const optionItems: PollOption[] = cleanedOptions.map((text, idx) => ({
    id: `opt_${idx + 1}_${Math.random().toString(36).slice(2, 5)}`,
    text,
    votes: 0,
  }));

  const existingLocal = readLocalPolls();
  const order = typeof input.order === 'number' ? input.order : existingLocal.length + 1;

  const saveLocally = (): string => {
    markPollsInitialized();
    const newPoll: Poll = {
      id: pollId,
      question,
      sessionTitle,
      totalVotes: 0,
      resultsRevealed: false,
      isActive,
      options: optionItems,
    };
    writeLocalPolls([...existingLocal, newPoll]);
    return pollId;
  };

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    return saveLocally();
  }

  try {
    await withTimeout(
      setDoc(doc(firestore, 'polls', pollId), {
        question,
        sessionTitle,
        order,
        totalVotes: 0,
        resultsRevealed: false,
        isActive,
        options: optionItems,
        createdAt: serverTimestamp(),
      }),
      WRITE_TIMEOUT_MS,
      'Create poll'
    );
    markPollsInitialized();
    return pollId;
  } catch (error) {
    formatFirestoreError(error, OperationType.CREATE, `polls/${pollId}`);
    return saveLocally();
  }
}

export async function updatePoll(
  poll: Poll,
  updates: {
    question: string;
    sessionTitle: string;
    options: { id?: string; text: string }[];
  }
): Promise<void> {
  const question = updates.question.trim().slice(0, 220);
  const sessionTitle = updates.sessionTitle.trim().slice(0, 120) || 'General Plenary';

  const existingVotesById = new Map(poll.options.map((o) => [o.id, o.votes]));
  const nextOptions: PollOption[] = updates.options
    .map((item, idx) => {
      const text = item.text.trim().slice(0, 120);
      if (!text) return null;
      const id =
        item.id && existingVotesById.has(item.id)
          ? item.id
          : `opt_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`;
      return {
        id,
        text,
        votes: existingVotesById.get(id) ?? 0,
      };
    })
    .filter((item): item is PollOption => item !== null)
    .slice(0, 6);

  if (!question) {
    throw new Error('Please enter a poll question.');
  }
  if (nextOptions.length < 2) {
    throw new Error('Please provide at least two answer options.');
  }

  const totalVotes = nextOptions.reduce((sum, opt) => sum + opt.votes, 0);

  const updateLocally = () => {
    const localPolls = readLocalPolls().map((p) =>
      p.id === poll.id
        ? {
            ...p,
            question,
            sessionTitle,
            options: nextOptions,
            totalVotes,
          }
        : p
    );
    writeLocalPolls(localPolls);
  };

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    updateLocally();
    return;
  }

  try {
    await withTimeout(
      setDoc(
        doc(firestore, 'polls', poll.id),
        {
          question,
          sessionTitle,
          options: nextOptions,
          totalVotes,
          resultsRevealed: Boolean(poll.resultsRevealed),
          isActive: poll.isActive !== false,
        },
        { merge: true }
      ),
      WRITE_TIMEOUT_MS,
      'Update poll'
    );
  } catch (error) {
    formatFirestoreError(error, OperationType.UPDATE, `polls/${poll.id}`);
    updateLocally();
  }
}

export async function setPollActive(poll: Poll, isActive: boolean): Promise<void> {
  const updateLocally = () => {
    const localPolls = readLocalPolls().map((p) =>
      p.id === poll.id ? { ...p, isActive } : p
    );
    writeLocalPolls(localPolls);
  };

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    updateLocally();
    return;
  }

  try {
    await withTimeout(
      setDoc(
        doc(firestore, 'polls', poll.id),
        {
          question: poll.question,
          sessionTitle: poll.sessionTitle,
          totalVotes: poll.totalVotes,
          resultsRevealed: Boolean(poll.resultsRevealed),
          isActive,
          options: poll.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.votes,
          })),
        },
        { merge: true }
      ),
      WRITE_TIMEOUT_MS,
      'Toggle poll live status'
    );
  } catch (error) {
    formatFirestoreError(error, OperationType.UPDATE, `polls/${poll.id}`);
    updateLocally();
  }
}

export async function deletePoll(pollId: string): Promise<void> {
  const deleteLocally = () => {
    markPollsInitialized();
    clearLocalPollVote(pollId);
    const localPolls = readLocalPolls().filter((p) => p.id !== pollId);
    writeLocalPolls(localPolls);
  };

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    deleteLocally();
    return;
  }

  try {
    await withTimeout(
      deleteDoc(doc(firestore, 'polls', pollId)),
      WRITE_TIMEOUT_MS,
      'Delete poll'
    );
    deleteLocally();
  } catch (error) {
    formatFirestoreError(error, OperationType.DELETE, `polls/${pollId}`);
    deleteLocally();
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

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    return saveLocally();
  }

  try {
    if (existingDocId && !existingDocId.startsWith('local_fb_')) {
      await withTimeout(
        setDoc(
          doc(firestore, 'event_feedback', existingDocId),
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
      addDoc(collection(firestore, 'event_feedback'), {
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

  let cancelled = false;
  let unsubFirestore: Unsubscribe = () => {};

  const handleLocalChange = () => emitMerged();
  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_FEEDBACK_EVENT, handleLocalChange);
  }

  // Immediately emit local feedback so Organiser Desk never stalls
  emitMerged();

  const fallbackTimer = window.setTimeout(() => {
    if (!hasRemoteSnapshot && !cancelled) {
      emitMerged();
    }
  }, INITIAL_SNAPSHOT_FALLBACK_MS);

  void ensureFirestoreReady().then((ready) => {
    if (cancelled) return;
    if (!ready) {
      window.clearTimeout(fallbackTimer);
      emitMerged();
      return;
    }

    const firestore = getActiveFirestore();
    if (!firestore) {
      window.clearTimeout(fallbackTimer);
      emitMerged();
      return;
    }

    try {
      const q = query(collection(firestore, 'event_feedback'), orderBy('createdAt', 'desc'));
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
          if (!isDatabaseNotFoundError(error)) {
            onError?.('Live cloud sync paused — showing local feedback.');
          }
        }
      );
    } catch (error) {
      window.clearTimeout(fallbackTimer);
      formatFirestoreError(error, OperationType.LIST, 'event_feedback');
      emitMerged();
    }
  });

  return () => {
    cancelled = true;
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

  if (feedbackId.startsWith('local_fb_')) {
    deleteLocally();
    return;
  }

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    deleteLocally();
    return;
  }

  try {
    await withTimeout(
      deleteDoc(doc(firestore, 'event_feedback', feedbackId)),
      WRITE_TIMEOUT_MS,
      'Delete event feedback'
    );
    deleteLocally();
  } catch (error) {
    formatFirestoreError(error, OperationType.DELETE, `event_feedback/${feedbackId}`);
    deleteLocally();
  }
}

// ============================================================================
// 3. OWNER-LOCKED ORGANIZER SECURITY SETTINGS (read-only from client)
//    Document: app_settings/organizer_security
//    Managed exclusively by the event owner in Firebase Console.
// ============================================================================

export const OWNER_SECURITY_COLLECTION = 'app_settings';
export const OWNER_SECURITY_DOC_ID = 'organizer_security';
export const OWNER_SECURITY_DOC_PATH = `${OWNER_SECURITY_COLLECTION}/${OWNER_SECURITY_DOC_ID}`;

const SECURITY_FETCH_TIMEOUT_MS = 3500;
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;

export interface OrganizerPasscodeConfig {
  source: 'firebase' | 'default';
  passcodeHash: string | null;
  plaintextPasscode: string | null;
  usesHashedStorage: boolean;
  updatedAtMs: number | null;
  lastSyncedAt: number;
  syncError: string | null;
}

function parseOrganizerSecurityDoc(
  data: Record<string, unknown> | undefined
): OrganizerPasscodeConfig {
  const now = Date.now();
  if (!data) {
    return {
      source: 'default',
      passcodeHash: null,
      plaintextPasscode: null,
      usesHashedStorage: false,
      updatedAtMs: null,
      lastSyncedAt: now,
      syncError: null,
    };
  }

  const rawHash =
    typeof data.passcodeHash === 'string' ? data.passcodeHash.trim().toLowerCase() : '';
  const rawPasscode =
    typeof data.passcode === 'string' ? data.passcode.trim() : '';
  const updatedAtMs = data.updatedAt ? timestampToMs(data.updatedAt) : null;

  if (SHA256_HEX_REGEX.test(rawHash)) {
    return {
      source: 'firebase',
      passcodeHash: rawHash,
      plaintextPasscode: null,
      usesHashedStorage: true,
      updatedAtMs,
      lastSyncedAt: now,
      syncError: null,
    };
  }

  if (rawPasscode.length > 0) {
    return {
      source: 'firebase',
      passcodeHash: null,
      plaintextPasscode: rawPasscode,
      usesHashedStorage: false,
      updatedAtMs,
      lastSyncedAt: now,
      syncError: null,
    };
  }

  return {
    source: 'default',
    passcodeHash: null,
    plaintextPasscode: null,
    usesHashedStorage: false,
    updatedAtMs,
    lastSyncedAt: now,
    syncError: null,
  };
}

export async function fetchOrganizerPasscodeConfig(): Promise<OrganizerPasscodeConfig> {
  const now = Date.now();
  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    const availability = getFirestoreAvailability();
    return {
      source: 'default',
      passcodeHash: null,
      plaintextPasscode: null,
      usesHashedStorage: false,
      updatedAtMs: null,
      lastSyncedAt: now,
      syncError:
        availability.reason ||
        'Using built-in event passcode — Firestore cloud sync is not active yet.',
    };
  }

  try {
    const snap = await withTimeout(
      getDoc(doc(firestore, OWNER_SECURITY_COLLECTION, OWNER_SECURITY_DOC_ID)),
      SECURITY_FETCH_TIMEOUT_MS,
      'Fetch organizer passcode config'
    );
    if (!snap.exists()) {
      return parseOrganizerSecurityDoc(undefined);
    }
    return parseOrganizerSecurityDoc(snap.data() as Record<string, unknown>);
  } catch (error) {
    formatFirestoreError(error, OperationType.GET, OWNER_SECURITY_DOC_PATH);
    return {
      source: 'default',
      passcodeHash: null,
      plaintextPasscode: null,
      usesHashedStorage: false,
      updatedAtMs: null,
      lastSyncedAt: now,
      syncError:
        getFirestoreAvailability().reason ||
        'Unable to reach Firebase right now — using cached or default passcode.',
    };
  }
}

export function subscribeOrganizerPasscodeConfig(
  onData: (config: OrganizerPasscodeConfig) => void
): Unsubscribe {
  let cancelled = false;
  let unsubFirestore: Unsubscribe = () => {};

  void ensureFirestoreReady().then((ready) => {
    if (cancelled) return;
    if (!ready) {
      const availability = getFirestoreAvailability();
      onData({
        source: 'default',
        passcodeHash: null,
        plaintextPasscode: null,
        usesHashedStorage: false,
        updatedAtMs: null,
        lastSyncedAt: Date.now(),
        syncError:
          availability.reason ||
          'Using built-in event passcode — Firestore cloud sync is not active yet.',
      });
      return;
    }

    const firestore = getActiveFirestore();
    if (!firestore) return;

    try {
      unsubFirestore = onSnapshot(
        doc(firestore, OWNER_SECURITY_COLLECTION, OWNER_SECURITY_DOC_ID),
        (snap) => {
          if (!snap.exists()) {
            onData(parseOrganizerSecurityDoc(undefined));
            return;
          }
          onData(parseOrganizerSecurityDoc(snap.data() as Record<string, unknown>));
        },
        (error) => {
          formatFirestoreError(error, OperationType.GET, OWNER_SECURITY_DOC_PATH);
          onData({
            source: 'default',
            passcodeHash: null,
            plaintextPasscode: null,
            usesHashedStorage: false,
            updatedAtMs: null,
            lastSyncedAt: Date.now(),
            syncError:
              getFirestoreAvailability().reason ||
              'Live Firebase sync paused — using cached or default passcode.',
          });
        }
      );
    } catch (error) {
      formatFirestoreError(error, OperationType.GET, OWNER_SECURITY_DOC_PATH);
    }
  });

  return () => {
    cancelled = true;
    unsubFirestore();
  };
}

// ============================================================================
// 4. TABLE PLAN SEATING ASSIGNMENTS (table_plan/current document)
//    Atomic single-document sync across all connected devices + local fallback.
// ============================================================================

export interface TablePlanEntry {
  id: string;
  name: string;
  table: string;
}

export interface TablePlanData {
  entries: TablePlanEntry[];
  fileName: string | null;
  delegateCount: number;
  tableCount: number;
  updatedAt: number | null;
}

const TABLE_PLAN_COLLECTION = 'table_plan';
const TABLE_PLAN_DOC_ID = 'current';
const TABLE_PLAN_DOC_PATH = `${TABLE_PLAN_COLLECTION}/${TABLE_PLAN_DOC_ID}`;
const LOCAL_TABLE_PLAN_KEY = 'sd_fallback_table_plan_v1';
const LOCAL_TABLE_PLAN_EVENT = 'sd:local-table-plan-updated';

export const EMPTY_TABLE_PLAN: TablePlanData = {
  entries: [],
  fileName: null,
  delegateCount: 0,
  tableCount: 0,
  updatedAt: null,
};

function countUniqueTables(entries: TablePlanEntry[]): number {
  const unique = new Set(
    entries
      .map((entry) => entry.table.trim().toLowerCase())
      .filter((val) => val.length > 0)
  );
  return unique.size;
}

function sanitizeTablePlanEntries(raw: unknown): TablePlanEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: TablePlanEntry[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const table = typeof record.table === 'string' ? record.table.trim() : '';
    if (!name || !table) return;
    const id =
      typeof record.id === 'string' && record.id.trim()
        ? record.id.trim()
        : `seat_${index + 1}`;
    entries.push({ id, name, table });
  });
  return entries;
}

function readLocalTablePlan(): TablePlanData {
  try {
    const raw = localStorage.getItem(LOCAL_TABLE_PLAN_KEY);
    if (!raw) return EMPTY_TABLE_PLAN;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = sanitizeTablePlanEntries(parsed.entries);
    return {
      entries,
      fileName: typeof parsed.fileName === 'string' ? parsed.fileName : null,
      delegateCount: entries.length,
      tableCount: countUniqueTables(entries),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
    };
  } catch {
    return EMPTY_TABLE_PLAN;
  }
}

function writeLocalTablePlan(plan: TablePlanData) {
  try {
    localStorage.setItem(LOCAL_TABLE_PLAN_KEY, JSON.stringify(plan));
  } catch {
    // ignore storage errors
  }
  dispatchLocalEvent(LOCAL_TABLE_PLAN_EVENT);
}

export function subscribeTablePlan(
  onData: (plan: TablePlanData) => void,
  onError?: (message: string) => void
): Unsubscribe {
  let cancelled = false;
  let hasRemoteSnapshot = false;
  let unsubFirestore: Unsubscribe = () => {};

  const handleLocalChange = () => {
    onData(readLocalTablePlan());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_TABLE_PLAN_EVENT, handleLocalChange);
  }

  // Immediately serve cached local table plan while probe runs
  onData(readLocalTablePlan());

  const fallbackTimer = window.setTimeout(() => {
    if (!hasRemoteSnapshot && !cancelled) {
      onData(readLocalTablePlan());
    }
  }, INITIAL_SNAPSHOT_FALLBACK_MS);

  void ensureFirestoreReady().then((ready) => {
    if (cancelled) return;
    if (!ready) {
      window.clearTimeout(fallbackTimer);
      onData(readLocalTablePlan());
      return;
    }

    const firestore = getActiveFirestore();
    if (!firestore) {
      window.clearTimeout(fallbackTimer);
      onData(readLocalTablePlan());
      return;
    }

    try {
      unsubFirestore = onSnapshot(
        doc(firestore, TABLE_PLAN_COLLECTION, TABLE_PLAN_DOC_ID),
        (snap) => {
          hasRemoteSnapshot = true;
          window.clearTimeout(fallbackTimer);

          if (!snap.exists()) {
            writeLocalTablePlan(EMPTY_TABLE_PLAN);
            onData(EMPTY_TABLE_PLAN);
            return;
          }

          const data = snap.data() as Record<string, unknown>;
          const entries = sanitizeTablePlanEntries(data.entries);
          const plan: TablePlanData = {
            entries,
            fileName: typeof data.fileName === 'string' ? data.fileName : null,
            delegateCount: entries.length,
            tableCount: countUniqueTables(entries),
            updatedAt: data.updatedAt ? timestampToMs(data.updatedAt) : null,
          };
          writeLocalTablePlan(plan);
          onData(plan);
        },
        (error) => {
          hasRemoteSnapshot = true;
          window.clearTimeout(fallbackTimer);
          formatFirestoreError(error, OperationType.GET, TABLE_PLAN_DOC_PATH);
          onData(readLocalTablePlan());
          if (!isDatabaseNotFoundError(error)) {
            onError?.('Live cloud sync paused — showing cached table plan.');
          }
        }
      );
    } catch (error) {
      window.clearTimeout(fallbackTimer);
      formatFirestoreError(error, OperationType.GET, TABLE_PLAN_DOC_PATH);
      onData(readLocalTablePlan());
    }
  });

  return () => {
    cancelled = true;
    window.clearTimeout(fallbackTimer);
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(LOCAL_TABLE_PLAN_EVENT, handleLocalChange);
    }
  };
}

export async function saveTablePlan(input: {
  entries: TablePlanEntry[];
  fileName: string | null;
}): Promise<{ plan: TablePlanData; syncedToCloud: boolean }> {
  const sanitizedEntries = sanitizeTablePlanEntries(input.entries);
  const now = Date.now();
  const nextPlan: TablePlanData = {
    entries: sanitizedEntries,
    fileName: input.fileName,
    delegateCount: sanitizedEntries.length,
    tableCount: countUniqueTables(sanitizedEntries),
    updatedAt: now,
  };

  writeLocalTablePlan(nextPlan);

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    return { plan: nextPlan, syncedToCloud: false };
  }

  try {
    await withTimeout(
      setDoc(doc(firestore, TABLE_PLAN_COLLECTION, TABLE_PLAN_DOC_ID), {
        entries: sanitizedEntries,
        fileName: input.fileName,
        delegateCount: nextPlan.delegateCount,
        tableCount: nextPlan.tableCount,
        updatedAt: serverTimestamp(),
      }),
      WRITE_TIMEOUT_MS,
      'Save table plan'
    );
    return { plan: nextPlan, syncedToCloud: true };
  } catch (error) {
    formatFirestoreError(error, OperationType.WRITE, TABLE_PLAN_DOC_PATH);
    return { plan: nextPlan, syncedToCloud: false };
  }
}

export async function clearTablePlan(): Promise<{ syncedToCloud: boolean }> {
  writeLocalTablePlan(EMPTY_TABLE_PLAN);

  const ready = await ensureFirestoreReady();
  const firestore = ready ? getActiveFirestore() : null;
  if (!firestore) {
    return { syncedToCloud: false };
  }

  try {
    await withTimeout(
      setDoc(doc(firestore, TABLE_PLAN_COLLECTION, TABLE_PLAN_DOC_ID), {
        entries: [],
        fileName: null,
        delegateCount: 0,
        tableCount: 0,
        updatedAt: serverTimestamp(),
      }),
      WRITE_TIMEOUT_MS,
      'Clear table plan'
    );
    return { syncedToCloud: true };
  } catch (error) {
    formatFirestoreError(error, OperationType.WRITE, TABLE_PLAN_DOC_PATH);
    return { syncedToCloud: false };
  }
}
