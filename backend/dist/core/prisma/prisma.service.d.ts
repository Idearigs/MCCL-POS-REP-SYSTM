import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    isHealthy(): Promise<boolean>;
    getStats(): Promise<unknown>;
    enableShutdownHooks(app: INestApplication): void;
}
