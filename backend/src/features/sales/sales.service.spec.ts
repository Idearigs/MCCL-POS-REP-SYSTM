import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { CreateSaleDto, CreateRefundDto } from './dto/sale.dto';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { ShiftsService } from '../shifts/shifts.service';

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
  });
});
