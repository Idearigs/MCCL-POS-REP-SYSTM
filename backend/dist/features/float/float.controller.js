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
exports.FloatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const float_service_1 = require("./float.service");
const float_dto_1 = require("./dto/float.dto");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
let FloatController = class FloatController {
    floatService;
    constructor(floatService) {
        this.floatService = floatService;
    }
    async openFloatSession(req, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.floatService.openFloatSession(tenantId, userId, dto);
    }
    async closeFloatSession(req, sessionId, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.floatService.closeFloatSession(tenantId, userId, sessionId, dto);
    }
    async getCurrentFloatSession(req) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.floatService.getCurrentFloatSession(tenantId, userId);
    }
    async getFloatSessions(req, dto) {
        const tenantId = req.user.tenantId;
        return this.floatService.getFloatSessions(tenantId, dto);
    }
    async getFloatSessionById(req, sessionId) {
        const tenantId = req.user.tenantId;
        return this.floatService.getFloatSessionById(tenantId, sessionId);
    }
    async createFloatTransaction(req, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.floatService.createFloatTransaction(tenantId, userId, dto);
    }
};
exports.FloatController = FloatController;
__decorate([
    (0, common_1.Post)('open'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Open a new float session' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Float session opened successfully',
        type: float_dto_1.FloatSessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'User already has an open float session',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, float_dto_1.OpenFloatSessionDto]),
    __metadata("design:returntype", Promise)
], FloatController.prototype, "openFloatSession", null);
__decorate([
    (0, common_1.Post)(':sessionId/close'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Close a float session' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Float session closed successfully',
        type: float_dto_1.FloatSessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Float session not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Float session is already closed',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, float_dto_1.CloseFloatSessionDto]),
    __metadata("design:returntype", Promise)
], FloatController.prototype, "closeFloatSession", null);
__decorate([
    (0, common_1.Get)('current'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get current open float session for logged-in user',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Current float session retrieved',
        type: float_dto_1.FloatSessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'No open float session',
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FloatController.prototype, "getCurrentFloatSession", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get float sessions with filters' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Float sessions retrieved successfully',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, float_dto_1.GetFloatSessionsDto]),
    __metadata("design:returntype", Promise)
], FloatController.prototype, "getFloatSessions", null);
__decorate([
    (0, common_1.Get)(':sessionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get float session by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Float session retrieved successfully',
        type: float_dto_1.FloatSessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Float session not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FloatController.prototype, "getFloatSessionById", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a float transaction (cash in/out)' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Float transaction created successfully',
        type: float_dto_1.FloatTransactionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Float session not found or is closed',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, float_dto_1.CreateFloatTransactionDto]),
    __metadata("design:returntype", Promise)
], FloatController.prototype, "createFloatTransaction", null);
exports.FloatController = FloatController = __decorate([
    (0, swagger_1.ApiTags)('Float Management'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('float'),
    __metadata("design:paramtypes", [float_service_1.FloatService])
], FloatController);
//# sourceMappingURL=float.controller.js.map