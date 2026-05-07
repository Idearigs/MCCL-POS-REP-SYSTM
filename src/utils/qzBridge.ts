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

// ─── Hex encoding ─────────────────────────────────────────────────────────────
// QZ Tray format:'plain' passes the string through JavaScript's UTF-8 encoder,
// which corrupts any byte > 127 (e.g. £ = 0xA3 → 0xC2 0xA3, 0xFA → 0xC3 0xBA).
// format:'hex' sends an ASCII hex string that QZ decodes to exact bytes.

function toHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += (str.charCodeAt(i) & 0xff).toString(16).padStart(2, '0');
  }
  return hex;
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

  if (options.model === 'ONIX' || options.model === 'EPSON') {
    // Direct ESC/POS raw path — bypasses Windows raster driver entirely.
    // Must use format:'hex' so bytes > 127 (£ sign, drawer timing) aren't UTF-8 mangled.
    const escpos = buildEscPos(data, options.copies ?? 1);
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'hex', data: toHex(escpos) }]);
  } else {
    // STAR_TSP100 + OTHER: FuturePRNT is a Windows raster (GDI) driver.
    // It does not pass raw Star Line / ESC/POS bytes to the hardware — only HTML jobs work.
    const html = buildReceiptHTML(data, options);
    const htmlConfig = _qz.configs.create(printerName);
    await _qz.print(htmlConfig, [{ type: 'html', format: 'plain', data: html }]);
  }
}

// ─── Cash drawer ──────────────────────────────────────────────────────────────
// EPSON/ONIX: raw ESC/POS kick command via hex-encoded raw job.
// STAR_TSP100 / OTHER (FuturePRNT raster driver): the driver cannot execute raw
// drawer commands — it kicks the DK-port automatically on every print job.
// We send a sub-1mm blank HTML job so the drawer fires with negligible paper feed.

const DRAWER_ESCPOS = '\x1B\x70\x00\x19\xFA'; // ESC p 0 25 250 — pin 2, 50ms on / 500ms off

const BLANK_KICK_HTML =
  '<!DOCTYPE html><html><head><style>' +
  '@page{size:80mm 1mm;margin:0;}' +
  'body{margin:0;padding:0;width:80mm;height:1mm;overflow:hidden;}' +
  '</style></head><body></body></html>';

export async function openCashDrawer(
  printerName: string,
  model?: string,
): Promise<void> {
  if (!(await connectQZ())) {
    throw new Error('QZ Tray is not running on this PC.');
  }

  if (model === 'STAR_TSP100' || model === 'OTHER' || model === undefined) {
    // FuturePRNT / generic Windows raster driver: kicks drawer on every print job.
    // Send a 1mm-tall blank HTML page — drawer fires, virtually no paper feeds.
    const config = _qz.configs.create(printerName);
    await _qz.print(config, [{ type: 'html', format: 'plain', data: BLANK_KICK_HTML }]);
    return;
  }

  // EPSON / ONIX — raw ESC/POS drawer kick
  const config = _qz.configs.create(printerName, { scaleContent: false });
  await _qz.print(config, [{ type: 'raw', format: 'hex', data: toHex(DRAWER_ESCPOS) }]);
}
