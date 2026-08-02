import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { generateId } from '../../../shared/utils/id-generator';
import { AuthCoreService } from './auth-core.service';
import { AuthResponseDto } from '../dto/auth.dto';

/**
 * Server-side "trusted device" PIN quick sign-in.
 *
 * Unlike a client-only scheme, the PIN is stored *only* as a bcrypt hash in the
 * tenant DB — never on the device — so a stolen/inspected device exposes no
 * offline-crackable secret. Brute-force is stopped by a server-side attempt
 * counter + timed lockout, and a device can be revoked remotely. The device
 * keeps only an opaque, non-secret `deviceId` that names which hash row to check.
 */
@Injectable()
export class DevicePinService {
  private readonly logger = new Logger(DevicePinService.name);
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_MINUTES = 15;

  constructor(
    private prisma: PrismaService,
    private authCore: AuthCoreService,
    private configService: ConfigService,
  ) {}

  /** Register (or re-set) a PIN for a device. Caller must be authenticated. */
  async setupPin(
    tenantId: string,
    userId: string,
    deviceId: string,
    pin: string,
    label?: string,
  ): Promise<{ success: true; deviceId: string }> {
    const saltRounds = parseInt(
      this.configService.get('HASH_SALT_ROUNDS', '12'),
      10,
    );
    const pinHash = await bcrypt.hash(pin, saltRounds);

    // A deviceId is globally unique. If it already exists we overwrite it — this
    // also re-homes the device to the current user/tenant and clears any prior
    // lockout, so "set a new PIN" always yields a clean, usable device.
    await (this.prisma.trusted_devices as any).upsert({
      where: { deviceId },
      create: {
        id: generateId(),
        tenantId,
        userId,
        deviceId,
        pinHash,
        label: label ?? null,
        updatedAt: new Date(),
      },
      update: {
        tenantId,
        userId,
        pinHash,
        label: label ?? null,
        failedAttempts: 0,
        lockedUntil: null,
        revokedAt: null,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Device PIN set: device=${deviceId} user=${userId} tenant=${tenantId}`,
    );
    return { success: true, deviceId };
  }

  /**
   * Exchange a device PIN for a fresh session. Public path: identity is proven
   * by (deviceId + PIN) against the stored hash, with server-side lockout.
   *
   * The tenant is taken from the device row itself — deviceId is a globally
   * unique, unguessable id — so this does NOT depend on the request's
   * x-tenant-id header being correct (it isn't, on the pre-auth login screen).
   */
  async unlock(deviceId: string, pin: string): Promise<AuthResponseDto> {
    const device = await (this.prisma.trusted_devices as any).findFirst({
      where: { deviceId, revokedAt: null },
    });

    // Uniform error for "no such device" — do not reveal whether it existed.
    if (!device) {
      throw new UnauthorizedException(
        'This device is not set up for PIN sign-in. Use your password.',
      );
    }

    if (device.lockedUntil && new Date(device.lockedUntil) > new Date()) {
      throw new ForbiddenException({
        code: 'PIN_LOCKED',
        message: 'Too many attempts. Sign in with your password to continue.',
      });
    }

    const ok = await bcrypt.compare(pin, device.pinHash);
    if (!ok) {
      const attempts = device.failedAttempts + 1;
      const shouldLock = attempts >= this.MAX_ATTEMPTS;
      await (this.prisma.trusted_devices as any).update({
        where: { id: device.id },
        data: shouldLock
          ? {
              failedAttempts: 0,
              lockedUntil: new Date(Date.now() + this.LOCK_MINUTES * 60_000),
            }
          : { failedAttempts: attempts },
      });
      if (shouldLock) {
        this.logger.warn(
          `Device PIN locked after ${this.MAX_ATTEMPTS} attempts: device=${deviceId}`,
        );
        throw new ForbiddenException({
          code: 'PIN_LOCKED',
          message: 'Too many attempts. Sign in with your password to continue.',
        });
      }
      const remaining = this.MAX_ATTEMPTS - attempts;
      throw new UnauthorizedException({
        code: 'PIN_WRONG',
        remaining,
        message: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`,
      });
    }

    // Correct PIN — load the user and mint a session (same tokens as a login).
    const user = await this.prisma.users.findFirst({
      where: { id: device.userId, tenantId: device.tenantId, isActive: true },
      include: { tenants: true },
    });
    if (!user) {
      throw new UnauthorizedException('Account is no longer available.');
    }
    if (user.tenants.status === 'SUSPENDED') {
      throw new ForbiddenException({
        code: 'TENANT_SUSPENDED',
        reason: user.tenants.suspendedReason || 'MANUAL',
        message: 'Account suspended. Please contact MCCL.',
      });
    }
    if (user.tenants.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    await (this.prisma.trusted_devices as any).update({
      where: { id: device.id },
      data: { failedAttempts: 0, lockedUntil: null, lastUsedAt: new Date() },
    });

    this.logger.log(
      `Device PIN unlock: device=${deviceId} user=${user.id} tenant=${device.tenantId}`,
    );
    return this.authCore.issueSession(user);
  }

  /** List a user's trusted devices (for a "manage devices" screen). */
  async listDevices(tenantId: string, userId: string) {
    const devices = await (this.prisma.trusted_devices as any).findMany({
      where: { tenantId, userId, revokedAt: null },
      select: {
        deviceId: true,
        label: true,
        lastUsedAt: true,
        createdAt: true,
        lockedUntil: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { devices };
  }

  /** Revoke a device so its PIN no longer works (remote "sign out this till"). */
  async revoke(
    tenantId: string,
    userId: string,
    deviceId: string,
  ): Promise<{ success: true }> {
    await (this.prisma.trusted_devices as any).updateMany({
      where: { deviceId, tenantId, userId },
      data: { revokedAt: new Date() },
    });
    this.logger.log(`Device PIN revoked: device=${deviceId} user=${userId}`);
    return { success: true };
  }
}
