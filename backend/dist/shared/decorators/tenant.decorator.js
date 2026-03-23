"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantId = exports.CurrentTenant = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentTenant = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
});
exports.TenantId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.tenantId || 'default';
});
//# sourceMappingURL=tenant.decorator.js.map