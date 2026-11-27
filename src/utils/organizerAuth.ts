/**
 * Owner-locked Organizer authentication helper.
 *
 * Passcodes are read-only from the app UI and synced globally across all
 * devices from Firebase Firestore (`app_settings/organizer_security`), managed
 * exclusively by the event owner in Firebase Console. All client-side passcode
 * editing and browser-local overrides have been removed.
 */

import {
  fetchOrganizerPasscodeConfig,
  OrganizerPasscodeConfig,
  subscribeOrganizerPasscodeConfig,
} from '../services/firestoreService';

export const DEFAULT_ORGANIZER_PASSCODE = 'SUPERDRUG2026';

const SESSION_UNLOCK_KEY = 'sd_organizer_session_unlocked';
const LEGACY_PASSCODE_HASH_PREFIX = 'sd_organizer_passcode_hash_';
const PASSCODE_STATUS_EVENT = 'sd:organizer-passcode-status-updated';

export interface OrganizerPasscodeStatus {
  source: 'firebase' | 'default';
  usesHashedStorage: boolean;
  updatedAtMs: number | null;
  lastSyncedAt: number | null;
  syncError: string | null;
}

let cachedPasscodeConfig: OrganizerPasscodeConfig | null = null;

/**
 * Pure-JS SHA-256 fallback for environments where crypto.subtle is unavailable
 * (e.g., plain HTTP on local network). Produces the exact same hex digest as Web Crypto SHA-256.
 */
function sha256Fallback(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

export async function hashPasscode(passcode: string): Promise<string> {
  const normalized = passcode.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(normalized);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return sha256Fallback(normalized);
    }
  }
  return sha256Fallback(normalized);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Removes any legacy browser-local passcode overrides so no device can bypass
 * the centrally synced owner passcode.
 */
export function clearLegacyLocalPasscodeOverrides(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_PASSCODE_HASH_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
}

function toSafeStatus(config: OrganizerPasscodeConfig | null): OrganizerPasscodeStatus {
  if (!config) {
    return {
      source: 'default',
      usesHashedStorage: false,
      updatedAtMs: null,
      lastSyncedAt: null,
      syncError: null,
    };
  }
  return {
    source: config.source,
    usesHashedStorage: config.usesHashedStorage,
    updatedAtMs: config.updatedAtMs,
    lastSyncedAt: config.lastSyncedAt,
    syncError: config.syncError,
  };
}

function applyPasscodeConfig(next: OrganizerPasscodeConfig): void {
  // Preserve last known Firebase config if a transient network error occurred
  if (next.syncError && cachedPasscodeConfig?.source === 'firebase') {
    cachedPasscodeConfig = {
      ...cachedPasscodeConfig,
      lastSyncedAt: next.lastSyncedAt,
      syncError: next.syncError,
    };
  } else {
    cachedPasscodeConfig = next;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PASSCODE_STATUS_EVENT));
  }
}

export function getOrganizerPasscodeStatus(): OrganizerPasscodeStatus {
  return toSafeStatus(cachedPasscodeConfig);
}

export function subscribeOrganizerPasscodeStatus(
  listener: (status: OrganizerPasscodeStatus) => void
): () => void {
  const handleUpdate = () => listener(getOrganizerPasscodeStatus());
  if (typeof window !== 'undefined') {
    window.addEventListener(PASSCODE_STATUS_EVENT, handleUpdate);
  }
  listener(getOrganizerPasscodeStatus());
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(PASSCODE_STATUS_EVENT, handleUpdate);
    }
  };
}

export function initOrganizerPasscodeSync(): () => void {
  clearLegacyLocalPasscodeOverrides();
  return subscribeOrganizerPasscodeConfig((remoteConfig) => {
    applyPasscodeConfig(remoteConfig);
  });
}

export async function refreshOrganizerPasscodeSync(): Promise<OrganizerPasscodeStatus> {
  clearLegacyLocalPasscodeOverrides();
  const latest = await fetchOrganizerPasscodeConfig();
  applyPasscodeConfig(latest);
  return getOrganizerPasscodeStatus();
}

export async function verifyOrganizerPasscode(input: string): Promise<boolean> {
  clearLegacyLocalPasscodeOverrides();
  const candidate = input.trim();
  if (!candidate) return false;

  // Fetch fresh owner security record from Firebase before verifying
  const latest = await fetchOrganizerPasscodeConfig();
  applyPasscodeConfig(latest);

  const activeConfig = cachedPasscodeConfig ?? latest;
  const candidateHash = (await hashPasscode(candidate)).toLowerCase();

  if (activeConfig.source === 'firebase') {
    if (activeConfig.passcodeHash) {
      return constantTimeEqual(candidateHash, activeConfig.passcodeHash.toLowerCase());
    }
    if (activeConfig.plaintextPasscode) {
      const expectedHash = (await hashPasscode(activeConfig.plaintextPasscode)).toLowerCase();
      return constantTimeEqual(candidateHash, expectedHash);
    }
  }

  const defaultHash = (await hashPasscode(DEFAULT_ORGANIZER_PASSCODE)).toLowerCase();
  return constantTimeEqual(candidateHash, defaultHash);
}

export function isOrganizerSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOrganizerSessionUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) {
      sessionStorage.setItem(SESSION_UNLOCK_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    }
  } catch {
    // ignore
  }
}
