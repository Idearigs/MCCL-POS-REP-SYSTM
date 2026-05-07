import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

// Statuses that are still allowed to make API calls (just with warnings)
const FUNCTIONAL_STATUSES = ['ACTIVE', 'PAYMENT_DUE', 'PAYMENT_WARNING'];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    let user;
    try {
      user = await this.prismaService.users.findUnique({
        where: {
          id: payload.sub,
          isActive: true,
        },
        include: {
          tenants: {
            select: {
              id: true,
              name: true,
              domain: true,
              subdomain: true,
              status: true,
              subscriptionPlan: true,
              suspendedAt: true,
              suspendedReason: true,
              billingDueDate: true,
            },
          },
        },
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tenantStatus = user.tenants.status;

    // Suspended or inactive → throw 403 with machine-readable code
    if (tenantStatus === 'SUSPENDED') {
      throw new ForbiddenException({
        code: 'TENANT_SUSPENDED',
        reason: user.tenants.suspendedReason || 'MANUAL',
        message:
          user.tenants.suspendedReason === 'PAYMENT_OVERDUE'
            ? 'Account suspended due to overdue payment. Please contact MCCL to restore access.'
            : 'Account has been deactivated. Please contact MCCL for more information.',
      });
    }

    if (tenantStatus === 'INACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // PAYMENT_DUE and PAYMENT_WARNING are allowed through — frontend shows warnings
    if (!FUNCTIONAL_STATUSES.includes(tenantStatus)) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    await this.prismaService.users.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions,
      tenant: user.tenants,
    };
  }
}
