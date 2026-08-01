/**
 * PIN-based quick sign-in for a trusted device.
 *
 * The 6-digit PIN never leaves the device and is never sent to the server. It
 * only encrypts/decrypts the long-lived refresh token stored locally, using
 * AES-GCM with a key derived from the PIN via PBKDF2 (WebCrypto). This is
 * strictly more secure than the app's current plain-text refresh token in
 * localStorage. Wrong PINs are rate-limited; after MAX_ATTEMPTS the stored
 * token is wiped and a full password login is required again.
 *
 * "Session stays alive": every unlock refreshes the token (rotation) and this
 * module re-encrypts the new token, so daily use keeps the device signed in.
 */

const STORAGE_KEY = 'td_pin_device';
const PBKDF2_ITERATIONS = 150_000;
export const MAX_ATTEMPTS = 5;
export const PIN_LENGTH = 6;

interface PinBlob {
  v: 1;
  email: string;
  companySlug: string;
  salt: string; // base64
  iv: string; // base64
  data: string; // base64 ciphertext
  attemptsLeft: number;
}

export interface PinUnlockError extends Error {
  code: 'WRONG_PIN' | 'LOCKED_OUT' | 'NO_DEVICE';
  attemptsLeft?: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** Info about the PIN device on this browser, or null if none is set up. */
export function getPinDevice():
  | { email: string; companySlug: string; attemptsLeft: number }
  | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const blob = JSON.parse(raw) as PinBlob;
    if (blob.v !== 1) return null;
    return {
      email: blob.email,
      companySlug: blob.companySlug,
      attemptsLeft: blob.attemptsLeft,
    };
  } catch {
    return null;
  }
}

export function hasPinDevice(): boolean {
  return getPinDevice() !== null;
}

export function clearPinDevice(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Encrypt the refresh token under the PIN and remember this device. */
export async function setupPin(
  pin: string,
  refreshToken: string,
  email: string,
  companySlug: string,
): Promise<void> {
  if (!isValidPin(pin)) throw new Error(`PIN must be ${PIN_LENGTH} digits`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(refreshToken),
  );
  const blob: PinBlob = {
    v: 1,
    email,
    companySlug,
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(new Uint8Array(cipher)),
    attemptsLeft: MAX_ATTEMPTS,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

/**
 * Decrypt and return the stored refresh token for a correct PIN. Throws a
 * PinUnlockError with code WRONG_PIN (attemptsLeft) or LOCKED_OUT (device
 * wiped) on failure.
 */
export async function unlockPin(pin: string): Promise<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const e = new Error('No PIN device') as PinUnlockError;
    e.code = 'NO_DEVICE';
    throw e;
  }
  const blob = JSON.parse(raw) as PinBlob;
  try {
    const key = await deriveKey(pin, fromB64(blob.salt));
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(blob.iv) },
      key,
      fromB64(blob.data),
    );
    // Correct PIN — reset the attempt counter.
    blob.attemptsLeft = MAX_ATTEMPTS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    return dec.decode(plain);
  } catch {
    // AES-GCM auth-tag failure = wrong PIN. Count it down.
    blob.attemptsLeft = Math.max(0, blob.attemptsLeft - 1);
    if (blob.attemptsLeft <= 0) {
      clearPinDevice();
      const e = new Error('Too many incorrect attempts') as PinUnlockError;
      e.code = 'LOCKED_OUT';
      throw e;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    const e = new Error('Incorrect PIN') as PinUnlockError;
    e.code = 'WRONG_PIN';
    e.attemptsLeft = blob.attemptsLeft;
    throw e;
  }
}
