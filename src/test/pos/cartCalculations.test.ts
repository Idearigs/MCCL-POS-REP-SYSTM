/**
 * Module 2 — Cart Calculation Logic Tests
 *
 * These exercise the arithmetic used in PaymentPanel without needing to render
 * the full component (which has many context dependencies). The logic is
 * extracted as pure functions matching exactly what PaymentPanel computes.
 *
 * 2.8  Subtotal = sum of (price × qty) with per-item discount %
 * 2.9  Total = subtotal + 20% VAT
 * 2.10 Cash change = cashReceived − total (floored at 0)
 * 2.11 Split payment remaining = total − cardPortion (floored at 0)
 */
import { describe, it, expect } from 'vitest';

// ── Pure logic functions (mirrors PaymentPanel inline calculations) ─────────

interface CartLineItem {
  price: number;
  quantity: number;
  discount?: number; // percentage 0–100
}

function computeSubtotal(items: CartLineItem[]): number {
  return items.reduce((total, item) => {
    const itemDiscount = item.discount ?? 0;
    const itemTotal = item.price * item.quantity;
    return total + itemTotal * (1 - itemDiscount / 100);
  }, 0);
}

function computeTotal(subtotal: number, taxRate = 0.2): number {
  return subtotal + subtotal * taxRate;
}

function computeChange(cashReceived: number, total: number): number {
  return Math.max(0, cashReceived - total);
}

function computeSplitRemaining(total: number, cardPortion: number): number {
  return Math.max(0, total - cardPortion);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Cart — 2.8: subtotal', () => {
  it('sums price × quantity for a single item', () => {
    expect(computeSubtotal([{ price: 100, quantity: 2 }])).toBe(200);
  });

  it('sums multiple items', () => {
    expect(computeSubtotal([
      { price: 100, quantity: 1 },
      { price: 50, quantity: 3 },
    ])).toBe(250);
  });

  it('applies per-item discount percentage', () => {
    // £100 item with 10% discount → £90
    expect(computeSubtotal([{ price: 100, quantity: 1, discount: 10 }])).toBeCloseTo(90);
  });

  it('returns 0 for an empty cart', () => {
    expect(computeSubtotal([])).toBe(0);
  });

  it('ignores undefined discount (treated as 0%)', () => {
    expect(computeSubtotal([{ price: 200, quantity: 1 }])).toBe(200);
  });
});

describe('Cart — 2.9: total with 20% VAT', () => {
  it('adds 20% VAT to subtotal', () => {
    expect(computeTotal(100)).toBeCloseTo(120);
  });

  it('handles fractional subtotals correctly', () => {
    expect(computeTotal(33.33)).toBeCloseTo(39.996);
  });

  it('returns 0 for zero subtotal', () => {
    expect(computeTotal(0)).toBe(0);
  });
});

describe('Cart — 2.10: cash change', () => {
  it('returns exact change when cash exceeds total', () => {
    expect(computeChange(150, 120)).toBeCloseTo(30);
  });

  it('returns 0 when cash exactly matches total', () => {
    expect(computeChange(100, 100)).toBe(0);
  });

  it('returns 0 when cash is less than total (no negative change)', () => {
    expect(computeChange(50, 100)).toBe(0);
  });

  it('handles penny-exact amounts', () => {
    expect(computeChange(20.01, 20.00)).toBeCloseTo(0.01);
  });
});

describe('Cart — 2.11: split payment remaining', () => {
  it('returns amount still owed after card portion', () => {
    expect(computeSplitRemaining(100, 60)).toBeCloseTo(40);
  });

  it('returns 0 when card portion covers the entire total', () => {
    expect(computeSplitRemaining(100, 100)).toBe(0);
  });

  it('returns 0 when card portion exceeds total (overpay)', () => {
    expect(computeSplitRemaining(100, 150)).toBe(0);
  });
});
