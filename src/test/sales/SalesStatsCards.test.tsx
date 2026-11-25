import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SalesStatsCards from '@/components/sales/SalesStatsCards';

const base = {
  todayRevenue: 120, todaySales: 2,
  weekRevenue: 250, weekSales: 4,
  monthRevenue: 900, monthSales: 12,
  totalRevenue: 5000, totalSales: 60,
};

describe('SalesStatsCards', () => {
  afterEach(cleanup);

  it('shows real changes, up and down, and no invented percentages', () => {
    render(<SalesStatsCards {...base} previous={{ day: 100, week: 500, month: 0 }} />);
    expect(screen.getByText('+20% vs yesterday')).toBeInTheDocument();
    expect(screen.getByText('-50% vs last week')).toBeInTheDocument();
    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument(); // nothing to compare
    expect(screen.queryByText(/\+12%|\+8%|\+15%/)).not.toBeInTheDocument();
  });

  it('hides every trend when the server sends no previous figures', () => {
    render(<SalesStatsCards {...base} />);
    expect(screen.queryByText(/% vs/)).not.toBeInTheDocument();
    expect(screen.getByText('£250.00')).toBeInTheDocument();
  });
});
