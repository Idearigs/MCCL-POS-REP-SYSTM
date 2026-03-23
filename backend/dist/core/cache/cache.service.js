"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
let CacheService = CacheService_1 = class CacheService {
    cacheManager;
    logger = new common_1.Logger(CacheService_1.name);
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
    }
    async get(key) {
        try {
            const data = await this.cacheManager.get(key);
            if (data) {
                this.logger.debug(`Cache HIT for key: ${key}`);
            }
            else {
                this.logger.debug(`Cache MISS for key: ${key}`);
            }
            return data || null;
        }
        catch (error) {
            this.logger.error(`Cache GET error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            await this.cacheManager.set(key, value, ttl);
            this.logger.debug(`Cache SET for key: ${key}, TTL: ${ttl || 'default'}`);
        }
        catch (error) {
            this.logger.error(`Cache SET error for key ${key}:`, error);
        }
    }
    async del(key) {
        try {
            await this.cacheManager.del(key);
            this.logger.debug(`Cache DEL for key: ${key}`);
        }
        catch (error) {
            this.logger.error(`Cache DEL error for key ${key}:`, error);
        }
    }
    async reset() {
        try {
            const manager = this.cacheManager;
            if (typeof manager.reset === 'function') {
                await manager.reset();
            }
            else {
                this.logger.warn('Cache reset method not available, skipping reset');
            }
            this.logger.debug('Cache RESET - All keys cleared');
        }
        catch (error) {
            this.logger.error('Cache RESET error:', error);
        }
    }
    async getOrSet(key, factory, ttl) {
        try {
            let data = await this.get(key);
            if (data === null) {
                this.logger.debug(`Cache MISS - Fetching data for key: ${key}`);
                data = await factory();
                await this.set(key, data, ttl);
            }
            return data;
        }
        catch (error) {
            this.logger.error(`Cache getOrSet error for key ${key}:`, error);
            return await factory();
        }
    }
    generateTenantKey(tenantId, key) {
        return `tenant:${tenantId}:${key}`;
    }
    generateUserKey(userId, key) {
        return `user:${userId}:${key}`;
    }
    async getTenantData(tenantId, key) {
        const cacheKey = this.generateTenantKey(tenantId, key);
        return this.get(cacheKey);
    }
    async setTenantData(tenantId, key, value, ttl) {
        const cacheKey = this.generateTenantKey(tenantId, key);
        await this.set(cacheKey, value, ttl);
    }
    async delTenantData(tenantId, key) {
        const cacheKey = this.generateTenantKey(tenantId, key);
        await this.del(cacheKey);
    }
    async getUserData(userId, key) {
        const cacheKey = this.generateUserKey(userId, key);
        return this.get(cacheKey);
    }
    async setUserData(userId, key, value, ttl) {
        const cacheKey = this.generateUserKey(userId, key);
        await this.set(cacheKey, value, ttl);
    }
    async delUserData(userId, key) {
        const cacheKey = this.generateUserKey(userId, key);
        await this.del(cacheKey);
    }
    async cacheWithRefresh(key, factory, ttl = 3600, refreshThreshold = 0.8) {
        const data = await this.getOrSet(key, factory, ttl);
        setTimeout(() => {
            void factory()
                .then((refreshedData) => this.set(key, refreshedData, ttl))
                .then(() => this.logger.debug(`Cache REFRESH for key: ${key}`))
                .catch((error) => this.logger.error(`Cache REFRESH error for key ${key}:`, error));
        }, ttl * refreshThreshold * 1000);
        return data;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object])
], CacheService);
//# sourceMappingURL=cache.service.js.map