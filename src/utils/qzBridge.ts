// QZ Tray bridge — connects the browser to the local thermal printer daemon
// QZ Tray must be installed and running on the till PC: https://qz.io
//
// Certificates and private keys are stored per-tenant in the database and
// delivered via GET /api/v1/auth/qz-config after login. They are NEVER
// hardcoded here — each tenant's key is only visible to that tenant.
import type { ThermalReceiptData, PrintOptions } from './thermalReceipt';
import { buildEscPos, buildStarLine } from './escpos';
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

const THERMAL_KEYWORDS = [
  'epson', 'tm-', 'star', 'tsp', 'thermal', 'receipt',
  'pos', 'bixolon', 'citizen', 'xprinter', 'onix', 'rongta',
];

export async function listPrinters(): Promise<string[]> {
  if (!(await connectQZ())) return [];
  try {
    const printers = await _qz.printers.find();
    return Array.isArray(printers) ? printers : [printers];
  } catch {
    return [];
  }
}

export async function findThermalPrinters(): Promise<string[]> {
  const all = await listPrinters();
  const thermal = all.filter((p) =>
    THERMAL_KEYWORDS.some((kw) => p.toLowerCase().includes(kw)),
  );
  return thermal.length > 0 ? thermal : all;
}

export async function isPrinterAvailable(name: string): Promise<boolean> {
  const all = await listPrinters();
  return all.includes(name);
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
    // ESC/POS raw path — bypasses Windows raster driver entirely.
    // format:'hex' avoids UTF-8 mangling of bytes > 127 (£ sign, timing bytes).
    const escpos = buildEscPos(data, options.copies ?? 1);
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'hex', data: toHex(escpos) }]);
  } else if (options.model === 'STAR_TSP100') {
    // Star Line raw path — QZ Tray submits a RAW-type spool job which bypasses the
    // GDI driver and writes bytes directly to the USB port.  The printer receives
    // native Star Line commands, so cut (ESC i) and drawer (BEL) work without any
    // Windows driver settings.  No "Page Cut Type" or "Peripheral Unit Type"
    // configuration is required in the Windows printer properties.
    const starLine = buildStarLine(data, options.copies ?? 1);
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'hex', data: toHex(starLine) }]);
  } else {
    // OTHER / unknown: HTML fallback via the Windows GDI driver.
    const html = buildReceiptHTML(data, options);
    const htmlConfig = _qz.configs.create(printerName);
    await _qz.print(htmlConfig, [{ type: 'html', format: 'plain', data: html }]);
  }
}

// ─── Cash drawer ──────────────────────────────────────────────────────────────
// EPSON/ONIX: raw ESC/POS kick — ESC p 0 25 250 (pin 2, ~50ms on / 500ms off).
// STAR_TSP100: BEL (0x07) is the Star Line "Peripheral Device Drive" command —
// it pulses the DK port directly.  Sent as a RAW spool job, it bypasses the GDI
// driver and reaches the printer hardware regardless of Windows driver settings.

const DRAWER_ESCPOS  = '\x1B\x70\x00\x19\xFA';     // ESC p 0 25 250
// ESC @ resets the printer (a recognised multi-byte sequence so the spooler
// doesn't drop it as too small), then BEL (0x07) pulses the DK port.
const DRAWER_STARLINE = '\x1B\x40\x07';             // ESC @ + BEL

// ─── Drawer event log ─────────────────────────────────────────────────────────
// Hardware has no status pin readback through the FuturePRNT raster driver, so
// we log every kick command that succeeded. Capped at 500 entries (~50 KB).

const DRAWER_LOG_KEY = 'qz_drawer_log';
const DRAWER_LOG_MAX = 500;

export interface DrawerLogEntry {
  at: string;       // ISO timestamp
  printer: string;
  model: string;
  trigger: 'manual' | 'sale'; // manual = Test Drawer button; sale = auto after payment
}

function writeDrawerLog(entry: Omit<DrawerLogEntry, 'at'>): void {
  try {
    const raw = localStorage.getItem(DRAWER_LOG_KEY);
    const log: DrawerLogEntry[] = raw ? (JSON.parse(raw) as DrawerLogEntry[]) : [];
    log.push({ at: new Date().toISOString(), ...entry });
    if (log.length > DRAWER_LOG_MAX) log.splice(0, log.length - DRAWER_LOG_MAX);
    localStorage.setItem(DRAWER_LOG_KEY, JSON.stringify(log));
  } catch {
    // localStorage unavailable — non-fatal
  }
}

export function getDrawerLog(): DrawerLogEntry[] {
  try {
    const raw = localStorage.getItem(DRAWER_LOG_KEY);
    return raw ? (JSON.parse(raw) as DrawerLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearDrawerLog(): void {
  localStorage.removeItem(DRAWER_LOG_KEY);
}

export async function openCashDrawer(
  printerName: string,
  model?: string,
  trigger: DrawerLogEntry['trigger'] = 'manual',
): Promise<void> {
  if (!(await connectQZ())) {
    throw new Error('QZ Tray is not running on this PC.');
  }

  if (model === 'STAR_TSP100' || model === 'OTHER' || model === undefined) {
    // Star Line BEL — RAW spool job bypasses the GDI driver and pulses the DK port
    // directly.  No Windows driver peripheral configuration required.
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'hex', data: toHex(DRAWER_STARLINE) }]);
  } else {
    // EPSON / ONIX — raw ESC/POS drawer kick
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'hex', data: toHex(DRAWER_ESCPOS) }]);
  }

  writeDrawerLog({ printer: printerName, model: model ?? 'OTHER', trigger });
}
