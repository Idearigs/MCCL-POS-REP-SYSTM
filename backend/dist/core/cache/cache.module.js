"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheServiceModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const redisStore = require('cache-manager-redis-store');
const cache_service_1 = require("./cache.service");
let CacheServiceModule = class CacheServiceModule {
};
exports.CacheServiceModule = CacheServiceModule;
exports.CacheServiceModule = CacheServiceModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            cache_manager_1.CacheModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const isRedisEnabled = configService.get('REDIS_HOST') && configService.get('REDIS_PORT');
                    if (isRedisEnabled) {
                        return {
                            store: redisStore,
                            host: configService.get('REDIS_HOST', 'localhost'),
                            port: configService.get('REDIS_PORT', 6379),
                            password: configService.get('REDIS_PASSWORD'),
                            ttl: 60 * 60,
                            max: 1000,
                            retryDelayOnFailover: 100,
                            enableReadyCheck: false,
                            maxRetriesPerRequest: 3,
                        };
                    }
                    else {
                        console.warn('⚠️  Redis not configured, using in-memory cache');
                        return {
                            ttl: 60 * 60,
                            max: 1000,
                        };
                    }
                },
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [cache_service_1.CacheService],
        exports: [cache_service_1.CacheService, cache_manager_1.CacheModule],
    })
], CacheServiceModule);
//# sourceMappingURL=cache.module.js.map