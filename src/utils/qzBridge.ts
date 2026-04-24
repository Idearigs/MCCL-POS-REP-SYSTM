// QZ Tray bridge — connects the browser to the local thermal printer daemon
// QZ Tray must be installed and running on the till PC: https://qz.io
import type { ThermalReceiptData, PrintOptions } from './thermalReceipt';
import { buildEscPos } from './escpos';
import { buildReceiptHTML } from './thermalReceipt';

// Self-signed certificate issued for pos.truedesk.co.uk — valid 10 years
// This lets QZ Tray recognise the site as trusted so "Remember this decision" works.
const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDdTCCAl2gAwIBAgIUc/zqp069QXLqXs0N9NyvO4TmqwEwDQYJKoZIhvcNAQEL
BQAwYzELMAkGA1UEBhMCR0IxEDAOBgNVBAgMB0VuZ2xhbmQxDzANBgNVBAcMBkxv
bmRvbjEUMBIGA1UECgwLVHJ1ZWRlc2tQT1MxGzAZBgNVBAMMEnBvcy50cnVlZGVz
ay5jby51azAeFw0yNjA0MjQxNDA1MTRaFw0zNjA0MjExNDA1MTRaMGMxCzAJBgNV
BAYTAkdCMRAwDgYDVQQIDAdFbmdsYW5kMQ8wDQYDVQQHDAZMb25kb24xFDASBgNV
BAoMC1RydWVkZXNrUE9TMRswGQYDVQQDDBJwb3MudHJ1ZWRlc2suY28udWswggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7VIyWT0thR/XkWWpiPO+Yojcp
Ftc1Qrsn/nGOAT5X4MrSg0PPB6y95Byn0KV9CWXgAcYbch7j6XoShCVpCmxYogta
4Bg9nGKPL0tHyFCtXkUuOWy3tTIcnpeRAfB9LRX6gsGMjELuGnGa9ac5D8XnOv1B
Q5FVpL9pLRHTddPY+nnjVZgvaK9Ydxq84GNKBmzHvuCXFtNXWbNAw0prfNdb8dE5
G1dvUj62dqBiMn5GB4sp7AGtOWLrLZPCSuOp+41Dpi4MqHKnCT93jFPjYjrM2Msn
AuSPnx8RvI2Z1Qta4q2amZSxrYbOgQL9A2fyI242F2EqSVL7YJwItrGNlWvXAgMB
AAGjITAfMB0GA1UdDgQWBBQMRzxvVrQbV+MDzrqVA6isZV2CtTANBgkqhkiG9w0B
AQsFAAOCAQEAGu7/UOGSDHAMXMmonLl2Kqkt/yVBddG0UkKQhtVzmH6qYVp8AFME
g7lQH+X9sIDxHHuAS+MHqdwuRSpEC1MRTEK9JKx7uyAn8B5HNauOgCp6jTgBS0qu
1NArqH+a5LN1Pb1MC5fmh6pPggpUj+shcoWaVK8P2fwY9dTrqanzJ8W8ee7hs1DW
Fm5qHyYXw3Ms4LgTGN3gnlUJmCvvc5kGEsZognZ8tnWxw1mdeCjgTZQWLLnz2Ngk
sdZb1GwSdNJ+GA3QAtCsuAR0555NMDYGhBgJZr4m4pZ87MqIe4Ke2DaYVs8D0F+l
nBg91x5OJTGESB4+jLkNFtQh4rpSUMUduQ==
-----END CERTIFICATE-----`;

const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VIyWT0thR/Xk
WWpiPO+YojcpFtc1Qrsn/nGOAT5X4MrSg0PPB6y95Byn0KV9CWXgAcYbch7j6XoS
hCVpCmxYogta4Bg9nGKPL0tHyFCtXkUuOWy3tTIcnpeRAfB9LRX6gsGMjELuGnGa
9ac5D8XnOv1BQ5FVpL9pLRHTddPY+nnjVZgvaK9Ydxq84GNKBmzHvuCXFtNXWbNA
w0prfNdb8dE5G1dvUj62dqBiMn5GB4sp7AGtOWLrLZPCSuOp+41Dpi4MqHKnCT93
jFPjYjrM2MsnAuSPnx8RvI2Z1Qta4q2amZSxrYbOgQL9A2fyI242F2EqSVL7YJwI
trGNlWvXAgMBAAECggEABP8YUNoElK+qq1CHOd+ONG//MKVfUBhbjZGHzdXSp91j
C4JcyKTXwqjW6tLx1wftI7BobEr67/FGREAqD0cr5KFN1Dqt6tbE+jS0uVFqdXVS
Ow1lDPFUSNciC8gVdgFB2NCsAOes0VT7OrranvcAvE4iex8mPTaLtG5zT0SRRfQ8
lcVHt8HP+bL1bjQTj5si4A11b3Ie2q9yjiNKSN2qmY3FNBa7ekBfeizQkK47NIif
FyfAn5iGwsa+nUtVWzUSOX2Z+fJ2wSEjcO3RBL9jcozggi7ZYEsUHemKujFoRxri
KXuffBF3VbCAqy+0esC656tGA1CgVOywsg7ZOj8pAQKBgQDyl49buJfz1cFl7fop
UGKpCBM6snjiU5Pu/K5W3Vcd+aqR9GOjgf24DuQB9NNi0zy51VYpJqzeoo85WxRb
QzBvy9rNXa0xFr8OQGcn4aIjVEi/A15NH/RXYH7WObKhZcAhr5AI5sDNEQDvbFTJ
pVgfrVMudqEI0aXOmLdPHkiytwKBgQDFrxbcPS6AakMDuQDqWedbAdGCBqi8LHE6
XixSbxtB/gzZEJb1+tNk495fhrzamqcjYHiWbJrRIJAXB3C50tAtftmD5fu9Osbi
/+UIe4orGskCUW4s8aaeilWkFSF3WzBrpRBvIhJOEw1/ZnLqGHrOxMk5Wjo1brS1
BEZfWGVv4QKBgQCCLoT24pNgfWgAa/mf7AxVywiOqjGmutUbHavs33CdnFpFYtGJ
b/uYpx0CU8CQOu1OiEZpZODFxJR5YgAFjYPTqqCrLkb/ncY/Pp5cz39z2AoFvyf+
2VQFA7ps+Z97bx/ws8bmj/YM1cAbu5WwdDNbJGcL+wslsWN5/4f3RDgc9wKBgHS7
Bim46vujQ70wAm1f9zCTK063de3f5GCN+WgX+aWHSbjnhezsVuWtdMM9wcjoJ6fJ
MIvKx8STkOI4X4UrCgjDbdfn9zXvPkAO0QSoRpdbcrSutvtNGpFlqFqCq8daDoaR
6tlk6iA2OfMv4M2A9QuhwhzevZ6Np6F4S8HDZeqhAoGBAN7HLb7wbHbMmGMl1JcB
uSfmPsrXHXLXxjn5VA/fV1ytNuVt3bykJ8FGbfma2hUBNACTIggU51KdeKmpO2xJ
CDzN+qanfhOb2IQ6dsmOKb5nWMPSyJxjYA8Jd8hvfi52K1CHNBZ2e2yuSG6q3Yoh
SRb7a8iWapBNipyP0ZGEsccT
-----END PRIVATE KEY-----`;

// Convert PEM to ArrayBuffer for Web Crypto
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
  _cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(QZ_PRIVATE_KEY),
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

    // Provide the signed certificate — QZ Tray marks this site as trusted
    _qz.security.setCertificatePromise(function (resolve: any) {
      resolve(QZ_CERTIFICATE);
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
    // Raw ESC/POS bytes — thermal printers only
    const escpos = buildEscPos(data, options.copies ?? 1);
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'plain', data: escpos }]);
  } else {
    // HTML — works on any printer (A4 laser/inkjet, PDF, virtual)
    const html = buildReceiptHTML(data, options);
    const config = _qz.configs.create(printerName);
    await _qz.print(config, [{ type: 'html', format: 'plain', data: html }]);
  }
}
