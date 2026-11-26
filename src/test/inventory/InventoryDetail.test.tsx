/**
 * Inventory add/edit dialog — regressions for the "edit sometimes doesn't work"
 * reports: stale form on reopen, and double-submit while a save is in flight.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ auth: { tenantInfo: { tenantSlug: 'test' } } }),
}));
vi.mock('@/services/productService', () => ({
  productService: { getCategories: vi.fn().mockResolvedValue([]) },
}));

import InventoryDetail from '@/components/inventory/InventoryDetail';

const item: any = {
  id: 'p1', name: 'Gold Ring', category: 'c1', sku: 'RNG-1', price: 100, cost: 40,
  quantity: 2, threshold: 1, description: '', imageUrl: '', additionalImages: [],
};

afterEach(cleanup);

describe('InventoryDetail', () => {
  it('re-seeds the form when the same item is reopened after Cancel', async () => {
    const props = { item, isNew: false, onClose: vi.fn(), onSave: vi.fn() };
    const { rerender } = render(<InventoryDetail {...props} isOpen />);

    const name = screen.getByLabelText('Name') as HTMLInputElement;
    await userEvent.clear(name);
    await userEvent.type(name, 'Unsaved edit');
    expect(name.value).toBe('Unsaved edit');

    // Cancel (parent just closes), then reopen the SAME item object.
    rerender(<InventoryDetail {...props} isOpen={false} />);
    rerender(<InventoryDetail {...props} isOpen />);

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Gold Ring');
  });

  it('ignores a second Save click while the first save is still running', async () => {
    let finish!: () => void;
    const onSave = vi.fn(() => new Promise<void>((r) => { finish = r; }));
    render(<InventoryDetail item={item} isNew={false} isOpen onClose={vi.fn()} onSave={onSave} />);

    const save = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(save);
    // While saving the button is disabled and relabelled; extra clicks do nothing.
    const saving = await screen.findByRole('button', { name: /saving/i });
    expect(saving).toBeDisabled();
    await userEvent.click(saving);
    expect(onSave).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled(),
    );
  });
});
