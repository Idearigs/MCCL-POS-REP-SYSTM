/**
 * POS CartItemPopover — line discount
 *
 * Regression for the "fixed-amount discount doesn't apply" bug: tapping the
 * "Fixed £" toggle used to bubble a mousedown to the document-level
 * click-outside handler, which closed the popover before you could Apply.
 * The fix stops mousedowns inside the popover from reaching that handler.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import CartItemPopover, { CartItemWithMeta } from '@/components/pos/CartItemPopover';

const baseItem: CartItemWithMeta = {
  id: 'itm-1',
  name: 'Test Ring',
  price: 499,
  quantity: 1,
  sku: 'RNG-003',
  cost: 200,
};

function renderPopover(overrides: Record<string, unknown> = {}) {
  const anchor = document.createElement('div');
  document.body.appendChild(anchor);
  const anchorRef = { current: anchor } as React.RefObject<HTMLDivElement>;
  const props = {
    item: baseItem,
    anchorRef,
    staffList: [],
    onUpdateDiscount: vi.fn(),
    onUpdateStaff: vi.fn(),
    onClose: vi.fn(),
    showProfit: false,
    ...overrides,
  };
  const utils = render(<CartItemPopover {...(props as any)} />);
  return { ...utils, props, anchor };
}

afterEach(() => {
  cleanup();
  document.body.querySelectorAll('div').forEach((d) => {
    if (!d.className) d.remove();
  });
});

describe('CartItemPopover — line discount', () => {
  it('does NOT let a mousedown on the "Fixed £" toggle reach the document (the bug)', () => {
    const docSpy = vi.fn();
    document.addEventListener('mousedown', docSpy);
    try {
      renderPopover();
      const fixedBtn = screen.getByRole('button', { name: /Fixed/i });
      fireEvent.mouseDown(fixedBtn);
      // Before the fix this mousedown reached the document click-outside
      // handler and closed the popover. Now it is stopped at the popover root.
      expect(docSpy).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('mousedown', docSpy);
    }
  });

  it('still lets a mousedown OUTSIDE the popover close it', () => {
    const { props } = renderPopover();
    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('applies a fixed-amount discount through the toggle + Apply', async () => {
    const onUpdateDiscount = vi.fn();
    renderPopover({ onUpdateDiscount });

    await userEvent.click(screen.getByRole('button', { name: /Fixed/i }));
    await userEvent.type(screen.getByRole('spinbutton'), '50');
    await userEvent.click(screen.getByRole('button', { name: /^Apply$/i }));

    expect(onUpdateDiscount).toHaveBeenCalledWith({ type: 'fixed', value: 50 });
  });

  it('still applies a percentage discount (the default path)', async () => {
    const onUpdateDiscount = vi.fn();
    renderPopover({ onUpdateDiscount });

    await userEvent.type(screen.getByRole('spinbutton'), '10');
    await userEvent.click(screen.getByRole('button', { name: /^Apply$/i }));

    expect(onUpdateDiscount).toHaveBeenCalledWith({ type: 'percent', value: 10 });
  });
});
