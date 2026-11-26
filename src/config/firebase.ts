import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyDa8LizYMnSW0c-oXUu7_xZEvipVDpkvBk',
  authDomain: 'superdrug-2027.firebaseapp.com',
  projectId: 'superdrug-2027',
  storageBucket: 'superdrug-2027.firebasestorage.app',
  messagingSenderId: '59337752033',
  appId: '1:59337752033:web:f4e9cacc12c637be1da6a0',
  measurementId: 'G-LECBV4P8WS',
};

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
  try {
    // Auto-detect long polling improves reliability inside iframes, Safari, and corporate Wi-Fi
    dbInstance = initializeFirestore(appInstance, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    try {
      // If Firestore was already initialized on this app instance (e.g. hot reload), reuse it
      dbInstance = getFirestore(appInstance);
    } catch (error) {
      initError = error instanceof Error ? error.message : String(error);
      dbInstance = null;
    }
  }
}

export const app: FirebaseApp | null = appInstance;
export const db: Firestore | null = dbInstance;
export const firebaseInitError: string | null = initError;

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
}

export function formatFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    projectId: firebaseConfig.projectId,
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
