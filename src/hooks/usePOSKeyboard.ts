import { useEffect, useRef } from 'react';

interface CartItem {
  id: string;
  quantity: number;
}

interface POSKeyboardConfig {
  searchRef: React.RefObject<HTMLInputElement>;
  cart: CartItem[];
  selectedCartItemId: string | null;
  setSelectedCartItemId: (id: string | null) => void;
  onCheckout: () => void;
  onHold: () => void;
  onSuspend: () => void;
  onOpenCustomer: () => void;
  onClearCart: () => void;
  onBarcodeScanned: (code: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  setShowAltOverlay: (show: boolean) => void;
}

// Hardware barcode scanners fire chars < 20 ms apart then send Enter.
// Manual typing is typically > 100 ms per char.
const SCANNER_THRESHOLD_MS = 20;
const MIN_BARCODE_LENGTH = 4;
const ALT_HOLD_MS = 2000;

export function usePOSKeyboard(config: POSKeyboardConfig) {
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);
  const altHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to config so the effect doesn't need to re-register
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cfg = configRef.current;
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      const now = Date.now();
      const gap = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // ── Barcode / scanner detection ──────────────────────────────────────
      // Printable single char, no modifier: accumulate into buffer if rapid
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (gap < SCANNER_THRESHOLD_MS) {
          barcodeBuffer.current += e.key;
        } else {
          barcodeBuffer.current = e.key; // start fresh
        }
        return; // let keystrokes fall through to page normally
      }

      // Enter: if buffer is long enough → barcode scan, regardless of focus
      if (e.key === 'Enter' && barcodeBuffer.current.length >= MIN_BARCODE_LENGTH) {
        const code = barcodeBuffer.current;
        barcodeBuffer.current = '';
        cfg.onBarcodeScanned(code);
        e.preventDefault();
        return;
      }

      // Non-printable non-Enter key: reset buffer
      if (e.key !== 'Enter') {
        barcodeBuffer.current = '';
      }

      // ── Named shortcuts ──────────────────────────────────────────────────

      // Block F5 / Ctrl+R refresh when cart is not empty — prevent accidental data loss
      if ((e.key === 'F5' || (e.key === 'r' && e.ctrlKey)) && cfg.cart.length > 0) {
        e.preventDefault();
        return;
      }

      // Space: checkout when cart has items and focus is not in a text input
      if (e.key === ' ' && !inInput && !e.ctrlKey && !e.shiftKey && cfg.cart.length > 0) {
        e.preventDefault();
        cfg.onCheckout();
        return;
      }

      // F8 or /: focus search bar
      if (e.key === 'F8' || (e.key === '/' && !inInput)) {
        e.preventDefault();
        cfg.searchRef.current?.focus();
        cfg.searchRef.current?.select();
        return;
      }

      // F4: open customer picker
      if (e.key === 'F4') {
        e.preventDefault();
        cfg.onOpenCustomer();
        return;
      }

      // F9: hold sale
      if (e.key === 'F9') {
        e.preventDefault();
        if (cfg.cart.length > 0) cfg.onHold();
        return;
      }

      // F10: suspend sale (browser default is menu; we override)
      if (e.key === 'F10') {
        e.preventDefault();
        if (cfg.cart.length > 0) cfg.onSuspend();
        return;
      }

      // Ctrl+Enter or Ctrl+Space: checkout
      if (e.ctrlKey && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (cfg.cart.length > 0) cfg.onCheckout();
        return;
      }

      // Ctrl+Shift+Delete: clear cart
      if (e.ctrlKey && e.shiftKey && e.key === 'Delete') {
        e.preventDefault();
        cfg.onClearCart();
        return;
      }

      // Del / Backspace when NOT in a text input: remove selected cart item
      if (!inInput && !e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        if (cfg.selectedCartItemId) {
          cfg.removeFromCart(cfg.selectedCartItemId);
          cfg.setSelectedCartItemId(null);
        }
        return;
      }

      // + / =: increment selected cart item qty
      if (!inInput && (e.key === '+' || e.key === '=')) {
        if (cfg.selectedCartItemId) {
          cfg.updateQuantity(cfg.selectedCartItemId, 1);
        }
        return;
      }

      // -: decrement selected cart item qty
      if (!inInput && e.key === '-') {
        if (cfg.selectedCartItemId) {
          cfg.updateQuantity(cfg.selectedCartItemId, -1);
        }
        return;
      }

      // Alt hold — handled in separate keydown listener below
    };

    const handleAltDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && !altHoldTimer.current) {
        altHoldTimer.current = setTimeout(() => {
          configRef.current.setShowAltOverlay(true);
        }, ALT_HOLD_MS);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        if (altHoldTimer.current) {
          clearTimeout(altHoldTimer.current);
          altHoldTimer.current = null;
        }
        configRef.current.setShowAltOverlay(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleAltDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleAltDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (altHoldTimer.current) clearTimeout(altHoldTimer.current);
    };
  }, []); // empty — configRef keeps it live
}
