import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        'default-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    try {
      const refreshToken = req.body.refreshToken;

      // Find user by ID — compare token against bcrypt hash stored in DB
      const user = await this.prismaService.users.findFirst({
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
              suspendedReason: true,
            },
          },
        },
      });

      if (
        !user ||
        !user.refreshToken ||
        !(await bcrypt.compare(refreshToken, user.refreshToken))
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tenantStatus = user.tenants.status;
      if (tenantStatus === 'SUSPENDED') {
        throw new ForbiddenException({
          code: 'TENANT_SUSPENDED',
          reason: user.tenants.suspendedReason || 'MANUAL',
          message: 'Account suspended. Please contact MCCL.',
        });
      }
      if (
        !['ACTIVE', 'PAYMENT_DUE', 'PAYMENT_WARNING'].includes(tenantStatus)
      ) {
        throw new UnauthorizedException('Tenant account is not active');
      }

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
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
