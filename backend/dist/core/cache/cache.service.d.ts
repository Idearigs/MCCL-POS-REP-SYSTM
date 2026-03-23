import type { Cache } from 'cache-manager';
export declare class CacheService {
    private cacheManager;
    private readonly logger;
    constructor(cacheManager: Cache);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    reset(): Promise<void>;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    generateTenantKey(tenantId: string, key: string): string;
    generateUserKey(userId: string, key: string): string;
    getTenantData<T>(tenantId: string, key: string): Promise<T | null>;
    setTenantData<T>(tenantId: string, key: string, value: T, ttl?: number): Promise<void>;
    delTenantData(tenantId: string, key: string): Promise<void>;
    getUserData<T>(userId: string, key: string): Promise<T | null>;
    setUserData<T>(userId: string, key: string, value: T, ttl?: number): Promise<void>;
    delUserData(userId: string, key: string): Promise<void>;
    cacheWithRefresh<T>(key: string, factory: () => Promise<T>, ttl?: number, refreshThreshold?: number): Promise<T>;
}
