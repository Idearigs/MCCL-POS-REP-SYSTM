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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
let BackupController = class BackupController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    checkKey(key) {
        const expected = process.env.INTERNAL_API_KEY;
        if (!expected || key !== expected)
            throw new common_1.UnauthorizedException('Invalid internal key');
    }
    async exportTenant(tenantId, key, res) {
        this.checkKey(key);
        const [tenant, users, customers, products, sales, saleItems, repairs, repairPhotos,] = await Promise.all([
            this.prisma.tenants.findUnique({ where: { id: tenantId } }),
            this.prisma.users.findMany({ where: { tenantId }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } }),
            this.prisma.customers.findMany({ where: { tenantId } }),
            this.prisma.products.findMany({ where: { tenantId } }),
            this.prisma.sales.findMany({ where: { tenantId } }),
            this.prisma.sale_items.findMany({ where: { sales: { tenantId } } }),
            this.prisma.repairs.findMany({ where: { tenantId } }),
            this.prisma.repair_photos.findMany({ where: { repairs: { tenantId } } }),
        ]);
        const payload = {
            exportedAt: new Date().toISOString(),
            tenantId,
            tenant,
            users,
            customers,
            products,
            sales,
            saleItems,
            repairs,
            repairPhotos,
        };
        const subdomain = tenant?.subdomain || tenantId.slice(0, 8);
        const filename = `${subdomain}-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(payload);
    }
    async listTenants(key) {
        this.checkKey(key);
        return this.prisma.tenants.findMany({
            select: { id: true, subdomain: true, name: true },
            orderBy: { name: 'asc' },
        });
    }
};
exports.BackupController = BackupController;
__decorate([
    (0, common_1.Get)('tenant/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Headers)('x-internal-key')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "exportTenant", null);
__decorate([
    (0, common_1.Get)('tenants'),
    __param(0, (0, common_1.Headers)('x-internal-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "listTenants", null);
exports.BackupController = BackupController = __decorate([
    (0, common_1.Controller)('internal/backup'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BackupController);
//# sourceMappingURL=backup.controller.js.map