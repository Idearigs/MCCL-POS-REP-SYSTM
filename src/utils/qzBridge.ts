// QZ Tray bridge — connects the browser to the local thermal printer daemon
// QZ Tray must be installed and running on the till PC: https://qz.io
import type { ThermalReceiptData, PrintOptions } from './thermalReceipt';
import { buildEscPos } from './escpos';
import { buildReceiptHTML } from './thermalReceipt';

// ─── Machine-specific keypairs ────────────────────────────────────────────────
// Each till PC needs its own keypair so QZ Tray can permanently remember the
// decision. Generate one via: QZ Tray tray icon → Site Manager → + → Yes.
// Paste the certificate and private key below, then select the profile in
// Settings → Printer → Machine Profile.

export interface QZProfile {
  id: string;
  label: string;
  certificate: string;
  privateKey: string;
}

const QZ_PROFILES: Record<string, QZProfile> = {
  dev: {
    id: 'dev',
    label: 'Developer PC (Sri Lanka)',
    certificate: `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAZ2/8+HtMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDQyMzE0NDUyNFoXDTQ2MDQyMzE0NDUyNFowgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJ
VWnCenzGv6nEtSsX5q3kds6T5nBzTv6vvlqvyN0f1lWsu/zYhCwMMEH2TFyswnEn
pY8Ti6jVIUzB7QIA2iVkzHKSDcH/Gpe6waMlhE6m3FWwXd/rr/3gzI10BkP7GU9W
mF/1u/Yvbzzp6u+gI0Y1lip9ynMYT2h2YlyaqoQmnJ1mJcJQjarXdHQEvQZuUqqS
Hc6vMDDafw1ypONWR70wrvx5c7K3ZM7I5euEqL87DYclTf/YlmiZOBxtipQ07FCv
ekU0NmCV76qRtUkEdh3bQ7aIeLAYZLy8XiWZ2YQ9Nkhv7D5vREoQYoCDjmNoEGP1
oJI1/AaVY7k3Um6P2dbBAgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBRDBFsedKdw80zb9TRotwWhSUvc1jANBgkq
hkiG9w0BAQsFAAOCAQEAShUpKArTYDLdw0ilvJHlaPWY/z8w0f83hdXJ92nccaj0
UmAD2BVMQs+1qlJhrHLKxuacRTQK4+B79Na9PlR3jUqBDSzUEWvrc1WqORNxOuyk
9diDycM26zmdYRdFufvs5D0q7EbhMx0LMBA4liOKUACc1yKi07RN3oPA0TUDdGOU
+f9yLTJRr9L2UpMZL5ki28y9x2T9ERD2z74j9UcEdgvp2+N8161k3qgnYaWZwaUO
X5XlwlJhAez+xWdr9Vkb8cAwRhOcBJcTAtiMjgS8v98gIrfcFVLFjdYqKvMWiucF
SlnBkqxbI+mcJmqgId7Ju6NLJbBUNKnuq0zkSLfbMw==
-----END CERTIFICATE-----`,
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJVWnCenzGv6nE
tSsX5q3kds6T5nBzTv6vvlqvyN0f1lWsu/zYhCwMMEH2TFyswnEnpY8Ti6jVIUzB
7QIA2iVkzHKSDcH/Gpe6waMlhE6m3FWwXd/rr/3gzI10BkP7GU9WmF/1u/Yvbzzp
6u+gI0Y1lip9ynMYT2h2YlyaqoQmnJ1mJcJQjarXdHQEvQZuUqqSHc6vMDDafw1y
pONWR70wrvx5c7K3ZM7I5euEqL87DYclTf/YlmiZOBxtipQ07FCvekU0NmCV76qR
tUkEdh3bQ7aIeLAYZLy8XiWZ2YQ9Nkhv7D5vREoQYoCDjmNoEGP1oJI1/AaVY7k3
Um6P2dbBAgMBAAECggEAAXYab9ofH5tuqFYLDXfr+1J6MIBBwNGCB10np/rakYeH
DMtaxAjOD8rWILs4STv6UagJykHXUHA24Bm3+/D5aGJUQs+BIOiU0TsEc9JSdpM2
90IwLNQUwPnlHTJqMgdykCmoGSbTjC+30sgU9A3rfZo03d+/Pv39D25qdwgtsEDL
lpliZa+k8WzHdke7eP1KElNKKXMpFbKrejJCX3bZKoxIGuiafSwEP6M7vV0Fk2rA
0nw7RXzWAzTFMQPyI5Rsf/9FEQcu4UmUhbQWPH32ibjNA97IEAkFp1bFpbu3saQs
jNrz8ReV+OmY4c8H2/7fM9AIbuiUONIDnuu6KlLiEQKBgQDr7OCI+dZHbHIGm4Td
Vdnc+YLCLmYnG+nA+vIw9Ukb9GmjzQZmt28j66LJrWJukbuRAM0M+QlNiv09lifk
njYA7Sxfgf8Mg2v8w4KLcj3V9tXLU/eTtrEsG6UpxHaMQx1Dk8iDDBxCiZEKwIre
effope6RFxSJg063qHdIa/DGUQKBgQDadwgTmGr3V+thcD7aPEmLxuVBc3bWunGM
/Dqufc1Z0NVbzNcaI2iTVlwfRCWNm7j1k7UdItTq3elkn9AevYcCvhbV0/yEBM//
26k0IKjxlb3gnmXEhftxfSR9fuGlRp9Sz7FYirsD/u1JR2qfYxcQN6dgtfRvb2T9
SaYPNQE9cQKBgQC8Bnpg0HTFUZmCyJlYaR6L7VMX/TCuxKFEivtQp3xPyjgTMsiC
PnlWMGr5vrRvGLha9T92sleGtFnlpnE+1BSIIn211H33dBoxRYQaLL85clKrjM0I
rZaAZ7v3ELvGR4rgG7y3LIStRsQQxKkobB53DR+YBMP6YGrxFlOSpWwsMQKBgHGn
gWUoY2XAsK0lhx1kReLZG8X8OvQlVRPC2QiUXDQAyC8VF0b66tnUEOMXQe40+HmS
WaQJzflOb7Cwz8ZeVZHgsOKXgYRxOIDkl1eOMjZU786euVUPWyvErio3y05/uj2L
3bixm+/NPUdlRxwaohIG0iYnIz6iFkkLer/olHeRAoGBAKXgf7MkbiSnIlMkKEiI
PyEJaSL+bideR0vXmAgrd/Byzg2pvxKmWX0/5JuBy27VZFKhAGRtp7+5ibbq/Giz
wcB42YiOkx9M/70qbFA+oZz1QHx46L3OCyT+bq8S3wP4F/ciDBZY/EJhkVlBh2uF
PQu7JYZ3zJLFk9Hy2kqqge4j
-----END PRIVATE KEY-----`,
  },

  customer: {
    id: 'customer',
    label: 'Customer PC (UK)',
    // Generate via QZ Tray → Site Manager → + → Yes, then paste here
    certificate: '',
    privateKey: '',
  },
};

const QZ_PROFILE_STORAGE_KEY = 'qz_profile_id';

export function listQZProfiles(): { id: string; label: string; configured: boolean }[] {
  return Object.values(QZ_PROFILES).map(({ id, label, certificate }) => ({
    id,
    label,
    configured: certificate.length > 0,
  }));
}

export function getActiveQZProfileId(): string {
  return localStorage.getItem(QZ_PROFILE_STORAGE_KEY) ?? 'dev';
}

export function setActiveQZProfile(id: string): void {
  localStorage.setItem(QZ_PROFILE_STORAGE_KEY, id);
  // Force re-initialisation with the new profile's certificate and key
  _cryptoKey = null;
  _qz = null;
  if (_status !== 'disconnected') {
    setStatus('disconnected');
    _connectPromise = null;
  }
}

function getActiveProfile(): QZProfile {
  const id = getActiveQZProfileId();
  return QZ_PROFILES[id] ?? QZ_PROFILES['dev'];
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
  const { privateKey } = getActiveProfile();
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

    const { certificate, privateKey } = getActiveProfile();

    _qz.security.setCertificatePromise(function (resolve: any) {
      resolve(certificate);
    });

    _qz.security.setSignatureAlgorithm('SHA512');

    if (privateKey) {
      _qz.security.setSignaturePromise(function (toSign: string) {
        return function (resolve: any, reject: any) {
          signMessage(toSign).then(resolve).catch(reject);
        };
      });
    }

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
