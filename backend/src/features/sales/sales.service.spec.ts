import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { CreateSaleDto, CreateRefundDto } from './dto/sale.dto';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { ShiftsService } from '../shifts/shifts.service';
import { SettingsService } from '../settings/settings.service';

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────
const mockProduct = {
  id: 'prod-001',
  tenantId: 'tenant-001',
  name: 'Diamond Ring',
  sku: 'DR-001',
  sellingPrice: 500,
  stockQuantity: 10,
  isActive: true,
};

const mockSale = {
  id: 'sale-001',
  saleNumber: 'SAL-202603-0001',
  tenantId: 'tenant-001',
  customerId: null,
  createdBy: 'user-001',
  status: 'COMPLETED',
  subtotal: 500,
  discountAmount: 0,
  taxAmount: 0,
  totalAmount: 500,
  amountPaid: 500,
  changeGiven: 0,
  paymentMethod: 'CASH',
  paymentStatus: 'COMPLETED',
  notes: null,
  createdAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-01'),
  customers: null,
  users: { firstName: 'Admin', lastName: 'User' },
  sale_items: [
    {
      id: 'item-001',
      saleId: 'sale-001',
      productId: 'prod-001',
      quantity: 1,
      unitPrice: 500,
      discount: 0,
      total: 500,
      products: mockProduct,
    },
  ],
  payments: [
    {
      id: 'pay-001',
      amount: 500,
      method: 'CASH',
      status: 'COMPLETED',
      createdAt: new Date(),
    },
  ],
};

// Transaction mock — wraps callback execution
const mockPrismaTransaction = jest.fn().mockImplementation(async (fn) => {
  const prismaMock = {
    // Row-lock query (SELECT … FOR UPDATE) used by create() to lock product
    // rows. Returns the locked stock snapshot the service validates against.
    $queryRaw: jest
      .fn()
      .mockResolvedValue([
        { id: 'prod-001', name: 'Diamond Ring', stockQuantity: 10 },
      ]),
    sales: {
      create: jest.fn().mockResolvedValue(mockSale),
      findFirst: jest.fn().mockResolvedValue(mockSale),
      findMany: jest.fn().mockResolvedValue([mockSale]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockSale),
    },
    products: {
      findFirst: jest.fn().mockResolvedValue(mockProduct),
      update: jest.fn().mockResolvedValue(mockProduct),
      findMany: jest.fn().mockResolvedValue([mockProduct]),
    },
    sale_items: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    payments: {
      create: jest.fn().mockResolvedValue({ id: 'pay-001', amount: 500 }),
    },
    customers: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    audit_logs: {
      create: jest.fn(),
    },
  };
  return fn(prismaMock);
});

// SalesRepository mock — used for findAll, findOne, update, getStats
const mockSalesRepository = {
  findFirst: jest.fn().mockResolvedValue(mockSale),
  findMany: jest.fn().mockResolvedValue([mockSale]),
  count: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue(mockSale),
  aggregate: jest
    .fn()
    .mockResolvedValue({ _sum: { totalAmount: 0, refundedAmount: 0 } }),
  findFirstSaleItem: jest.fn().mockResolvedValue(null),
  updateSaleItem: jest.fn(),
};

// PrismaService mock — used for $transaction (create/refund) and cross-model queries
const mockPrismaService = {
  $transaction: mockPrismaTransaction,
  products: {
    findFirst: jest.fn().mockResolvedValue(mockProduct),
    update: jest.fn().mockResolvedValue(mockProduct),
    findMany: jest.fn().mockResolvedValue([]),
  },
  sale_items: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  payments: {
    groupBy: jest.fn().mockResolvedValue([]),
  },
  users: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  getTenantData: jest.fn().mockResolvedValue(null),
  setTenantData: jest.fn().mockResolvedValue(undefined),
  delTenantData: jest.fn().mockResolvedValue(undefined),
};

const mockShiftsService = {
  getActiveShift: jest.fn().mockResolvedValue(null),
  addSaleToShift: jest.fn().mockResolvedValue(undefined),
};

const mockSettingsService = {
  hasRefundPassword: jest.fn().mockResolvedValue(false),
  verifyRefundPassword: jest.fn().mockResolvedValue(true),
};

// ──────────────────────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────────────────────
describe('SalesService', () => {
  let service: SalesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SalesService(
      mockSalesRepository as unknown as SalesRepository,
      mockPrismaService as unknown as PrismaService,
      mockCacheService as unknown as CacheService,
      mockShiftsService as unknown as ShiftsService,
      mockSettingsService as unknown as SettingsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // findAll()
  // ────────────────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated sales', async () => {
      mockSalesRepository.findMany.mockResolvedValue([mockSale]);
      mockSalesRepository.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10 } as any,
        'tenant-001',
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should scope results to the tenant', async () => {
      mockSalesRepository.findMany.mockResolvedValue([]);
      mockSalesRepository.count.mockResolvedValue(0);

      await service.findAll({} as any, 'tenant-abc');

      const findManyCall = mockSalesRepository.findMany.mock.calls[0][0];
      expect(findManyCall.where.tenantId).toBe('tenant-abc');
    });

    it('should filter by date range when provided', async () => {
      mockSalesRepository.findMany.mockResolvedValue([]);
      mockSalesRepository.count.mockResolvedValue(0);

      await service.findAll(
        { startDate: '2026-01-01', endDate: '2026-03-31' } as any,
        'tenant-001',
      );

      const findManyCall = mockSalesRepository.findMany.mock.calls[0][0];
      expect(findManyCall.where.createdAt).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // findOne()
  // ────────────────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return a sale by ID', async () => {
      mockSalesRepository.findFirst.mockResolvedValue(mockSale);

      const result = await service.findOne('sale-001', 'tenant-001');

      expect(result).toHaveProperty('id', 'sale-001');
    });

    it('should throw NotFoundException when sale does not exist', async () => {
      mockSalesRepository.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // getStats()
  // ────────────────────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return sales statistics', async () => {
      mockSalesRepository.count
        .mockResolvedValueOnce(100) // total sales
        .mockResolvedValueOnce(5); // today sales

      mockSalesRepository.findMany.mockResolvedValue([
        {
          totalAmount: 200,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          createdAt: new Date(),
        },
        {
          totalAmount: 300,
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          createdAt: new Date(),
        },
      ]);

      const result = await service.getStats('tenant-001');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalRevenue');
    });

    describe('week figures and like-for-like trends', () => {
      afterEach(() => {
        jest.useRealTimers();
        mockSalesRepository.aggregate.mockResolvedValue({
          _sum: { totalAmount: 0, refundedAmount: 0 },
        });
      });

      // Revenue per window, keyed by the window the service asked for.
      const statsAt = async (now: Date) => {
        jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate'] });
        mockSalesRepository.aggregate.mockClear();
        const windows: { gte: Date; lt?: Date }[] = [];
        mockSalesRepository.aggregate.mockImplementation(({ where }) => {
          if (where.createdAt) windows.push(where.createdAt);
          return Promise.resolve({ _sum: { totalAmount: 0 } });
        });
        await service.getStats('tenant-001');
        return windows.map((w) => [w.gte, w.lt]);
      };

      it('starts the week on Monday, not the 1st of the month', async () => {
        // Thursday 26 Nov 2026, 15:30
        const windows = await statsAt(new Date(2026, 10, 26, 15, 30));
        expect(windows).toContainEqual([new Date(2026, 10, 23), undefined]);
        expect(windows).toContainEqual([new Date(2026, 10, 1), undefined]);
      });

      it('treats Sunday as the last day of the week', async () => {
        const windows = await statsAt(new Date(2026, 10, 29, 9, 0));
        expect(windows).toContainEqual([new Date(2026, 10, 23), undefined]);
      });

      it('compares with the same point in the previous period', async () => {
        const windows = await statsAt(new Date(2026, 10, 26, 15, 30));
        expect(windows).toContainEqual([
          new Date(2026, 10, 25),
          new Date(2026, 10, 25, 15, 30),
        ]);
        expect(windows).toContainEqual([
          new Date(2026, 10, 16),
          new Date(2026, 10, 19, 15, 30),
        ]);
      });

      it('never lets a short previous month run into this one', async () => {
        // 31 March: February has no 31st
        const windows = await statsAt(new Date(2026, 2, 31, 12, 0));
        expect(windows).toContainEqual([
          new Date(2026, 1, 1),
          new Date(2026, 2, 1),
        ]);
      });

      it('returns the week total separately from the month total', async () => {
        jest.useFakeTimers({
          now: new Date(2026, 10, 26, 15, 30),
          doNotFake: ['nextTick', 'setImmediate'],
        });
        mockSalesRepository.aggregate.mockImplementation(({ where }) => {
          const c = where.createdAt;
          const amount =
            c?.gte?.getTime() === new Date(2026, 10, 23).getTime() && !c.lt
              ? 250
              : c?.gte?.getTime() === new Date(2026, 10, 1).getTime()
                ? 900
                : 0;
          return Promise.resolve({ _sum: { totalAmount: amount } });
        });
        const result = await service.getStats('tenant-001');
        expect(result.revenueThisWeek).toBe(250);
        expect(result.revenueThisMonth).toBe(900);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // create()
  // ────────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const validDto: CreateSaleDto = {
      items: [
        {
          productId: 'prod-001',
          quantity: 1,
          unitPrice: 500,
        },
      ],
      payments: [{ method: 'CASH' as any, amount: 500 }],
    } as CreateSaleDto;

    it('should create a sale and return a sale response', async () => {
      const result = await service.create(validDto, 'tenant-001', 'user-001');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('saleNumber');
    });

    it('subtracts a per-line discountAmount from the sale total', async () => {
      // Regression: the total used to sum the UNDISCOUNTED line, so a
      // discounted line was charged (450) but the total stayed full (500),
      // failing payment validation. Payment of 450 must now be accepted.
      const discountedDto: CreateSaleDto = {
        items: [
          {
            productId: 'prod-001',
            quantity: 1,
            unitPrice: 500,
            discountAmount: 50,
            taxRate: 0,
          },
        ],
        payments: [{ method: 'CASH' as any, amount: 450 }], // 500 − 50
        taxRate: 0,
      } as CreateSaleDto;

      await expect(
        service.create(discountedDto, 'tenant-001', 'user-001'),
      ).resolves.toBeDefined();
    });

    it('should throw NotFoundException when a product does not exist', async () => {
      // Override the $transaction mock so products.findFirst returns null
      mockPrismaService.$transaction.mockImplementationOnce(async (fn) => {
        const prismaMock = {
          // No rows locked → product treated as not found.
          $queryRaw: jest.fn().mockResolvedValue([]),
          sales: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
          products: {
            findFirst: jest.fn().mockResolvedValue(null), // product not found
            update: jest.fn(),
          },
          customers: { findFirst: jest.fn().mockResolvedValue(null) },
          sale_items: { create: jest.fn() },
          payments: { create: jest.fn() },
          audit_logs: { create: jest.fn() },
        };
        return fn(prismaMock);
      });

      await expect(
        service.create(validDto, 'tenant-001', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const lowStockProduct = { ...mockProduct, stockQuantity: 0 };

      mockPrismaService.$transaction.mockImplementationOnce(async (fn) => {
        const prismaMock = {
          // Locked row reports zero stock → insufficient-stock guard fires.
          $queryRaw: jest
            .fn()
            .mockResolvedValue([
              { id: 'prod-001', name: 'Diamond Ring', stockQuantity: 0 },
            ]),
          sales: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
          products: {
            findFirst: jest.fn().mockResolvedValue(lowStockProduct),
            update: jest.fn(),
          },
          customers: { findFirst: jest.fn().mockResolvedValue(null) },
          sale_items: { create: jest.fn() },
          payments: { create: jest.fn() },
          audit_logs: { create: jest.fn() },
        };
        return fn(prismaMock);
      });

      const dtoRequestingMore: CreateSaleDto = {
        ...validDto,
        items: [{ productId: 'prod-001', quantity: 5, unitPrice: 500 }],
        payments: [{ method: 'CASH' as any, amount: 2500 }],
      } as CreateSaleDto;

      await expect(
        service.create(dtoRequestingMore, 'tenant-001', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payment amount does not match total', async () => {
      const wrongPaymentDto: CreateSaleDto = {
        ...validDto,
        items: [
          { productId: 'prod-001', quantity: 1, unitPrice: 500, taxRate: 0 },
        ],
        payments: [{ method: 'CASH' as any, amount: 100 }], // 100 ≠ 500
        taxRate: 0,
      } as CreateSaleDto;

      await expect(
        service.create(wrongPaymentDto, 'tenant-001', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // createRefund()
  // ────────────────────────────────────────────────────────────────────────────

  describe('createRefund()', () => {
    const refundDto: CreateRefundDto = {
      items: [{ saleItemId: 'item-001', quantity: 1 }],
      reason: 'Customer changed mind',
    } as CreateRefundDto;

    it('should throw NotFoundException when sale does not exist', async () => {
      mockPrismaService.$transaction.mockImplementationOnce(async (fn) => {
        const prismaMock = {
          // Sale row lock (SELECT … FOR UPDATE) — result discarded, lock only.
          $queryRaw: jest.fn().mockResolvedValue([]),
          sales: {
            findFirst: jest.fn().mockResolvedValue(null), // sale not found
            update: jest.fn(),
          },
          products: { update: jest.fn() },
          sale_items: { delete: jest.fn(), update: jest.fn() },
          payments: { create: jest.fn() },
          audit_logs: { create: jest.fn() },
        };
        return fn(prismaMock);
      });

      await expect(
        service.createRefund(
          'nonexistent-id',
          refundDto,
          'tenant-001',
          'user-001',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when sale is not COMPLETED', async () => {
      const cancelledSale = { ...mockSale, status: 'CANCELLED' };

      mockPrismaService.$transaction.mockImplementationOnce(async (fn) => {
        const prismaMock = {
          // Sale row lock (SELECT … FOR UPDATE) — result discarded, lock only.
          $queryRaw: jest.fn().mockResolvedValue([]),
          sales: {
            findFirst: jest.fn().mockResolvedValue(cancelledSale),
            update: jest.fn(),
          },
          products: { update: jest.fn() },
          sale_items: { delete: jest.fn(), update: jest.fn() },
          payments: { create: jest.fn() },
          audit_logs: { create: jest.fn() },
        };
        return fn(prismaMock);
      });

      await expect(
        service.createRefund('sale-001', refundDto, 'tenant-001', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refund quantity exceeds sold quantity', async () => {
      const saleWithItem = {
        ...mockSale,
        status: 'COMPLETED',
        sale_items: [
          {
            id: 'item-001',
            quantity: 1,
            productId: 'prod-001',
            totalPrice: 500,
            products: mockProduct,
          },
        ],
        payments: [],
      };

      mockPrismaService.$transaction.mockImplementationOnce(async (fn) => {
        const prismaMock = {
          // Sale row lock (SELECT … FOR UPDATE) — result discarded, lock only.
          $queryRaw: jest.fn().mockResolvedValue([]),
          sales: {
            findFirst: jest.fn().mockResolvedValue(saleWithItem),
            update: jest.fn(),
          },
          products: { update: jest.fn() },
          sale_items: { delete: jest.fn(), update: jest.fn() },
          payments: { create: jest.fn() },
          audit_logs: { create: jest.fn() },
        };
        return fn(prismaMock);
      });

      const overRefundDto: CreateRefundDto = {
        items: [{ saleItemId: 'item-001', quantity: 5 }], // sold 1, refunding 5
        reason: 'Test',
      } as CreateRefundDto;

      await expect(
        service.createRefund(
          'sale-001',
          overRefundDto,
          'tenant-001',
          'user-001',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    describe('amounts and status', () => {
      const item = (id: string, quantity: number, totalPrice: number) => ({
        id,
        quantity,
        productId: `prod-${id}`,
        totalPrice,
        products: mockProduct,
      });

      const refund = async (
        sale: Record<string, unknown>,
        dto: Partial<CreateRefundDto>,
      ) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          sales: {
            findFirst: jest.fn().mockResolvedValue({
              ...mockSale,
              status: 'COMPLETED',
              refundedAmount: 0,
              customerId: null,
              payments: [],
              ...sale,
            }),
            update: jest.fn().mockResolvedValue(mockSale),
          },
          products: { update: jest.fn() },
          sale_items: { delete: jest.fn(), update: jest.fn() },
          customers: { update: jest.fn() },
        };
        mockPrismaService.$transaction.mockImplementationOnce((fn) => fn(tx));
        await service.createRefund(
          'sale-001',
          { items: [], reason: 'test', ...dto } as CreateRefundDto,
          'tenant-001',
          'user-001',
        );
        const { status, totalAmount, refundedAmount } =
          tx.sales.update.mock.calls[0][0].data;
        return {
          saved: { status, totalAmount, refundedAmount },
          restocked: tx.products.update.mock.calls.length,
        };
      };

      it('keeps a part-refunded sale COMPLETED at what is left', async () => {
        const { saved } = await refund(
          {
            totalAmount: 100,
            sale_items: [item('a', 1, 30), item('b', 1, 70)],
          },
          { items: [{ saleItemId: 'a', quantity: 1 }] },
        );
        expect(saved).toEqual({
          status: 'COMPLETED',
          totalAmount: 70,
          refundedAmount: 30,
        });
      });

      it('allows a second refund, which closes the sale', async () => {
        const { saved } = await refund(
          {
            totalAmount: 70,
            refundedAmount: 30,
            sale_items: [item('b', 1, 70)],
          },
          { items: [{ saleItemId: 'b', quantity: 1 }] },
        );
        expect(saved).toEqual({
          status: 'REFUNDED',
          totalAmount: 0,
          refundedAmount: 100,
        });
      });

      it('never refunds more than is left', async () => {
        // Two £100 items, £20 off the sale, one already refunded at £100
        const { saved } = await refund(
          {
            totalAmount: 80,
            refundedAmount: 100,
            sale_items: [item('b', 1, 100)],
          },
          { items: [{ saleItemId: 'b', quantity: 1 }] },
        );
        expect(saved).toEqual({
          status: 'REFUNDED',
          totalAmount: 0,
          refundedAmount: 180,
        });
      });

      it('full refund covers services and restocks every item', async () => {
        // £100 of products + £50 service
        const { saved, restocked } = await refund(
          {
            totalAmount: 150,
            sale_items: [item('a', 1, 60), item('b', 2, 40)],
          },
          { fullRefund: true },
        );
        expect(saved).toEqual({
          status: 'REFUNDED',
          totalAmount: 0,
          refundedAmount: 150,
        });
        expect(restocked).toBe(2);
      });

      it('full refund of a discounted sale returns what was paid', async () => {
        const { saved } = await refund(
          {
            totalAmount: 180,
            sale_items: [item('a', 1, 100), item('b', 1, 100)],
          },
          { fullRefund: true },
        );
        expect(saved.refundedAmount).toBe(180);
        expect(saved.totalAmount).toBe(0);
      });

      it('refunds the rest of a service sale after an earlier refund', async () => {
        const { saved } = await refund(
          { totalAmount: 50, refundedAmount: 100, sale_items: [] },
          {},
        );
        expect(saved).toEqual({
          status: 'REFUNDED',
          totalAmount: 0,
          refundedAmount: 150,
        });
      });

      it('rejects a fully refunded sale and duplicate lines', async () => {
        await expect(
          refund(
            { totalAmount: 0, refundedAmount: 100, sale_items: [] },
            { fullRefund: true },
          ),
        ).rejects.toThrow('already been fully refunded');
        await expect(
          refund(
            { totalAmount: 90, sale_items: [item('a', 3, 90)] },
            {
              items: [
                { saleItemId: 'a', quantity: 1 },
                { saleItemId: 'a', quantity: 1 },
              ],
            },
          ),
        ).rejects.toThrow('only be listed once');
      });

      it('does not leave floating-point pennies behind', async () => {
        const { saved } = await refund(
          { totalAmount: 0.3, sale_items: [item('a', 3, 0.3)] },
          { items: [{ saleItemId: 'a', quantity: 1 }] },
        );
        expect(saved.totalAmount).toBe(0.2);
      });
    });
  });
});
