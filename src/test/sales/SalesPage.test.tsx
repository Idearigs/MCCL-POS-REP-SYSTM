/**
 * Sales page — mounts the real page, and checks the filters drive the server
 * query (it used to filter only the latest 100 sales in the browser).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const getSales = vi.hoisted(() => vi.fn());
vi.mock('@/components/layout/MainLayout', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/sales/SaleDetailModal', () => ({ default: () => null }));
vi.mock('@/components/sales/RefundSaleDialog', () => ({ default: () => null }));
vi.mock('@/components/sales/ProductSalesReport', () => ({ default: () => null }));
vi.mock('@/components/shifts/ShiftReport', () => ({ default: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ auth: { user: { id: 'u1', role: 'OWNER' } } }) }));
vi.mock('@/contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { general: {}, printer: {} } }) }));
vi.mock('@/utils/thermalReceipt', () => ({ printRefundReceipt: vi.fn() }));
vi.mock('@/services/userService', () => ({ userService: { getUsers: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/services/shiftService', () => ({ shiftService: { getShiftsByDateRange: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/services/salesService', () => ({
  salesService: {
    getSales,
    getSalesStats: vi.fn().mockResolvedValue({}),
    getRefundPasswordStatus: vi.fn().mockResolvedValue({ isSet: false }),
  },
}));

import SalesPage from '@/pages/SalesPage';

const sale = (over: any = {}) => ({
  id: 'sale-0001', receiptNumber: 'SALE-1', createdAt: new Date().toISOString(), totalAmount: 10,
  refundedAmount: 0, paymentMethod: 'CASH', paymentStatus: 'COMPLETED', status: 'COMPLETED',
  customerName: 'Walk-in', cashierId: 'u1', cashierName: 'Min', items: [], notes: '', ...over,
});

beforeEach(() => getSales.mockReset().mockResolvedValue({ data: [sale()], meta: { hasNextPage: false } }));
afterEach(cleanup);

describe('SalesPage', () => {
  it('mounts and lists sales', async () => {
    render(<SalesPage />);
    expect(await screen.findByText(/Showing 1 of 1 sales/)).toBeInTheDocument();
  });

  it('"Today" queries the server from the start of the day and keeps a sale made earlier today', async () => {
    const early = new Date(); early.setHours(0, 0, 1, 0);
    getSales.mockResolvedValue({ data: [sale({ createdAt: early.toISOString() })], meta: { hasNextPage: false } });
    render(<SalesPage />);
    await screen.findByText(/Showing 1 of 1 sales/);
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => {
      const q = getSales.mock.calls.at(-1)![2];
      expect(new Date(q.startDate).getHours()).toBe(0);
      expect(q.endDate).toBeTruthy();
    });
    expect(await screen.findByText(/Showing 1 of 1 sales/)).toBeInTheDocument();
  });

  it('loads every page, not just the first', async () => {
    getSales
      .mockResolvedValueOnce({ data: [sale({ id: 'a1' })], meta: { hasNextPage: true } })
      .mockResolvedValueOnce({ data: [sale({ id: 'a2' })], meta: { hasNextPage: false } });
    render(<SalesPage />);
    expect(await screen.findByText(/Showing 2 of 2 sales/)).toBeInTheDocument();
  });

  it('sends the search term to the server and keeps its matches', async () => {
    render(<SalesPage />);
    await screen.findByText(/Showing 1 of 1 sales/);
    await userEvent.type(screen.getByPlaceholderText(/Search by sale/), 'BARCODE-9');
    await waitFor(() => expect(getSales.mock.calls.at(-1)![2].search).toBe('BARCODE-9'), { timeout: 3000 });
    // nothing on the row contains the term: the server matched it by product code
    expect(await screen.findByText(/Showing 1 of 1 sales/)).toBeInTheDocument();
  });

  it('renders a large result in pages instead of mounting every row', async () => {
    getSales.mockResolvedValue({
      data: Array.from({ length: 120 }, (_, i) => sale({ id: `s${i}` })),
      meta: { hasNextPage: false },
    });
    render(<SalesPage />);
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(50);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('a wide date range is accepted and Apply shows the count and closes the panel', async () => {
    render(<SalesPage />);
    await screen.findByText(/Showing 1 of 1 sales/);
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2024-02-01' } });
    // From later than To: the range follows instead of blocking the choice
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-05-10' } });
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2024-05-10');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2020-01-01' } });
    await waitFor(() => {
      const q = getSales.mock.calls.at(-1)![2];
      expect(new Date(q.startDate).getFullYear()).toBe(2020);
      expect(q.endDate).toBe('2024-05-10');
    });
    const apply = await screen.findByRole('button', { name: /Apply — show 0 sales/ });
    await userEvent.click(apply);
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
  });

  it('keeps a date while its year is being typed, and only queries the full date', async () => {
    render(<SalesPage />);
    await screen.findByText(/Showing 1 of 1 sales/);
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const from = screen.getByLabelText('From') as HTMLInputElement;
    const calls = getSales.mock.calls.length;
    for (const v of ['0002-01-01', '0020-01-01', '0202-01-01']) {
      fireEvent.change(from, { target: { value: v } });
      expect(from.value).toBe(v); // used to be reset to ''
    }
    expect(getSales.mock.calls.length).toBe(calls);
    fireEvent.change(from, { target: { value: '2020-01-01' } });
    await waitFor(() =>
      expect(new Date(getSales.mock.calls.at(-1)![2].startDate).getFullYear()).toBe(2020));
  });

  it('Shifts tab asks for dates instead of claiming there are no shifts', async () => {
    render(<SalesPage />);
    await screen.findByText(/Showing 1 of 1 sales/);
    await userEvent.click(screen.getByRole('button', { name: 'Shifts' }));
    expect(screen.getByText(/Pick a From and To date/)).toBeInTheDocument();
  });

  it('a part-refunded sale is labelled, can be refunded again, and cannot be voided', async () => {
    getSales.mockResolvedValue({
      data: [sale({ status: 'COMPLETED', paymentStatus: 'COMPLETED', totalAmount: 70, refundedAmount: 30 })],
      meta: { hasNextPage: false },
    });
    render(<SalesPage />);
    expect(await screen.findByText('Part-Refunded')).toBeInTheDocument();
    expect(document.querySelector('.lucide-rotate-ccw')).toBeInTheDocument();
    expect(screen.queryByTitle('Void Transaction')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTitle('Show refund details'));
    expect(screen.getByText(/Refunded £30\.00/)).toBeInTheDocument();
  });
});
