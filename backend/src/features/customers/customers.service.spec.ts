import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import type {
  CustomerQueryDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────
const mockCustomer = {
  id: 'cust-001',
  tenantId: 'tenant-001',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@example.com',
  phone: '+44 7700 900001',
  dateOfBirth: null,
  address: '10 High Street',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'UK',
  totalSpent: 500,
  visitCount: 3,
  loyaltyPoints: 50,
  isActive: true,
  gdprConsent: true,
  marketingEmail: false,
  marketingSms: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockPrismaService = {
  customers: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
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

// ──────────────────────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────────────────────
describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // findAll()
  // ────────────────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return a paginated list of customers', async () => {
      mockPrismaService.customers.findMany.mockResolvedValue([mockCustomer]);
      mockPrismaService.customers.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10 } as CustomerQueryDto,
        'tenant-001',
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should scope results to the tenantId', async () => {
      mockPrismaService.customers.findMany.mockResolvedValue([]);
      mockPrismaService.customers.count.mockResolvedValue(0);

      await service.findAll({} as CustomerQueryDto, 'tenant-xyz');

      const findManyCall =
        mockPrismaService.customers.findMany.mock.calls[0][0];
      expect(findManyCall.where.tenantId).toBe('tenant-xyz');
    });

    it('should apply search filter when provided', async () => {
      mockPrismaService.customers.findMany.mockResolvedValue([]);
      mockPrismaService.customers.count.mockResolvedValue(0);

      await service.findAll(
        { search: 'jane' } as CustomerQueryDto,
        'tenant-001',
      );

      const findManyCall =
        mockPrismaService.customers.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // findOne()
  // ────────────────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return a customer by ID', async () => {
      mockPrismaService.customers.findFirst.mockResolvedValue(mockCustomer);

      const result = await service.findOne('cust-001', 'tenant-001');

      expect(result).toHaveProperty('id', 'cust-001');
      expect(result).toHaveProperty('firstName', 'Jane');
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      mockPrismaService.customers.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // create()
  // ────────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob.jones@example.com',
      phone: '+44 7700 900002',
      dataProcessingConsent: true,
    };

    it('should create and return a new customer', async () => {
      mockPrismaService.customers.create.mockResolvedValue({
        ...mockCustomer,
        id: 'cust-new',
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob.jones@example.com',
      });

      const result = await service.create(
        createDto as CreateCustomerDto,
        'tenant-001',
        'user-001',
      );

      expect(result).toHaveProperty('firstName', 'Bob');
      expect(mockPrismaService.customers.create).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // update()
  // ────────────────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the customer', async () => {
      mockPrismaService.customers.findFirst
        .mockResolvedValueOnce(mockCustomer) // existing customer
        .mockResolvedValueOnce(null); // no phone conflict
      mockPrismaService.customers.update.mockResolvedValue({
        ...mockCustomer,
        phone: '+44 7700 999999',
      });

      const result = await service.update(
        'cust-001',
        { phone: '+44 7700 999999' } as UpdateCustomerDto,
        'tenant-001',
        'user-001',
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.customers.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      mockPrismaService.customers.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          'nonexistent',
          {} as UpdateCustomerDto,
          'tenant-001',
          'user-001',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
