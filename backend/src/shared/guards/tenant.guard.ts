import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // For now, just set a default tenant
    // In production, this would extract tenant from headers/JWT/subdomain
    request.tenant = {
      tenantId: 'default',
      tenantName: 'Default Tenant'
    };
    
    return true;
  }
}