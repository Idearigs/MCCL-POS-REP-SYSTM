import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type UserRole } from '../decorators/roles.decorator';

/**
 * Role-based access control guard.
 *
 * Reads required roles from the @Roles() decorator and compares against
 * req.user.role (set by JwtStrategy after token validation).
 *
 * Usage: apply AFTER JwtAuthGuard so req.user is already populated.
 *
 *   @Roles('OWNER')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * If no @Roles() decorator is present the guard allows the request through
 * (opt-in, not opt-out), keeping existing unguarded routes unchanged.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException('Access denied: role information missing');
    }

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `Access denied: requires one of [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
