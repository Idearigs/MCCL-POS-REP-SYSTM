// QZ Tray bridge — connects the browser to the local thermal printer daemon
// QZ Tray must be installed and running on the till PC: https://qz.io
import type { ThermalReceiptData, PrintOptions } from './thermalReceipt';
import { buildEscPos } from './escpos';
import { buildReceiptHTML } from './thermalReceipt';

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

async function loadQZ(): Promise<any> {
  if (_qz) return _qz;
  try {
    const mod = await import('qz-tray');
    _qz = (mod as any).default ?? mod;

    // For internal LAN use: skip certificate verification
    _qz.security.setCertificatePromise(function (resolve: any) {
      resolve(undefined);
    });
    _qz.security.setSignatureAlgorithm('SHA512');
    _qz.security.setSignaturePromise(function () {
      return function (resolve: any) {
        resolve();
      };
    });

    return _qz;
  } catch {
    return null;
  }
}

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

export async function listPrinters(): Promise<string[]> {
  if (!(await connectQZ())) return [];
  try {
    const printers = await _qz.printers.find();
    return Array.isArray(printers) ? printers : [printers];
  } catch {
    return [];
  }
}

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
    // Raw ESC/POS — thermal printers only
    const escpos = buildEscPos(data, options.copies ?? 1);
    const config = _qz.configs.create(printerName, { scaleContent: false });
    await _qz.print(config, [{ type: 'raw', format: 'plain', data: escpos }]);
  } else {
    // HTML — works on any printer (A4 laser/inkjet, PDF, etc.)
    const html = buildReceiptHTML(data, options);
    const config = _qz.configs.create(printerName);
    await _qz.print(config, [{ type: 'html', format: 'plain', data: html }]);
  }
}
