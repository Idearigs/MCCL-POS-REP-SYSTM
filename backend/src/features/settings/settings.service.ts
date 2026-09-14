import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { UpdateSettingsDto } from './dto/settings.dto';

// Keys in tenants.settings that are NOT app-level settings (reserved for QZ
// certs and the refund-authorisation password hash). These are preserved
// across settings writes and NEVER returned to the client by getSettings().
const REFUND_PASSWORD_KEY = 'refundPasswordHash';
const RESERVED_KEYS = new Set([
  'qzCertificate',
  'qzPrivateKey',
  REFUND_PASSWORD_KEY,
]);
const APP_SETTINGS_KEY = 'appSettings';
// Config cache: semi-static workspace settings read on every sales lookup.
const SETTINGS_CACHE_KEY = 'settings:app';
const SETTINGS_CACHE_TTL = 600; // 10 minutes

interface ReceiptTypeConfig {
  headerText: string;
  footerText: string;
}

export interface AppSettings {
  general: {
    storeName: string;
    phone: string;
    tradingName?: string;
    email: string;
    address: string;
    currency: string;
    taxRate: number;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    lowStockAlerts: boolean;
    repairStatusUpdates: boolean;
    dailySummary: boolean;
  };
  appearance: {
    darkMode: boolean;
    compactView: boolean;
    receiptTemplate: string;
  };
  printer: {
    model: string;
    printerName: string;
    autoPrint: boolean;
    copies: 1 | 2;
    headerText: string;
    footerText: string;
    drawerPin?: string;
    vatNumber?: string;
  };
  metals: {
    goldMarginPercent: number;
    silverMarginPercent: number;
    platinumMarginPercent: number;
  };
  receiptTypes: {
    sales: ReceiptTypeConfig;
    pettyCash: ReceiptTypeConfig;
    layaway: ReceiptTypeConfig;
  };
  cashUp: {
    // Absolute variance (£) above which a manager PIN is required to close.
    varianceThreshold: number;
    companyRegistrationNumber: string;
    registerId: string;
  };
}

const DEFAULTS: AppSettings = {
  metals: {
    goldMarginPercent: 0,
    silverMarginPercent: 0,
    platinumMarginPercent: 0,
  },
  receiptTypes: {
    sales: {
      headerText: '',
      footerText:
        'Thank you for shopping\nKEEP THIS RECEIPT AS PROOF OF PURCHASE\nRETURNS OR EXCHANGES WITHIN 14 DAYS WITH RECEIPT\nITEMS MUST BE UNWORN IN ORIGINAL CONDITION\nPEARLS RESTRINGING BESPOKE AND EARRINGS CARRIES NO GUARANTEE OR REFUND STATUTORY RIGHTS UNAFFECTED',
    },
    pettyCash: {
      headerText: 'PETTY CASH VOUCHER',
      footerText:
        'Authorised signature: ___________\nKEEP THIS VOUCHER FOR YOUR RECORDS',
    },
    layaway: {
      headerText: 'LAYAWAY RECEIPT',
      footerText:
        'Thank you for your layaway deposit.\nPlease keep this receipt as proof of your reservation.',
    },
  },
  general: {
    storeName: 'Andrew McCulloch Jewellers',
    tradingName: 'A trading name of Beeston Jewellers Ltd',
    phone: '0115 925 7552',
    email: '',
    address: '7 The Square\nBeeston\nNottingham NG9 2JG',
    currency: 'GBP',
    taxRate: 20,
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    lowStockAlerts: true,
    repairStatusUpdates: true,
    dailySummary: false,
  },
  appearance: {
    darkMode: false,
    compactView: false,
    receiptTemplate: '',
  },
  printer: {
    model: 'STAR_TSP100',
    printerName: '',
    autoPrint: false,
    copies: 1,
    headerText: '',
    footerText:
      'Thank you for shopping\nKEEP THIS RECEIPT AS PROOF OF PURCHASE\nRETURNS OR EXCHANGES WITHIN 14 DAYS WITH RECEIPT\nITEMS MUST BE UNWORN IN ORIGINAL CONDITION\nPEARLS RESTRINGING BESPOKE AND EARRINGS CARRIES NO GUARANTEE OR REFUND STATUTORY RIGHTS UNAFFECTED',
    vatNumber: '275322603',
  },
  cashUp: {
    varianceThreshold: 5,
    companyRegistrationNumber: '',
    registerId: '1',
  },
};

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  /**
   * Returns merged app settings for a tenant. Served from the config cache
   * buffer when warm; only falls through to the DB on a cache miss. The cached
   * value is invalidated immediately after any updateSettings() mutation.
   */
  async getSettings(tenantId: string): Promise<AppSettings> {
    return this.cache.getOrSet<AppSettings>(
      this.cache.generateTenantKey(tenantId, SETTINGS_CACHE_KEY),
      () => this.loadSettingsFromDb(tenantId),
      SETTINGS_CACHE_TTL,
    );
  }

  /** Raw DB read + default-merge (the original getSettings body). */
  private async loadSettingsFromDb(tenantId: string): Promise<AppSettings> {
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const blob = (tenant?.settings ?? {}) as Record<string, unknown>;
    const stored = (blob[APP_SETTINGS_KEY] ?? {}) as Partial<AppSettings>;

    // Deep merge stored values over defaults so missing keys always resolve
    const storedReceiptTypes = (stored.receiptTypes ?? {}) as Partial<
      AppSettings['receiptTypes']
    >;
    return {
      general: { ...DEFAULTS.general, ...(stored.general ?? {}) },
      notifications: {
        ...DEFAULTS.notifications,
        ...(stored.notifications ?? {}),
      },
      appearance: { ...DEFAULTS.appearance, ...(stored.appearance ?? {}) },
      printer: { ...DEFAULTS.printer, ...(stored.printer ?? {}) },
      metals: { ...DEFAULTS.metals, ...(stored.metals ?? {}) },
      receiptTypes: {
        sales: {
          ...DEFAULTS.receiptTypes.sales,
          ...(storedReceiptTypes.sales ?? {}),
        },
        pettyCash: {
          ...DEFAULTS.receiptTypes.pettyCash,
          ...(storedReceiptTypes.pettyCash ?? {}),
        },
        layaway: {
          ...DEFAULTS.receiptTypes.layaway,
          ...(storedReceiptTypes.layaway ?? {}),
        },
      },
      cashUp: { ...DEFAULTS.cashUp, ...(stored.cashUp ?? {}) },
    };
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateSettingsDto,
  ): Promise<AppSettings> {
    // Load current state from the DB directly (not cache) so the merge base
    // is always the freshest persisted value.
    const current = await this.loadSettingsFromDb(tenantId);

    // Merge only the sections that were sent
    const dtoAny = dto as any;
    const next: AppSettings = {
      general: dto.general
        ? { ...current.general, ...dto.general }
        : current.general,
      notifications: dto.notifications
        ? { ...current.notifications, ...dto.notifications }
        : current.notifications,
      appearance: dto.appearance
        ? { ...current.appearance, ...dto.appearance }
        : current.appearance,
      printer: dto.printer
        ? { ...current.printer, ...dto.printer }
        : current.printer,
      metals: dto.metals
        ? { ...current.metals, ...dto.metals }
        : current.metals,
      receiptTypes: dtoAny.receiptTypes
        ? {
            sales: {
              ...current.receiptTypes.sales,
              ...(dtoAny.receiptTypes.sales ?? {}),
            },
            pettyCash: {
              ...current.receiptTypes.pettyCash,
              ...(dtoAny.receiptTypes.pettyCash ?? {}),
            },
            layaway: {
              ...current.receiptTypes.layaway,
              ...(dtoAny.receiptTypes.layaway ?? {}),
            },
          }
        : current.receiptTypes,
      cashUp: dtoAny.cashUp
        ? { ...current.cashUp, ...dtoAny.cashUp }
        : current.cashUp,
    };

    // Preserve reserved keys (QZ certs) while writing appSettings
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const existing = (tenant?.settings ?? {}) as Record<string, unknown>;
    const reserved: Record<string, unknown> = {};
    for (const key of RESERVED_KEYS) {
      if (key in existing) reserved[key] = existing[key];
    }

    await this.prisma.tenants.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...reserved,
          [APP_SETTINGS_KEY]: next,
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    // Cache invalidation — immediately post-commit. Next getSettings() repopulates.
    await this.cache.delTenantData(tenantId, SETTINGS_CACHE_KEY);

    return next;
  }

  // ─── Refund authorisation password ─────────────────────────────────────────
  // A single shared password, set by an OWNER in Settings, that every user must
  // enter to authorise a refund. Stored bcrypt-hashed under a reserved key so it
  // is never returned by getSettings(). Enforced server-side in the refund path.

  private async readRefundHash(tenantId: string): Promise<string | null> {
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const blob = (tenant?.settings ?? {}) as Record<string, unknown>;
    const hash = blob[REFUND_PASSWORD_KEY];
    return typeof hash === 'string' && hash.length > 0 ? hash : null;
  }

  /** Whether a refund password has been configured for this tenant. */
  async hasRefundPassword(tenantId: string): Promise<boolean> {
    return (await this.readRefundHash(tenantId)) !== null;
  }

  /** Set (or replace) the shared refund password. OWNER-only at the controller. */
  async setRefundPassword(tenantId: string, password: string): Promise<void> {
    const trimmed = (password ?? '').trim();
    if (trimmed.length < 4) {
      throw new Error('Refund password must be at least 4 characters');
    }
    const hash = await bcrypt.hash(trimmed, 10);
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const existing = (tenant?.settings ?? {}) as Record<string, unknown>;
    await this.prisma.tenants.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...existing,
          [REFUND_PASSWORD_KEY]: hash,
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Verify a candidate refund password. Returns true when it matches the stored
   * hash. When NO password is configured this returns true (gate is inactive) —
   * callers that must require one should check hasRefundPassword() first.
   */
  async verifyRefundPassword(
    tenantId: string,
    password: string,
  ): Promise<boolean> {
    const hash = await this.readRefundHash(tenantId);
    if (!hash) return true; // no gate configured
    if (!password) return false;
    return bcrypt.compare(password, hash);
  }
}
