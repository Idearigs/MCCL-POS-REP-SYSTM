/**
 * Module 2 — POS CartItem Tests
 * 2.1  Renders product name, price, and quantity correctly
 * 2.2  Computes and displays the line total (price × qty)
 * 2.3  Increment button calls onUpdateQuantity with qty + 1
 * 2.4  Decrement button calls onUpdateQuantity with qty - 1
 * 2.5  Decrement is disabled when quantity is 1
 * 2.6  Remove button calls onRemove with the correct item id
 * 2.7  Shows karat and weight metadata when provided
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import CartItem from '@/components/pos/CartItem';

// ── Default props factory ─────────────────────────────────────────────────

const defaultProps = {
  id: 'prod-001',
  name: 'Diamond Ring',
  price: 250,
  quantity: 2,
  sku: 'DR-001',
  onRemove: vi.fn(),
  onUpdateQuantity: vi.fn(),
};

function renderCartItem(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<CartItem {...props} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CartItem — 2.1: renders product metadata', () => {
  it('displays the product name', () => {
    renderCartItem();
    expect(screen.getByText('Diamond Ring')).toBeInTheDocument();
  });

  it('displays the SKU', () => {
    renderCartItem();
    expect(screen.getByText('DR-001')).toBeInTheDocument();
  });

  it('displays the unit price', () => {
    renderCartItem();
    expect(screen.getByText(/×\s*£250\.00/)).toBeInTheDocument();
  });
});

describe('CartItem — 2.2: line total', () => {
  it('shows price × quantity as the line total', () => {
    // 250 × 2 = 500
    renderCartItem({ price: 250, quantity: 2 });
    expect(screen.getByText('£500.00')).toBeInTheDocument();
  });

  it('updates displayed total when quantity is 1', () => {
    renderCartItem({ price: 99.99, quantity: 1 });
    expect(screen.getByText('£99.99')).toBeInTheDocument();
  });
});

describe('CartItem — 2.3: increment', () => {
  it('calls onUpdateQuantity with qty + 1 when + is clicked', async () => {
    const onUpdateQuantity = vi.fn();
    renderCartItem({ quantity: 3, onUpdateQuantity });

    // Button order: [Minus, Plus, Remove]. Plus is index 1.
    const allButtons = screen.getAllByRole('button');
    await userEvent.click(allButtons[1]);
    expect(onUpdateQuantity).toHaveBeenCalledWith('prod-001', 4);
  });
});

describe('CartItem — 2.4 & 2.5: decrement', () => {
  it('calls onUpdateQuantity with qty - 1 when - is clicked (qty > 1)', async () => {
    const onUpdateQuantity = vi.fn();
    renderCartItem({ quantity: 3, onUpdateQuantity });

    const allButtons = screen.getAllByRole('button');
    await userEvent.click(allButtons[0]); // Minus
    expect(onUpdateQuantity).toHaveBeenCalledWith('prod-001', 2);
  });

  it('does NOT call onUpdateQuantity when quantity is already 1', async () => {
    const onUpdateQuantity = vi.fn();
    renderCartItem({ quantity: 1, onUpdateQuantity });

    const allButtons = screen.getAllByRole('button');
    await userEvent.click(allButtons[0]); // Minus (disabled)
    expect(onUpdateQuantity).not.toHaveBeenCalled();
  });

  it('minus button is disabled when quantity is 1', () => {
    renderCartItem({ quantity: 1 });
    const allButtons = screen.getAllByRole('button');
    expect(allButtons[0]).toBeDisabled();
  });
});

describe('CartItem — 2.6: remove', () => {
  it('calls onRemove with the item id when trash button is clicked', async () => {
    const onRemove = vi.fn();
    renderCartItem({ id: 'prod-001', onRemove });

    const allButtons = screen.getAllByRole('button');
    // Trash button is the last button
    await userEvent.click(allButtons[allButtons.length - 1]);
    expect(onRemove).toHaveBeenCalledWith('prod-001');
  });
});

describe('CartItem — 2.7: optional metadata', () => {
  it('shows karat when provided', () => {
    renderCartItem({ karat: '18K' });
    expect(screen.getByText(/18K/)).toBeInTheDocument();
  });

  it('shows weight when provided', () => {
    renderCartItem({ weight: '3.5g' });
    expect(screen.getByText(/3\.5g/)).toBeInTheDocument();
  });

  it('shows nothing extra when karat and weight are omitted', () => {
    renderCartItem({ karat: undefined, weight: undefined });
    expect(screen.queryByText(/18K/)).not.toBeInTheDocument();
    // Weight like "3.5g" — match digit+g pattern, not the word "Ring"
    expect(screen.queryByText(/\d+(\.\d+)?g/)).not.toBeInTheDocument();
  });
});
