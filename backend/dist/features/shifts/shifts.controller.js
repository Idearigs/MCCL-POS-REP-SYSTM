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
exports.ShiftsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const shifts_service_1 = require("./shifts.service");
const shift_dto_1 = require("./dto/shift.dto");
const client_1 = require("@prisma/client");
let ShiftsController = class ShiftsController {
    shiftsService;
    constructor(shiftsService) {
        this.shiftsService = shiftsService;
    }
    async startShift(req, body) {
        return this.shiftsService.startShift({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            openingFloat: body.openingFloat,
            deviceInfo: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
            openingNotes: body.openingNotes,
        });
    }
    async getActiveShift(req) {
        return this.shiftsService.getActiveShift(req.user.id, req.user.tenantId);
    }
    async closeShift(req, shiftId, body) {
        return this.shiftsService.closeShift(shiftId, req.user.id, body);
    }
    async getShifts(req, startDate, endDate, userId, status) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid date format provided');
        }
        if (start > end) {
            throw new common_1.BadRequestException('Start date must be before or equal to end date');
        }
        return this.shiftsService.getShiftsByDateRange(req.user.tenantId, start, end, userId, status);
    }
    async getShiftReport(shiftId) {
        return this.shiftsService.getShiftReport(shiftId);
    }
    async getShiftStatistics(req, startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid date format provided');
        }
        if (start > end) {
            throw new common_1.BadRequestException('Start date must be before or equal to end date');
        }
        return this.shiftsService.getShiftStatistics(req.user.tenantId, start, end);
    }
    async getUsersByDateRange(req, startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid date format provided');
        }
        if (start > end) {
            throw new common_1.BadRequestException('Start date must be before or equal to end date');
        }
        return this.shiftsService.getUsersByDateRange(req.user.tenantId, start, end);
    }
    async getTillsByDateRange(req, startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid date format provided');
        }
        if (start > end) {
            throw new common_1.BadRequestException('Start date must be before or equal to end date');
        }
        return this.shiftsService.getTillsByDateRange(req.user.tenantId, start, end);
    }
};
exports.ShiftsController = ShiftsController;
__decorate([
    (0, common_1.Post)('start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shift_dto_1.StartShiftDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "startShift", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getActiveShift", null);
__decorate([
    (0, common_1.Patch)(':id/close'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, shift_dto_1.CloseShiftDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "closeShift", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('userId')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getShifts", null);
__decorate([
    (0, common_1.Get)(':id/report'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getShiftReport", null);
__decorate([
    (0, common_1.Get)('statistics'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getShiftStatistics", null);
__decorate([
    (0, common_1.Get)('users-by-date'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getUsersByDateRange", null);
__decorate([
    (0, common_1.Get)('tills-by-date'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getTillsByDateRange", null);
exports.ShiftsController = ShiftsController = __decorate([
    (0, common_1.Controller)('shifts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [shifts_service_1.ShiftsService])
], ShiftsController);
//# sourceMappingURL=shifts.controller.js.map