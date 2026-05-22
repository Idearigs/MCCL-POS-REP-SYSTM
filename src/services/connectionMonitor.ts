// Monitors actual server reachability — not just navigator.onLine,
// which only reflects the local network adapter and lies about internet/VPN outages.

import { API_CONFIG } from '../config/api';

type Listener = (online: boolean) => void;

class ConnectionMonitor {
  private _online = true;
  private _listeners: Set<Listener> = new Set();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _checking = false;

  get isOnline() { return this._online; }

  start() {
    if (this._timer) return;
    this._check();
    this._timer = setInterval(() => this._check(), 15_000);
    window.addEventListener('online',  () => this._check());
    window.addEventListener('offline', () => this._setOnline(false));
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  subscribe(fn: Listener) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private async _check() {
    if (this._checking) return;
    this._checking = true;
    try {
      const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      this._setOnline(res.ok);
    } catch {
      this._setOnline(false);
    } finally {
      this._checking = false;
    }
  }

  private _setOnline(online: boolean) {
    if (this._online === online) return;
    this._online = online;
    this._listeners.forEach(fn => fn(online));
  }
}

export const connectionMonitor = new ConnectionMonitor();
