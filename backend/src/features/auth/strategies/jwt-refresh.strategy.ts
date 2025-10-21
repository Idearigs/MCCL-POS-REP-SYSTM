import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    try {
      const refreshToken = req.body.refreshToken;
      
      // Find user with matching refresh token
      const user = await this.prismaService.users.findFirst({
        where: {
          id: payload.sub,
          refreshToken: refreshToken,
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
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (user.tenants.status !== 'ACTIVE') {
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