import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    try {
      // Find user in database
      const user = await this.prismaService.user.findUnique({
        where: { 
          id: payload.sub,
          isActive: true,
        },
        include: {
          tenant: {
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
        throw new UnauthorizedException('User not found or inactive');
      }

      if (user.tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tenant account is not active');
      }

      // Update last login
      await this.prismaService.user.update({
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
        tenant: user.tenant,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}