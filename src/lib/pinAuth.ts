/**
 * PIN-based quick sign-in for a trusted device (server-backed).
 *
 * The 6-digit PIN is verified server-side against a bcrypt hash held in the
 * tenant database — it is never stored on the device, so a stolen/inspected
 * browser exposes no offline-crackable secret. Brute-force is stopped by a
 * server-side attempt counter + timed lockout, and a device can be revoked
 * remotely. This device keeps only an opaque, non-secret `deviceId` naming
 * which hash row to check.
 *
 * Flow:
 *   setupPin()  — after a password login, register the PIN for this device.
 *   unlockPin() — exchange (deviceId + PIN) for a fresh token pair; the app is
 *                 signed in exactly as a password login would leave it.
 */
import { apiClient } from '../services/apiClient';

const STORAGE_KEY = 'td_pin_device';
export const PIN_LENGTH = 6;

interface PinDeviceRecord {
  v: 2;
  deviceId: string;
  email: string;
  companySlug?: string;
}

export interface PinUnlockError extends Error {
  code: 'WRONG_PIN' | 'LOCKED_OUT' | 'NO_DEVICE' | 'NETWORK';
  attemptsLeft?: number;
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

function readRecord(): PinDeviceRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as PinDeviceRecord;
    if (r?.v !== 2 || !r.deviceId) return null;
    return r;
  } catch {
    return null;
  }
}

/** Info about the PIN device on this browser, or null if none is set up. */
export function getPinDevice(): { email: string; companySlug?: string } | null {
  const r = readRecord();
  return r ? { email: r.email, companySlug: r.companySlug } : null;
}

export function hasPinDevice(): boolean {
  return readRecord() !== null;
}

/** Forget the device locally (does not touch the server). */
export function clearPinDevice(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * "Forget this device": revoke it server-side (best-effort — only works while
 * authenticated) and remove the local record. Even if the revoke call can't be
 * made, dropping the local deviceId makes the device unusable for PIN sign-in.
 */
export async function forgetPinDevice(): Promise<void> {
  const r = readRecord();
  if (r?.deviceId) {
    try {
      await apiClient.delete(`/auth/device-pin/${r.deviceId}`);
    } catch {
      // Not authenticated (e.g. from the PIN screen) — local clear is enough.
    }
  }
  clearPinDevice();
}

function newDeviceId(): string {
  // Opaque, unguessable id (UUID-shaped) built from CSPRNG bytes — the same
  // WebCrypto primitive the app already relies on elsewhere.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Register a 6-digit PIN for this device. Must be called while authenticated
 * (right after a password login) — the request carries the access token.
 */
export async function setupPin(
  pin: string,
  opts: { email: string; companySlug?: string; label?: string },
): Promise<void> {
  if (!isValidPin(pin)) throw new Error(`PIN must be ${PIN_LENGTH} digits`);
  const existing = readRecord();
  const deviceId = existing?.deviceId ?? newDeviceId();
  await apiClient.post('/auth/device-pin/setup', {
    deviceId,
    pin,
    label: opts.label ?? defaultLabel(),
  });
  const record: PinDeviceRecord = {
    v: 2,
    deviceId,
    email: opts.email,
    companySlug: opts.companySlug,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

/**
 * Exchange the PIN for a session. On success the apiClient holds fresh tokens
 * and the tenant id is persisted. Throws a PinUnlockError on failure:
 *   WRONG_PIN (attemptsLeft) · LOCKED_OUT · NO_DEVICE · NETWORK.
 */
export async function unlockPin(pin: string): Promise<{ tenantId: string }> {
  const r = readRecord();
  if (!r) {
    const e = new Error('No PIN device on this browser') as PinUnlockError;
    e.code = 'NO_DEVICE';
    throw e;
  }
  try {
    const res = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: { tenantId: string };
    }>('/auth/device-pin/unlock', {
      deviceId: r.deviceId,
      pin,
      companySlug: r.companySlug,
    });
    apiClient.setTokens(res.accessToken, res.refreshToken);
    localStorage.setItem('tenantId', res.user.tenantId);
    return { tenantId: res.user.tenantId };
  } catch (err) {
    const anyErr = err as {
      statusCode?: number;
      data?: { code?: string; remaining?: number };
    };
    const status = anyErr?.statusCode;
    const data = anyErr?.data;

    if (status === 403) {
      const e = new Error('Locked — sign in with your password') as PinUnlockError;
      e.code = 'LOCKED_OUT';
      throw e;
    }
    if (status === 401) {
      const e = new Error('Incorrect PIN') as PinUnlockError;
      e.code = 'WRONG_PIN';
      e.attemptsLeft = data?.remaining;
      throw e;
    }
    if (!status) {
      const e = new Error('Network error — check your connection') as PinUnlockError;
      e.code = 'NETWORK';
      throw e;
    }
    throw err;
  }
}

function defaultLabel(): string {
  try {
    const ua = navigator.userAgent;
    const browser = /Edg/.test(ua)
      ? 'Edge'
      : /Chrome/.test(ua)
        ? 'Chrome'
        : /Firefox/.test(ua)
          ? 'Firefox'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'Browser';
    const os = /Windows/.test(ua)
      ? 'Windows'
      : /Mac/.test(ua)
        ? 'macOS'
        : /Android/.test(ua)
          ? 'Android'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
    return os ? `${browser} on ${os}` : browser;
  } catch {
    return 'This device';
  }
}
