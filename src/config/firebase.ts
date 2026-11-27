import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  doc,
  Firestore,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  setLogLevel,
  terminate,
} from 'firebase/firestore';

function readEnvString(key: string, fallback: string): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const raw = env?.[key];
    if (typeof raw !== 'string') return fallback;
    const val = raw.replace(/^['"]+|['"]+$/g, '').trim();
    return val ? val : fallback;
  } catch {
    return fallback;
  }
}

function normalizeDatabaseId(raw: string): string {
  const cleaned = raw.replace(/^['"]+|['"]+$/g, '').trim();
  if (
    !cleaned ||
    cleaned.toLowerCase() === 'default' ||
    cleaned.toLowerCase() === '(default)'
  ) {
    return '(default)';
  }
  return cleaned;
}

const resolvedProjectId = readEnvString('VITE_FIREBASE_PROJECT_ID', 'superdrug-2027');

export const firebaseConfig = {
  apiKey: readEnvString('VITE_FIREBASE_API_KEY', 'AIzaSyDa8LizYMnSW0c-oXUu7_xZEvipVDpkvBk'),
  authDomain: readEnvString('VITE_FIREBASE_AUTH_DOMAIN', `${resolvedProjectId}.firebaseapp.com`),
  projectId: resolvedProjectId,
  storageBucket: readEnvString(
    'VITE_FIREBASE_STORAGE_BUCKET',
    `${resolvedProjectId}.firebasestorage.app`
  ),
  messagingSenderId: readEnvString('VITE_FIREBASE_MESSAGING_SENDER_ID', '59337752033'),
  appId: readEnvString('VITE_FIREBASE_APP_ID', '1:59337752033:web:f4e9cacc12c637be1da6a0'),
  measurementId: readEnvString('VITE_FIREBASE_MEASUREMENT_ID', 'G-LECBV4P8WS'),
};

/**
 * Target Firestore database ID.
 * Defaults to "(default)" unless VITE_FIREBASE_DATABASE_ID is configured for a custom named database.
 */
export const firestoreDatabaseId: string = normalizeDatabaseId(
  readEnvString('VITE_FIREBASE_DATABASE_ID', '(default)')
);

// Keep Firestore SDK logs quiet during initial probe so missing databases never spam warnings.
setLogLevel('silent');

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let initError: string | null = null;

try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  initError = error instanceof Error ? error.message : String(error);
  appInstance = null;
}

if (appInstance) {
  const isDefaultDb = firestoreDatabaseId === '(default)';
  try {
    // Auto-detect long polling improves reliability inside iframes, Safari, and corporate Wi-Fi
    dbInstance = isDefaultDb
      ? initializeFirestore(appInstance, {
          experimentalAutoDetectLongPolling: true,
        })
      : initializeFirestore(
          appInstance,
          {
            experimentalAutoDetectLongPolling: true,
          },
          firestoreDatabaseId
        );
  } catch {
    try {
      // If Firestore was already initialized on this app instance (e.g. reload), reuse it
      dbInstance = isDefaultDb
        ? getFirestore(appInstance)
        : getFirestore(appInstance, firestoreDatabaseId);
    } catch (error) {
      initError = error instanceof Error ? error.message : String(error);
      dbInstance = null;
    }
  }
}

export const app: FirebaseApp | null = appInstance;
export const db: Firestore | null = dbInstance;
export const firebaseInitError: string | null = initError;

export type FirestoreAvailabilityStatus = 'checking' | 'ready' | 'unavailable';

export interface FirestoreAvailabilityInfo {
  status: FirestoreAvailabilityStatus;
  reason: string | null;
  projectId: string;
  databaseId: string;
}

let activeDb: Firestore | null = dbInstance;
let availabilityStatus: FirestoreAvailabilityStatus = dbInstance ? 'checking' : 'unavailable';
let unavailableReason: string | null = dbInstance
  ? null
  : initError || 'Firebase could not be initialized — running in local mode.';
let readinessPromise: Promise<boolean> | null = null;

export function isDatabaseNotFoundError(error: unknown): boolean {
  if (!error) return false;
  const code =
    typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '').toLowerCase()
      : '';
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();

  return (
    code === 'not-found' ||
    code === 'failed-precondition' ||
    (message.includes('database') && message.includes('not found')) ||
    message.includes('does not exist') ||
    message.includes('cloud firestore api has not been used')
  );
}

export function isPermissionDeniedError(error: unknown): boolean {
  if (!error) return false;
  const code =
    typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '').toLowerCase()
      : '';
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();

  return (
    code === 'permission-denied' ||
    message.includes('missing or insufficient permissions') ||
    message.includes('permission_denied')
  );
}

/**
 * Cleanly shuts down the Firestore SDK instance and silences background retries
 * when the configured database does not exist in Firebase Console.
 */
export function tripFirestoreCircuitBreaker(error?: unknown, customReason?: string): void {
  if (availabilityStatus === 'unavailable' && !activeDb) {
    return;
  }

  availabilityStatus = 'unavailable';
  setLogLevel('silent');

  if (customReason) {
    unavailableReason = customReason;
  } else if (isDatabaseNotFoundError(error)) {
    unavailableReason = `Firestore database "${firestoreDatabaseId}" is not created in project "${firebaseConfig.projectId}" yet — running smoothly in local mode.`;
  } else {
    unavailableReason = `Cloud sync is currently unavailable for "${firebaseConfig.projectId}" — running in local mode.`;
  }

  const toTerminate = activeDb;
  activeDb = null;
  if (toTerminate) {
    void terminate(toTerminate).catch(() => {
      // ignore termination cleanup errors
    });
  }
}

/**
 * Single guarded startup probe shared across all Firestore subscribers and mutations.
 * - Trips the circuit breaker ONLY when the target database truly does not exist.
 * - Keeps live Firestore active on slow cold-start handshakes or permission checks so
 *   real-time listeners connect automatically without getting stuck in local fallback.
 */
export function ensureFirestoreReady(): Promise<boolean> {
  if (availabilityStatus === 'ready' && activeDb) {
    return Promise.resolve(true);
  }
  if (availabilityStatus === 'unavailable' || !activeDb) {
    return Promise.resolve(false);
  }
  if (readinessPromise) {
    return readinessPromise;
  }

  const probeDb = activeDb;
  readinessPromise = (async () => {
    try {
      await withTimeout(
        getDocFromServer(doc(probeDb, 'app_settings', 'organizer_security')),
        7000,
        'Verify Firestore database'
      );
      availabilityStatus = 'ready';
      unavailableReason = null;
      setLogLevel('error');
      return true;
    } catch (error) {
      if (isDatabaseNotFoundError(error)) {
        tripFirestoreCircuitBreaker(error);
        return false;
      }

      // Permission-denied proves the database exists; transient cold-start timeouts
      // should NOT permanently terminate Firestore so real-time listeners can connect.
      availabilityStatus = 'ready';
      unavailableReason = null;
      setLogLevel('error');
      return true;
    }
  })();

  return readinessPromise;
}

export function getActiveFirestore(): Firestore | null {
  return availabilityStatus === 'ready' ? activeDb : null;
}

export function getFirestoreAvailability(): FirestoreAvailabilityInfo {
  return {
    status: availabilityStatus,
    reason: unavailableReason,
    projectId: firebaseConfig.projectId,
    databaseId: firestoreDatabaseId,
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  projectId: string;
  databaseId: string;
}

export function formatFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  if (isDatabaseNotFoundError(error)) {
    tripFirestoreCircuitBreaker(error);
  }
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    projectId: firebaseConfig.projectId,
    databaseId: firestoreDatabaseId,
  };
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 5000,
  label = 'Firestore request'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    promise.then(
      (value) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(value);
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          reject(err);
        }
      }
    );
  });
}
