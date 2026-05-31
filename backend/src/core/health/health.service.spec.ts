import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRaw: jest.Mock };
  let cache: { set: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    cache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('1'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('reports "ok" when database and cache are both up', async () => {
    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.checks.database.status).toBe('up');
    expect(result.checks.redis.status).toBe('up');
    expect(typeof result.uptimeSeconds).toBe('number');
  });

  it('reports "degraded" when the database query throws', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.database.status).toBe('down');
    expect(result.checks.database.error).toBe('connection refused');
    // cache still healthy, but overall status must be degraded
    expect(result.checks.redis.status).toBe('up');
  });

  it('reports "degraded" when the cache round-trip mismatches', async () => {
    cache.get.mockResolvedValueOnce('not-the-value');

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.redis.status).toBe('down');
    expect(result.checks.database.status).toBe('up');
  });
});
