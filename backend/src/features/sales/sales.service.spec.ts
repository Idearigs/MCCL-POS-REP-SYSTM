import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: mockSalesRepository },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ShiftsService, useValue: mockShiftsService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
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
});
