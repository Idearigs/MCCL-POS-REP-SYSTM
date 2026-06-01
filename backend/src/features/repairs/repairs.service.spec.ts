import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RepairsService } from './repairs.service';
import { RepairsRepository } from './repairs.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { FileStorageService } from '../../integrations/file-storage/file-storage.service';
import { SmsService } from '../../integrations/sms/sms.service';
import { RepairStatus, RepairPriority, RepairType } from './dto/repair.dto';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────────────────────

const mockRepair = {
  id: 'repair-001',
  repairNumber: 'REP-202603-0001',
  tenantId: 'tenant-001',
  customerId: 'customer-001',
  createdBy: 'user-001',
  status: 'RECEIVED',
  priority: 'NORMAL',
  itemDescription: 'Gold ring',
  issueDescription: 'Stone missing',
  estimatedCost: 120,
  finalCost: null,
  depositAmount: 0,
  insuranceValue: 0,
  estimatedDueDate: null,
  completedDate: null,
  collectedDate: null,
  customerNotes: '',
  internalNotes: '',
  isInsuranceClaim: false,
  insuranceNumber: null,
  tagId: null,
  rmaId: null,
  createdAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-01'),
  customers: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+44 7700 900000',
    email: 'john.doe@example.com',
  },
  users: {
    firstName: 'Admin',
    lastName: 'User',
  },
  repair_status_history: [],
  repair_photos: [],
};

const mockCustomer = {
  id: 'customer-001',
  tenantId: 'tenant-001',
  firstName: 'John',
  lastName: 'Doe',
};

const mockRepairsRepository = {
  create: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createStatusHistory: jest.fn(),
  deleteManyStatusHistory: jest.fn(),
  findFirstPhoto: jest.fn(),
  findManyPhotos: jest.fn(),
  createPhoto: jest.fn(),
  deletePhoto: jest.fn(),
  deleteManyPhotos: jest.fn(),
  $transaction: jest.fn(),
};

// PrismaService is needed for the cross-domain customers.findFirst call in
// create(), and for the $transaction + FOR UPDATE path in changeStatus/cancel.
const mockPrismaService = {
  customers: {
    findFirst: jest.fn(),
  },
  repairs: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  repair_status_history: {
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
  // Run the callback with this same mock as the transaction client.
  $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
    cb(mockPrismaService),
  ),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockFileStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
};

const mockSmsService = {
  sendRepairStatusSMS: jest.fn(),
};

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('RepairsService', () => {
  let service: RepairsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RepairsService(
      mockRepairsRepository as unknown as RepairsRepository,
      mockPrismaService as unknown as PrismaService,
      mockCacheService as unknown as CacheService,
      mockFileStorageService as unknown as FileStorageService,
      mockSmsService as unknown as SmsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // create()
  // ────────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      customerId: 'customer-001',
      problemDescription: 'Stone missing',
      priority: RepairPriority.NORMAL,
      items: [
        {
          itemDescription: 'Gold ring',
          repairType: RepairType.STONE_SETTING,
          repairDescription: 'Set a new diamond',
          estimatedCost: 120,
        },
      ],
    };

    it('should create a repair and return the response DTO', async () => {
      mockPrismaService.customers.findFirst.mockResolvedValue(mockCustomer);
      mockRepairsRepository.findFirst.mockResolvedValue(null); // no existing repair number
      mockRepairsRepository.create.mockResolvedValue(mockRepair);

      const result = await service.create(
        createDto as any,
        'tenant-001',
        'user-001',
      );

      expect(mockPrismaService.customers.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-001', tenantId: 'tenant-001' },
      });
      expect(mockRepairsRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'repair-001');
      expect(result).toHaveProperty('customerName', 'John Doe');
      expect(result).toHaveProperty('status', 'RECEIVED');
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      mockPrismaService.customers.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto as any, 'tenant-001', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should combine item descriptions and costs from items array', async () => {
      const multiItemDto = {
        ...createDto,
        items: [
          {
            itemDescription: 'Ring',
            repairType: RepairType.SIZING,
            repairDescription: 'Resize',
            estimatedCost: 50,
          },
          {
            itemDescription: 'Chain',
            repairType: RepairType.CHAIN_REPAIR,
            repairDescription: 'Fix link',
            estimatedCost: 30,
          },
        ],
      };

      mockPrismaService.customers.findFirst.mockResolvedValue(mockCustomer);
      mockRepairsRepository.findFirst.mockResolvedValue(null);
      mockRepairsRepository.create.mockResolvedValue({
        ...mockRepair,
        itemDescription: 'Ring, Chain',
        estimatedCost: 80,
      });

      await service.create(multiItemDto as any, 'tenant-001', 'user-001');

      const createCall = mockRepairsRepository.create.mock.calls[0][0];
      expect(createCall.data.estimatedCost).toBe(80); // 50 + 30
    });

    it('should replay the cached result for a repeated Idempotency-Key', async () => {
      const cachedResult = { id: 'repair-001', status: 'RECEIVED' };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.create(
        createDto as any,
        'tenant-001',
        'user-001',
        'idem-key-1',
      );

      expect(result).toBe(cachedResult);
      // No DB work on a replay.
      expect(mockRepairsRepository.create).not.toHaveBeenCalled();
      expect(mockPrismaService.customers.findFirst).not.toHaveBeenCalled();
    });

    it('should retry repair-number generation on a unique-constraint collision', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      mockPrismaService.customers.findFirst.mockResolvedValue(mockCustomer);
      mockRepairsRepository.findFirst.mockResolvedValue(null);

      const p2002 = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });
      mockRepairsRepository.create
        .mockRejectedValueOnce(p2002)
        .mockResolvedValueOnce(mockRepair);

      const result = await service.create(
        createDto as any,
        'tenant-001',
        'user-001',
        'idem-key-2',
      );

      expect(mockRepairsRepository.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('id', 'repair-001');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // changeStatus()
  // ────────────────────────────────────────────────────────────────────────────

  describe('changeStatus()', () => {
    beforeEach(() => {
      mockPrismaService.$transaction.mockImplementation(
        (cb: (tx: unknown) => unknown) => cb(mockPrismaService),
      );
    });

    it('should update status + history atomically with a FOR UPDATE lock', async () => {
      mockPrismaService.repairs.findFirst.mockResolvedValue({
        ...mockRepair,
        status: 'RECEIVED',
      });
      mockPrismaService.repairs.update.mockResolvedValue({
        ...mockRepair,
        status: 'IN_PROGRESS',
      });
      mockPrismaService.repair_status_history.create.mockResolvedValue({});

      const result = await service.changeStatus(
        'repair-001',
        'IN_PROGRESS' as any,
        'Started work',
        'tenant-001',
        'user-001',
        false, // no SMS
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled(); // row lock
      expect(mockPrismaService.repairs.update).toHaveBeenCalled();
      expect(mockPrismaService.repair_status_history.create).toHaveBeenCalled();
      expect(result).toHaveProperty('status', 'IN_PROGRESS');
    });

    it('should throw NotFoundException for an unknown repair', async () => {
      mockPrismaService.repairs.findFirst.mockResolvedValue(null);

      await expect(
        service.changeStatus(
          'missing',
          'IN_PROGRESS' as any,
          '',
          'tenant-001',
          'user-001',
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should replay a cached result for a repeated Idempotency-Key', async () => {
      const cached = { id: 'repair-001', status: 'IN_PROGRESS' };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.changeStatus(
        'repair-001',
        'IN_PROGRESS' as any,
        '',
        'tenant-001',
        'user-001',
        false,
        'idem-status-1',
      );

      expect(result).toBe(cached);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // findAll()
  // ────────────────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated repairs', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([mockRepair]);
      mockRepairsRepository.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10 } as any,
        'tenant-001',
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([]);
      mockRepairsRepository.count.mockResolvedValue(0);

      await service.findAll(
        { status: RepairStatus.IN_PROGRESS } as any,
        'tenant-001',
      );

      const findManyCall = mockRepairsRepository.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe('IN_PROGRESS');
    });

    it('should apply search across repair number, item description, and issue description', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([]);
      mockRepairsRepository.count.mockResolvedValue(0);

      await service.findAll({ search: 'gold' } as any, 'tenant-001');

      const findManyCall = mockRepairsRepository.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ repairNumber: expect.any(Object) }),
          expect.objectContaining({ itemDescription: expect.any(Object) }),
          expect.objectContaining({ issueDescription: expect.any(Object) }),
        ]),
      );
    });

    it('should default page to 1 and limit to 20', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([]);
      mockRepairsRepository.count.mockResolvedValue(0);

      await service.findAll({} as any, 'tenant-001');

      const findManyCall = mockRepairsRepository.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(0);
      expect(findManyCall.take).toBe(20);
    });

    it('should cap limit at 1000', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([]);
      mockRepairsRepository.count.mockResolvedValue(0);

      await service.findAll({ limit: 9999 } as any, 'tenant-001');

      const findManyCall = mockRepairsRepository.findMany.mock.calls[0][0];
      expect(findManyCall.take).toBe(1000);
    });

    it('should always scope by tenantId', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([]);
      mockRepairsRepository.count.mockResolvedValue(0);

      await service.findAll({} as any, 'tenant-abc');

      const findManyCall = mockRepairsRepository.findMany.mock.calls[0][0];
      expect(findManyCall.where.tenantId).toBe('tenant-abc');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // findOne()
  // ────────────────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return a repair by ID', async () => {
      mockRepairsRepository.findFirst.mockResolvedValue(mockRepair);

      const result = await service.findOne('repair-001', 'tenant-001');

      expect(result).toHaveProperty('id', 'repair-001');
      expect(result).toHaveProperty('customerName', 'John Doe');
    });

    it('should throw NotFoundException when repair not found', async () => {
      mockRepairsRepository.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include status history and photos in the response', async () => {
      const repairWithHistory = {
        ...mockRepair,
        repair_status_history: [
          {
            id: 'hist-001',
            notes: 'Received item',
            changedBy: 'user-001',
            changedAt: new Date(),
          },
        ],
      };
      mockRepairsRepository.findFirst.mockResolvedValue(repairWithHistory);

      const result = await service.findOne('repair-001', 'tenant-001');

      expect(result.notes).toHaveLength(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // update()
  // ────────────────────────────────────────────────────────────────────────────

  describe('update()', () => {
    // update() now runs the read + update + status-history write inside a
    // $transaction with a FOR UPDATE lock, so it goes through prismaService.
    beforeEach(() => {
      mockPrismaService.$transaction.mockImplementation(
        (cb: (tx: unknown) => unknown) => cb(mockPrismaService),
      );
    });

    it('should update a repair successfully', async () => {
      mockPrismaService.repairs.findFirst.mockResolvedValue(mockRepair);
      mockPrismaService.repairs.update.mockResolvedValue({
        ...mockRepair,
        priority: 'HIGH',
      });

      const result = await service.update(
        'repair-001',
        { priority: RepairPriority.HIGH } as any,
        'tenant-001',
        'user-001',
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled(); // row lock
      expect(mockPrismaService.repairs.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when updating a non-existent repair', async () => {
      mockPrismaService.repairs.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', {} as any, 'tenant-001', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should record status history (atomically) when status changes', async () => {
      mockPrismaService.repairs.findFirst.mockResolvedValue(mockRepair);
      mockPrismaService.repairs.update.mockResolvedValue({
        ...mockRepair,
        status: 'IN_PROGRESS',
      });
      mockPrismaService.repair_status_history.create.mockResolvedValue({});

      await service.update(
        'repair-001',
        { status: RepairStatus.IN_PROGRESS } as any,
        'tenant-001',
        'user-001',
      );

      expect(
        mockPrismaService.repair_status_history.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            repairId: 'repair-001',
            oldStatus: 'RECEIVED',
            newStatus: 'IN_PROGRESS',
          }),
        }),
      );
    });

    it('should NOT create status history when status is unchanged', async () => {
      mockPrismaService.repairs.findFirst.mockResolvedValue(mockRepair);
      mockPrismaService.repairs.update.mockResolvedValue(mockRepair);

      await service.update(
        'repair-001',
        { internalNotes: 'Updated notes' } as any,
        'tenant-001',
        'user-001',
      );

      expect(
        mockPrismaService.repair_status_history.create,
      ).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // delete()
  // ────────────────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete a repair and return success', async () => {
      mockRepairsRepository.findFirst.mockResolvedValue({
        ...mockRepair,
        repair_photos: [],
        repair_status_history: [],
      });
      mockRepairsRepository.deleteManyPhotos.mockResolvedValue({ count: 0 });
      mockRepairsRepository.deleteManyStatusHistory.mockResolvedValue({
        count: 0,
      });
      mockRepairsRepository.delete.mockResolvedValue(mockRepair);

      const result = await service.delete(
        'repair-001',
        'tenant-001',
        'user-001',
      );

      expect(result).toEqual({ success: true, message: expect.any(String) });
      expect(mockRepairsRepository.delete).toHaveBeenCalledWith({
        where: { id: 'repair-001' },
      });
    });

    it('should throw NotFoundException when deleting a non-existent repair', async () => {
      mockRepairsRepository.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent', 'tenant-001', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // getStats()
  // ────────────────────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return repair statistics', async () => {
      mockRepairsRepository.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(20) // active
        .mockResolvedValueOnce(25) // completed
        .mockResolvedValueOnce(5); // overdue

      mockRepairsRepository.findMany.mockResolvedValue([
        { status: 'COMPLETED', finalCost: 100, createdAt: new Date() },
        { status: 'COLLECTED', finalCost: 200, createdAt: new Date() },
      ]);

      const result = await service.getStats('tenant-001');

      expect(result.totalRepairs).toBe(50);
      expect(result.activeRepairs).toBe(20);
      expect(result.completedRepairs).toBe(25);
      expect(result.overdueRepairs).toBe(5);
      expect(result.totalRevenue).toBe(300);
    });

    it('should return zero revenue when no repairs have final cost', async () => {
      mockRepairsRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockRepairsRepository.findMany.mockResolvedValue([]);

      const result = await service.getStats('tenant-001');

      expect(result.totalRevenue).toBe(0);
      expect(result.averageRepairCost).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // getOverdueRepairs()
  // ────────────────────────────────────────────────────────────────────────────

  describe('getOverdueRepairs()', () => {
    it('should return overdue repairs', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([mockRepair]);

      const result = await service.getOverdueRepairs('tenant-001');

      expect(result).toHaveLength(1);
      const findManyCall = mockRepairsRepository.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toEqual({
        notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'],
      });
      expect(findManyCall.where.estimatedDueDate).toEqual({
        lt: expect.any(Date),
      });
    });

    it('should return empty array when no overdue repairs', async () => {
      mockRepairsRepository.findMany.mockResolvedValue([]);

      const result = await service.getOverdueRepairs('tenant-001');

      expect(result).toHaveLength(0);
    });
  });
});
