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
exports.BugReportsController = void 0;
const common_1 = require("@nestjs/common");
const bug_reports_service_1 = require("../services/bug-reports.service");
let BugReportsController = class BugReportsController {
    bugReportsService;
    constructor(bugReportsService) {
        this.bugReportsService = bugReportsService;
    }
    async create(data) {
        return this.bugReportsService.create(data);
    }
    async findAll(page, limit, status, priority, featureKey, customerProfileId) {
        return this.bugReportsService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            status,
            priority,
            featureKey,
            customerProfileId,
        });
    }
    async getStats() {
        return this.bugReportsService.getStats();
    }
    async findOne(id) {
        return this.bugReportsService.findOne(id);
    }
    async update(id, data) {
        return this.bugReportsService.update(id, data);
    }
};
exports.BugReportsController = BugReportsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BugReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('priority')),
    __param(4, (0, common_1.Query)('featureKey')),
    __param(5, (0, common_1.Query)('customerProfileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], BugReportsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BugReportsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BugReportsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BugReportsController.prototype, "update", null);
exports.BugReportsController = BugReportsController = __decorate([
    (0, common_1.Controller)('mainframe/bug-reports'),
    __metadata("design:paramtypes", [bug_reports_service_1.BugReportsService])
], BugReportsController);
//# sourceMappingURL=bug-reports.controller.js.map