import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import React from 'react';

const { getSales, getRepairs } = vi.hoisted(() => ({ getSales: vi.fn(), getRepairs: vi.fn() }));
vi.mock('@/services/salesService', () => ({ salesService: { getSales } }));
vi.mock('@/services/repairService', () => ({ repairService: { getRepairs } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ auth: { isAuthenticated: true, loading: false } }) }));
vi.mock('@/components/layout/MainLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

import { TransactionProvider } from '@/contexts/TransactionContext';
import HistoryPage from '@/pages/HistoryPage';

const sale = { id: 'sale-1', createdAt: '2026-09-18T21:14:00Z', date: '2026-09-18', customerName: 'Walk-in', items: [], totalAmount: 10 };

describe('transaction history loading', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('downloads nothing for the rest of the app', async () => {
    render(<TransactionProvider><p>POS</p></TransactionProvider>);
    await new Promise((r) => setTimeout(r, 30));
    expect(getSales).not.toHaveBeenCalled();
    expect(getRepairs).not.toHaveBeenCalled();
  });

  it('loads and shows the list when History opens', async () => {
    getSales.mockResolvedValue({ data: [sale], meta: { totalPages: 1 } });
    getRepairs.mockResolvedValue({ data: [], meta: { totalPages: 1 } });
    render(<TransactionProvider><HistoryPage /></TransactionProvider>);
    expect(await screen.findByText('sale-1')).toBeInTheDocument();
  });

  it('still shows sales when repairs fail', async () => {
    getSales.mockResolvedValue({ data: [sale], meta: { totalPages: 1 } });
    getRepairs.mockRejectedValue({ message: 'timeout' });
    render(<TransactionProvider><HistoryPage /></TransactionProvider>);
    expect(await screen.findByText('sale-1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/could not be loaded/)).toBeInTheDocument());
  });
});
