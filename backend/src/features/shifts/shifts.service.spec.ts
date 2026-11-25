import { ShiftsService } from './shifts.service';

const sale = (over: Record<string, unknown>) => ({
  status: 'COMPLETED',
  totalAmount: 0,
  refundedAmount: 0,
  subtotal: 0,
  taxAmount: 0,
  discountAmount: 0,
  paymentMethod: 'CASH',
  sale_items: [],
  ...over,
});

describe('ShiftsService', () => {
  const prisma = {
    shifts: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const service = new ShiftsService(prisma as any, {} as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.shifts.findMany.mockResolvedValue([]);
  });

  describe('getShiftReport() refund figures', () => {
    const reportFor = async (sales: unknown[]) => {
      prisma.shifts.findUnique.mockResolvedValue({ openingFloat: 0, sales });
      return (await service.getShiftReport('shift-1')).metrics;
    };

    it('counts each refund once: gross - refunded = net', async () => {
      const m = await reportFor([
        sale({ totalAmount: 1000 }),
        // £800 sale, fully refunded
        sale({ status: 'REFUNDED', totalAmount: 0, refundedAmount: 800 }),
        // £500 sale, £200 refunded
        sale({ status: 'REFUNDED', totalAmount: 300, refundedAmount: 200 }),
        sale({ status: 'CANCELLED', totalAmount: 999 }),
      ]);
      expect(m.grossRevenue).toBe(2300);
      expect(m.refundedTotal).toBe(1000);
      expect(m.netRevenue).toBe(1300);
      expect(m.transactionCount).toBe(3);
    });

    it('leaves the figures cash-up uses unchanged', async () => {
      const m = await reportFor([
        sale({ totalAmount: 1000 }),
        sale({ status: 'REFUNDED', totalAmount: 300, refundedAmount: 200 }),
      ]);
      expect(m.totalRevenue).toBe(1000);
      expect(m.totalSales).toBe(1);
      expect(m.cashSales).toBe(1000);
    });

    it('does not leak floating-point pennies', async () => {
      const m = await reportFor([
        sale({ totalAmount: 0.1 }),
        sale({ totalAmount: 0.2 }),
      ]);
      expect(m.netRevenue).toBe(0.3);
    });
  });

  describe('getShiftsByDateRange()', () => {
    const start = new Date('2026-09-01T00:00:00Z');
    const end = new Date('2026-09-30T22:59:59.999Z');
    const whereFor = async (overlap?: boolean) => {
      await service.getShiftsByDateRange(
        't1',
        start,
        end,
        undefined,
        undefined,
        overlap,
      );
      return prisma.shifts.findMany.mock.calls[0][0].where;
    };

    it('filters by start date by default (cash-up, float history)', async () => {
      const where = await whereFor();
      expect(where.startTime.gte).toEqual(start);
      expect(where.OR).toBeUndefined();
    });

    it('with overlap, includes a shift opened earlier and still open', async () => {
      const where = await whereFor(true);
      expect(where.startTime).toEqual({ lte: end });
      expect(where.OR).toEqual([
        { endTime: null },
        { endTime: { gte: start } },
      ]);
    });
  });
});
