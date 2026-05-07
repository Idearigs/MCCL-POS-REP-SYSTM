// QZ Tray bridge — connects the browser to the local thermal printer daemon
// QZ Tray must be installed and running on the till PC: https://qz.io
//
// Certificates and private keys are stored per-tenant in the database and
// delivered via GET /api/v1/auth/qz-config after login. They are NEVER
// hardcoded here — each tenant's key is only visible to that tenant.
import type { ThermalReceiptData, PrintOptions } from './thermalReceipt';
import { buildEscPos } from './escpos';
import { buildReceiptHTML } from './thermalReceipt';

// ─── Per-tenant QZ config (loaded from API after login) ──────────────────────

const QZ_CERT_KEY = 'qz_certificate';
const QZ_PKEY_KEY = 'qz_private_key';

export function storeQzConfig(certificate: string, privateKey: string): void {
  localStorage.setItem(QZ_CERT_KEY, certificate);
  localStorage.setItem(QZ_PKEY_KEY, privateKey);
  // Drop cached crypto key so next connection uses the new cert
  _cryptoKey = null;
  _qz = null;
  if (_status !== 'disconnected') {
    setStatus('disconnected');
    _connectPromise = null;
  }
}

function getQzCertificate(): string {
  return localStorage.getItem(QZ_CERT_KEY) ?? '';
}

function getQzPrivateKey(): string {
  return localStorage.getItem(QZ_PKEY_KEY) ?? '';
}

export function isQzConfigured(): boolean {
  return getQzCertificate().length > 0 && getQzPrivateKey().length > 0;
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN.*?-----|-----END.*?-----|\s/g, '');
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

let _cryptoKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey;
  const privateKey = getQzPrivateKey();
  _cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  return _cryptoKey;
}

async function signMessage(toSign: string): Promise<string> {
  const key = await getSigningKey();
  const encoded = new TextEncoder().encode(toSign);
  const signature = await window.crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// ─── Status management ────────────────────────────────────────────────────────

export type QZStatus = 'disconnected' | 'connecting' | 'connected' | 'unavailable';

let _qz: any = null;
let _status: QZStatus = 'disconnected';
let _connectPromise: Promise<boolean> | null = null;
const _statusListeners = new Set<(s: QZStatus) => void>();

function setStatus(s: QZStatus) {
  _status = s;
  _statusListeners.forEach((fn) => fn(s));
}

export function getQZStatus(): QZStatus {
  return _status;
}

export function onQZStatusChange(fn: (s: QZStatus) => void): () => void {
  _statusListeners.add(fn);
  return () => _statusListeners.delete(fn);
}

// ─── QZ Tray loading ──────────────────────────────────────────────────────────

async function loadQZ(): Promise<any> {
  if (_qz) return _qz;
  try {
    const mod = await import('qz-tray');
    _qz = (mod as any).default ?? mod;

    _qz.security.setCertificatePromise(function (resolve: any) {
      resolve(getQzCertificate());
    });

    _qz.security.setSignatureAlgorithm('SHA512');

    _qz.security.setSignaturePromise(function (toSign: string) {
      return function (resolve: any, reject: any) {
        signMessage(toSign).then(resolve).catch(reject);
      };
    });

    return _qz;
  } catch {
    return null;
  }
}

// ─── Connection ───────────────────────────────────────────────────────────────

export async function connectQZ(): Promise<boolean> {
  if (_status === 'connected') return true;
  if (_status === 'unavailable') return false;
  if (_connectPromise) return _connectPromise;

  setStatus('connecting');

  _connectPromise = (async () => {
    const lib = await loadQZ();
    if (!lib) {
      setStatus('unavailable');
      _connectPromise = null;
      return false;
    }
    try {
      if (!lib.websocket.isActive()) {
        await lib.websocket.connect({ retries: 2, delay: 1 });
      }
      setStatus('connected');

      lib.websocket.setClosedCallbacks(() => {
        setStatus('disconnected');
        _connectPromise = null;
      });
      lib.websocket.setErrorCallbacks(() => {
        setStatus('disconnected');
        _connectPromise = null;
      });

      _connectPromise = null;
      return true;
    } catch {
      setStatus('unavailable');
      _connectPromise = null;
      return false;
    }
  })();

  return _connectPromise;
}

export async function disconnectQZ(): Promise<void> {
  if (_qz?.websocket?.isActive()) {
    await _qz.websocket.disconnect();
  }
  setStatus('disconnected');
}

// ─── Printer discovery ────────────────────────────────────────────────────────

export async function listPrinters(): Promise<string[]> {
  if (!(await connectQZ())) return [];
  try {
    const printers = await _qz.printers.find();
    return Array.isArray(printers) ? printers : [printers];
  } catch {
    return [];
  }
}

// ─── Printing ─────────────────────────────────────────────────────────────────

export async function printReceiptQZ(
  printerName: string,
  data: ThermalReceiptData,
  options: PrintOptions,
): Promise<void> {
  if (!(await connectQZ())) {
    throw new Error('QZ Tray is not running on this PC.');
  }

  const isThermal = options.model === 'ONIX' || options.model === 'EPSON';

  if (isThermal) {
    const escpos = buildEscPos(data, options.copies ?? 1);
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'plain', data: escpos }]);
  } else {
    const html = buildReceiptHTML(data, options);
    const config = _qz.configs.create(printerName);
    await _qz.print(config, [{ type: 'html', format: 'plain', data: html }]);
  }
}

// ─── Cash drawer ──────────────────────────────────────────────────────────────
// ESC p m t1 t2 — kicks the drawer connected to the printer's DK/RJ12 port.
// m=0x00 → pin 2 (most drawers), t1/t2 = on/off pulse durations × 2ms.
const DRAWER_OPEN_CMD = '\x1B\x70\x00\x19\xFA';

export async function openCashDrawer(printerName: string): Promise<void> {
  if (!(await connectQZ())) {
    throw new Error('QZ Tray is not running on this PC.');
  }
  const config = _qz.configs.create(printerName, { scaleContent: false });
  await _qz.print(config, [
    { type: 'raw', format: 'plain', data: DRAWER_OPEN_CMD },
  ]);
}
