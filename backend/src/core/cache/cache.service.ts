import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.cacheManager.get<T>(key);
      if (data) {
        this.logger.debug(`Cache HIT for key: ${key}`);
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`);
      }
      return data || null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET for key: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete data from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      // Note: reset() method may not be available in all cache implementations
      const manager = this.cacheManager as Cache & { reset?: () => Promise<void> };
      if (typeof manager.reset === 'function') {
        await manager.reset();
      } else {
        this.logger.warn('Cache reset method not available, skipping reset');
      }
      this.logger.debug('Cache RESET - All keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      // Try to get from cache first
      let data = await this.get<T>(key);
      
      if (data === null) {
        // Cache miss - fetch data and cache it
        this.logger.debug(`Cache MISS - Fetching data for key: ${key}`);
        data = await factory();
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}:`, error);
      // Fallback to factory function
      return await factory();
    }
  }

  /**
   * Generate cache key for tenant-specific data
   */
  generateTenantKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  /**
   * Generate cache key for user-specific data
   */
  generateUserKey(userId: string, key: string): string {
    return `user:${userId}:${key}`;
  }

  /**
   * Get tenant-specific data from cache
   */
  async getTenantData<T>(tenantId: string, key: string): Promise<T | null> {
    const cacheKey = this.generateTenantKey(tenantId, key);
    return this.get<T>(cacheKey);
  }

  /**
   * Set tenant-specific data in cache
   */
  async setTenantData<T>(
    tenantId: string,
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = this.generateTenantKey(tenantId, key);
    await this.set(cacheKey, value, ttl);
  }

  /**
   * Delete tenant-specific data from cache
   */
  async delTenantData(tenantId: string, key: string): Promise<void> {
    const cacheKey = this.generateTenantKey(tenantId, key);
    await this.del(cacheKey);
  }

  /**
   * Get user-specific data from cache
   */
  async getUserData<T>(userId: string, key: string): Promise<T | null> {
    const cacheKey = this.generateUserKey(userId, key);
    return this.get<T>(cacheKey);
  }

  /**
   * Set user-specific data in cache
   */
  async setUserData<T>(
    userId: string,
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = this.generateUserKey(userId, key);
    await this.set(cacheKey, value, ttl);
  }

  /**
   * Delete user-specific data from cache
   */
  async delUserData(userId: string, key: string): Promise<void> {
    const cacheKey = this.generateUserKey(userId, key);
    await this.del(cacheKey);
  }

  /**
   * Cache frequently accessed data with automatic refresh
   */
  async cacheWithRefresh<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600,
    refreshThreshold: number = 0.8,
  ): Promise<T> {
    const data = await this.getOrSet(key, factory, ttl);
    
    // Asynchronously refresh cache when approaching expiry
    setTimeout(() => {
      void factory()
        .then((refreshedData) => this.set(key, refreshedData, ttl))
        .then(() => this.logger.debug(`Cache REFRESH for key: ${key}`))
        .catch((error: unknown) => this.logger.error(`Cache REFRESH error for key ${key}:`, error));
    }, ttl * refreshThreshold * 1000);
    
    return data;
  }
}