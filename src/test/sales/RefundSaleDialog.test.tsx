import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import RefundSaleDialog from '@/components/sales/RefundSaleDialog';
import { isRefundable, originalTotal, refundState } from '@/utils/saleRefunds';

const partRefunded: any = {
  id: 'sale-1', saleNumber: 'S-1', status: 'COMPLETED', totalAmount: 70, refundedAmount: 30,
  items: [{ id: 'b', productName: 'Ring', quantity: 1, unitPrice: 70, totalPrice: 70 }],
};

describe('refund figures', () => {
  afterEach(cleanup);

  it('dialog offers what is left, not left minus refunded', () => {
    render(<RefundSaleDialog isOpen onClose={() => {}} sale={partRefunded} onConfirmRefund={vi.fn()} />);
    expect(screen.getByText('£100.00')).toBeInTheDocument(); // original
    expect(screen.getByText('-£30.00')).toBeInTheDocument(); // already refunded
    expect(screen.getByText(/Full Refund — £70\.00/)).toBeInTheDocument(); // was £40
    expect(screen.queryByText(/£40\.00/)).not.toBeInTheDocument();
  });

  it('classifies sales', () => {
    expect(refundState(partRefunded)).toBe('PARTIAL');
    expect(originalTotal(partRefunded)).toBe(100);
    expect(isRefundable(partRefunded)).toBe(true);
    const full = { status: 'REFUNDED', totalAmount: 0, refundedAmount: 100 };
    expect(refundState(full)).toBe('FULL');
    expect(isRefundable(full)).toBe(false);
    expect(refundState({ status: 'COMPLETED', totalAmount: 5, refundedAmount: 0 })).toBe('NONE');
    // Sales part-refunded before this change are REFUNDED; the server refuses those
    expect(isRefundable({ status: 'REFUNDED', totalAmount: 70, refundedAmount: 30 })).toBe(false);
  });
});
