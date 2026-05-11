import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

// Keys in tenants.settings that are NOT app-level settings (reserved for QZ certs etc.)
const RESERVED_KEYS = new Set(['qzCertificate', 'qzPrivateKey']);
const APP_SETTINGS_KEY = 'appSettings';

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
    footerText: string;
    drawerPin?: string;
    vatNumber?: string;
  };
}

const DEFAULTS: AppSettings = {
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
    footerText:
      'Thank you for shopping\nKEEP THIS RECEIPT AS PROOF OF PURCHASE\nRETURNS OR EXCHANGES WITHIN 14 DAYS WITH RECEIPT\nITEMS MUST BE UNWORN IN ORIGINAL CONDITION\nPEARLS RESTRINGING BESPOKE AND EARRINGS CARRIES NO GUARANTEE OR REFUND STATUTORY RIGHTS UNAFFECTED',
    vatNumber: '275322603',
  },
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(tenantId: string): Promise<AppSettings> {
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const blob = (tenant?.settings ?? {}) as Record<string, unknown>;
    const stored = (blob[APP_SETTINGS_KEY] ?? {}) as Partial<AppSettings>;

    // Deep merge stored values over defaults so missing keys always resolve
    return {
      general: { ...DEFAULTS.general, ...(stored.general ?? {}) },
      notifications: {
        ...DEFAULTS.notifications,
        ...(stored.notifications ?? {}),
      },
      appearance: { ...DEFAULTS.appearance, ...(stored.appearance ?? {}) },
      printer: { ...DEFAULTS.printer, ...(stored.printer ?? {}) },
    };
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateSettingsDto,
  ): Promise<AppSettings> {
    // Load current state
    const current = await this.getSettings(tenantId);

    // Merge only the sections that were sent
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

    return next;
  }
}
