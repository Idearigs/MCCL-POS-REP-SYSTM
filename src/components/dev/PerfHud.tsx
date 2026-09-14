import { useEffect, useRef, useState } from 'react';

/**
 * PerfHud — a DEV/STAGING-ONLY live performance overlay.
 *
 * Shows JS heap usage, DOM node count, FPS, main-thread blocking (long tasks)
 * and live API response times so we can *measure* optimization work instead of
 * guessing. It is self-contained (inline styles, no app CSS, no deps) and is
 * HARD-GATED so it never renders on a production host — see isPerfHudEnabled().
 *
 * Toggle at runtime from the console:
 *   localStorage.perfHud = 'on'   // force on (e.g. to test locally)
 *   localStorage.perfHud = 'off'  // force off
 *   delete localStorage.perfHud   // back to auto (on for localhost + staging)
 */

// Production hosts where the HUD must NEVER appear.
const PROD_HOSTS = ['pos.truedesk.co.uk', 'pos.buymejewellery.co.uk'];

export function isPerfHudEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  // Hard block: never on production, no matter what.
  if (PROD_HOSTS.includes(host)) return false;
  let flag: string | null = null;
  try {
    flag = window.localStorage.getItem('perfHud');
  } catch {
    /* localStorage may be unavailable */
  }
  if (flag === 'off') return false;
  if (flag === 'on') return true;
  // Auto: on for local dev + any staging host.
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  const isStaging = host.includes('staging') || host.includes('.local');
  return isLocal || isStaging;
}

type ApiSample = { ms: number; name: string; at: number };

interface Stats {
  fps: number;
  heapUsed: number;
  heapLimit: number;
  heapPct: number;
  dom: number;
  apiLast: number;
  apiAvg: number;
  apiMax: number;
  apiCount: number;
  slowest: string;
  blockingMs: number;
}

const EMPTY: Stats = {
  fps: 0, heapUsed: 0, heapLimit: 0, heapPct: 0, dom: 0,
  apiLast: 0, apiAvg: 0, apiMax: 0, apiCount: 0, slowest: '—', blockingMs: 0,
};

// green / amber / red by threshold (lower-is-better unless invert)
function color(value: number, good: number, bad: number, invert = false): string {
  const g = '#4ade80', a = '#fbbf24', r = '#f87171';
  if (invert) {
    if (value >= good) return g;
    if (value >= bad) return a;
    return r;
  }
  if (value <= good) return g;
  if (value <= bad) return a;
  return r;
}

export default function PerfHud() {
  const [enabled] = useState(isPerfHudEnabled);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY);

  const frameRef = useRef({ frames: 0, last: performance.now() });
  const apiRef = useRef<ApiSample[]>([]);
  const longTaskRef = useRef<{ ms: number; at: number }[]>([]);
  const hasMemory = typeof (performance as unknown as { memory?: unknown }).memory !== 'undefined';

  useEffect(() => {
    if (!enabled || hidden) return;

    let raf = 0;
    const loop = () => {
      frameRef.current.frames++;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // API timings — resource observer captures both fetch and axios XHR calls,
    // so we never have to monkey-patch the app's request layer.
    let resObs: PerformanceObserver | undefined;
    try {
      resObs = new PerformanceObserver((list) => {
        const now = performance.now();
        for (const e of list.getEntries()) {
          if (e.name.includes('/api/')) {
            apiRef.current.push({ ms: e.duration, name: e.name, at: now });
          }
        }
        if (apiRef.current.length > 60) apiRef.current = apiRef.current.slice(-60);
      });
      resObs.observe({ entryTypes: ['resource'] });
    } catch { /* unsupported */ }

    // Long tasks = main-thread jank (anything blocking > 50ms).
    let ltObs: PerformanceObserver | undefined;
    try {
      ltObs = new PerformanceObserver((list) => {
        const now = performance.now();
        for (const e of list.getEntries()) {
          longTaskRef.current.push({ ms: e.duration, at: now });
        }
      });
      ltObs.observe({ entryTypes: ['longtask'] });
    } catch { /* unsupported */ }

    const interval = window.setInterval(() => {
      const now = performance.now();

      const dt = now - frameRef.current.last;
      const fps = dt > 0 ? Math.round((frameRef.current.frames * 1000) / dt) : 0;
      frameRef.current.frames = 0;
      frameRef.current.last = now;

      const mem = (performance as unknown as {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      }).memory;
      const heapUsed = mem ? mem.usedJSHeapSize / 1048576 : 0;
      const heapLimit = mem ? mem.jsHeapSizeLimit / 1048576 : 0;
      const heapPct = heapLimit ? (heapUsed / heapLimit) * 100 : 0;

      const dom = document.getElementsByTagName('*').length;

      const recent = apiRef.current.filter((s) => now - s.at < 15000);
      const apiCount = recent.length;
      const apiLast = recent.length ? recent[recent.length - 1].ms : 0;
      const apiAvg = recent.length
        ? recent.reduce((s, r) => s + r.ms, 0) / recent.length
        : 0;
      let apiMax = 0;
      let slowest = '—';
      for (const r of recent) {
        if (r.ms > apiMax) {
          apiMax = r.ms;
          slowest = r.name;
        }
      }
      slowest = slowest.replace(/^https?:\/\/[^/]+\/api\/v1\//, '').split('?')[0] || '—';

      longTaskRef.current = longTaskRef.current.filter((t) => now - t.at < 5000);
      const blockingMs = longTaskRef.current.reduce((s, t) => s + t.ms, 0);

      setStats({
        fps, heapUsed, heapLimit, heapPct, dom,
        apiLast, apiAvg, apiMax, apiCount, slowest, blockingMs,
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      resObs?.disconnect();
      ltObs?.disconnect();
      window.clearInterval(interval);
    };
  }, [enabled, hidden]);

  if (!enabled || hidden) return null;

  const panel: React.CSSProperties = {
    position: 'fixed',
    bottom: 12,
    right: 12,
    zIndex: 2147483647,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#e5e7eb',
    background: 'rgba(17,24,39,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    width: collapsed ? 'auto' : 210,
    userSelect: 'none',
    pointerEvents: 'auto',
  };
  const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 8px', cursor: 'pointer',
    borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
  };
  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '2px 8px', gap: 8,
  };
  const label: React.CSSProperties = { color: '#9ca3af' };
  const btn: React.CSSProperties = {
    background: 'transparent', border: 'none', color: '#9ca3af',
    cursor: 'pointer', fontSize: 11, padding: '0 3px',
  };

  const fpsColor = color(stats.fps, 50, 30, true);
  const heapColor = color(stats.heapPct, 50, 75);
  const domColor = color(stats.dom, 5000, 20000);
  const apiColor = color(stats.apiAvg, 300, 800);
  const blockColor = color(stats.blockingMs, 50, 200);

  return (
    <div style={panel}>
      <div style={header} onClick={() => setCollapsed((c) => !c)} title="Click to collapse/expand">
        <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>
          ⚡ PERF
          {collapsed && (
            <>
              {'  '}
              <span style={{ color: fpsColor }}>{stats.fps}fps</span>
              {'  '}
              <span style={{ color: heapColor }}>{stats.heapUsed.toFixed(0)}mb</span>
              {'  '}
              <span style={{ color: domColor }}>{(stats.dom / 1000).toFixed(1)}k dom</span>
            </>
          )}
        </span>
        <span>
          <button style={btn} onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}>
            {collapsed ? '▢' : '—'}
          </button>
          <button
            style={btn}
            title="Hide for this session (localStorage.perfHud='on' to bring back)"
            onClick={(e) => { e.stopPropagation(); setHidden(true); }}
          >
            ✕
          </button>
        </span>
      </div>

      {!collapsed && (
        <div style={{ padding: '4px 0 6px' }}>
          <div style={row}>
            <span style={label}>FPS</span>
            <span style={{ color: fpsColor }}>{stats.fps}</span>
          </div>
          <div style={row}>
            <span style={label}>JS heap</span>
            <span style={{ color: heapColor }}>
              {hasMemory
                ? `${stats.heapUsed.toFixed(0)} / ${stats.heapLimit.toFixed(0)} mb (${stats.heapPct.toFixed(0)}%)`
                : 'n/a'}
            </span>
          </div>
          <div style={row}>
            <span style={label}>DOM nodes</span>
            <span style={{ color: domColor }}>{stats.dom.toLocaleString()}</span>
          </div>
          <div style={row}>
            <span style={label}>Blocking/5s</span>
            <span style={{ color: blockColor }}>{stats.blockingMs.toFixed(0)} ms</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
          <div style={row}>
            <span style={label}>API avg/15s</span>
            <span style={{ color: apiColor }}>{stats.apiAvg.toFixed(0)} ms</span>
          </div>
          <div style={row}>
            <span style={label}>API last</span>
            <span>{stats.apiLast.toFixed(0)} ms</span>
          </div>
          <div style={row}>
            <span style={label}>API max</span>
            <span style={{ color: color(stats.apiMax, 800, 2000) }}>{stats.apiMax.toFixed(0)} ms</span>
          </div>
          <div style={row}>
            <span style={label}>API count/15s</span>
            <span>{stats.apiCount}</span>
          </div>
          <div style={{ ...row, opacity: 0.8 }}>
            <span style={label}>slowest</span>
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stats.slowest}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
