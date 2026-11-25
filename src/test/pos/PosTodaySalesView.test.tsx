import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const { getSales, getActiveShift, getShiftReport } = vi.hoisted(() => ({
  getSales: vi.fn(), getActiveShift: vi.fn(), getShiftReport: vi.fn(),
}));
vi.mock('@/services/salesService', () => ({ salesService: { getSales } }));
vi.mock('@/services/shiftService', () => ({ shiftService: { getActiveShift, getShiftReport } }));
vi.mock('@/contexts/InventoryContext', () => ({ useInventory: () => ({ inventory: [] }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import PosTodaySalesView from '@/components/pos/PosTodaySalesView';

const sales = [
  { id: 'a', saleNumber: 'S-1', status: 'COMPLETED', totalAmount: 1000, refundedAmount: 0, items: [] },
  { id: 'b', saleNumber: 'S-2', status: 'REFUNDED', totalAmount: 0, refundedAmount: 800, items: [] },
  { id: 'c', saleNumber: 'S-3', status: 'REFUNDED', totalAmount: 300, refundedAmount: 200, items: [] },
  { id: 'd', saleNumber: 'S-4', status: 'CANCELLED', totalAmount: 50, refundedAmount: 0, items: [] },
];

describe('PosTodaySalesView', () => {
  beforeEach(() => { vi.clearAllMocks(); getSales.mockResolvedValue({ data: sales }); });
  afterEach(cleanup);

  it('subtracts refunds once when there is no open shift', async () => {
    getActiveShift.mockResolvedValue(null);
    render(<PosTodaySalesView onClose={() => {}} />);
    expect(await screen.findByText('£2,300.00')).toBeInTheDocument(); // gross
    expect(screen.getByText('£1,300.00')).toBeInTheDocument(); // net (was £300)
    expect(screen.getByText('−£1,000.00 refunded')).toBeInTheDocument();
  });

  it('uses the server shift totals when a shift is open', async () => {
    getActiveShift.mockResolvedValue({ id: 'sh', startTime: '2026-11-26T09:00:00Z', shiftNumber: 'SH-1' });
    getShiftReport.mockResolvedValue({
      metrics: { totalRevenue: 1, totalSales: 1, transactionCount: 260, grossRevenue: 9000, refundedTotal: 800, netRevenue: 8200 },
    });
    render(<PosTodaySalesView onClose={() => {}} />);
    expect(await screen.findByText('£9,000.00')).toBeInTheDocument();
    expect(screen.getByText('£8,200.00')).toBeInTheDocument();
    expect(screen.getByText('260')).toBeInTheDocument();
  });

  it('shows the original price on a refunded sale, not £0', async () => {
    getActiveShift.mockResolvedValue(null);
    render(<PosTodaySalesView onClose={() => {}} />);
    await screen.findByText('S-2');
    expect(screen.getByText('£800.00')).toBeInTheDocument();
  });
});
