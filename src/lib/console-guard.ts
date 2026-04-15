/**
 * Console Guard — MPS Jewelry POS
 *
 * In production:
 *   - All console output is suppressed
 *   - A custom branded message is shown when DevTools are opened
 *   - Developers can unlock logs for the session by typing in the browser console:
 *       enableDebug('mps-dev-2026')
 *
 * In development (localhost / Vite dev server):
 *   - Console output works normally, no changes
 */

const IS_PROD = import.meta.env.PROD;
const DEBUG_KEY = 'mps-dev-2026';
const SESSION_FLAG = '__mps_debug';

// ─── Noop ─────────────────────────────────────────────────────────────────────

const noop = () => {};

// ─── Store originals before we touch anything ─────────────────────────────────

const _originals = {
  log:   console.log.bind(console),
  warn:  console.warn.bind(console),
  error: console.error.bind(console),
  info:  console.info.bind(console),
  debug: console.debug.bind(console),
  group: console.group.bind(console),
  groupCollapsed: console.groupCollapsed.bind(console),
  groupEnd: console.groupEnd.bind(console),
  table: console.table.bind(console),
  dir:   console.dir.bind(console),
};

// ─── Suppress all console output ─────────────────────────────────────────────

function suppress() {
  console.log          = noop;
  console.warn         = noop;
  console.error        = noop;
  console.info         = noop;
  console.debug        = noop;
  console.group        = noop;
  console.groupCollapsed = noop;
  console.groupEnd     = noop;
  console.table        = noop;
  console.dir          = noop;
}

// ─── Restore original console output ─────────────────────────────────────────

function restore() {
  console.log          = _originals.log;
  console.warn         = _originals.warn;
  console.error        = _originals.error;
  console.info         = _originals.info;
  console.debug        = _originals.debug;
  console.group        = _originals.group;
  console.groupCollapsed = _originals.groupCollapsed;
  console.groupEnd     = _originals.groupEnd;
  console.table        = _originals.table;
  console.dir          = _originals.dir;
}

// ─── Branded console message ─────────────────────────────────────────────────

function showBrandMessage() {
  _originals.log(
    '%c TrueDesk POS ',
    'background: #1e40af; color: #fff; font-size: 20px; font-weight: bold; padding: 6px 16px; border-radius: 6px;',
  );
  _originals.log(
    '%cHey there! Nothing to see here.\nIf you\'re a developer, type this in the console:\n\n  enableDebug(\'mps-dev-2026\')\n\nto unlock debug logs for this session.',
    'color: #64748b; font-size: 13px; line-height: 1.6;',
  );
  _originals.log(
    '%c(and if you\'re just curious — respect 👀)',
    'color: #94a3b8; font-size: 11px; font-style: italic;',
  );
}

// ─── Global enableDebug / disableDebug helpers ────────────────────────────────

declare global {
  interface Window {
    enableDebug: (key: string) => void;
    disableDebug: () => void;
  }
}

window.enableDebug = (key: string) => {
  if (key !== DEBUG_KEY) {
    _originals.warn('%c Wrong key. Try again.', 'color: #ef4444; font-weight: bold;');
    return;
  }
  sessionStorage.setItem(SESSION_FLAG, '1');
  restore();
  console.log('%c Debug mode enabled for this session. ', 'background: #16a34a; color: #fff; font-weight: bold; padding: 2px 8px; border-radius: 4px;');
};

window.disableDebug = () => {
  sessionStorage.removeItem(SESSION_FLAG);
  suppress();
  _originals.log('%c Debug mode disabled. ', 'background: #dc2626; color: #fff; font-weight: bold; padding: 2px 8px; border-radius: 4px;');
};

// ─── Initialise ───────────────────────────────────────────────────────────────

export function initConsoleGuard() {
  if (!IS_PROD) return; // development — leave console alone

  // If dev already unlocked this session, restore and bail
  if (sessionStorage.getItem(SESSION_FLAG) === '1') {
    restore();
    _originals.log('%c Debug mode active (session) ', 'background: #16a34a; color: #fff; font-weight: bold; padding: 2px 8px; border-radius: 4px;');
    return;
  }

  showBrandMessage();
  suppress();
}
