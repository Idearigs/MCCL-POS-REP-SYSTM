import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantInfo {
  id: string;
  tenantId: string;
  tenantName: string;
}

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantInfo => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.tenantId || 'default';
  },
);