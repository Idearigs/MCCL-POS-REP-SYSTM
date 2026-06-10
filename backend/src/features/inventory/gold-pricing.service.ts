import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MetalsService } from '../metals/metals.service';
import { SettingsService } from '../settings/settings.service';

export interface GoldCandidate {
  id: string;
  name: string;
  sku: string;
  weight: number | null;
  carat: number | null;
  currentPrice: number;
  /** Live gold market value (NRV) at the current rate, or null if not computable. */
  liveValue: number | null;
  goldPricingEnabled: boolean;
  lastGoldPricedAt: string | null;
}

export interface GoldRunResult {
  gramPriceGBP: number;
  marginPercent: number;
  updated: number;
  skipped: number;
  skippedReasons: { id: string; name: string; reason: string }[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** True for any gold variant in the JewelryMaterial enum. */
function isGoldMaterial(material?: string | null): boolean {
  return !!material && material.toUpperCase().includes('GOLD');
}

@Injectable()
export class GoldPricingService {
  private readonly logger = new Logger(GoldPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metals: MetalsService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Derive the gold carat (1–24) for a product. Prefers the carat recorded on a
   * gold entry in the multi-material JSON, then falls back to the `purity` field
   * (e.g. "22K" → 22, or a millesimal hallmark like "750" → 18). Returns null
   * when no gold carat can be determined (the product is then skipped, never guessed).
   */
  parseCarat(product: {
    material: string | null;
    purity: string | null;
    materials: string | null;
  }): number | null {
    // 1) Multi-material JSON: [{ base, carat, detail }]
    if (product.materials) {
      try {
        const entries = JSON.parse(product.materials) as {
          base?: string;
          carat?: string;
        }[];
        const goldEntry = entries.find((e) => isGoldMaterial(e.base));
        const c = goldEntry?.carat ? parseFloat(goldEntry.carat) : NaN;
        if (!Number.isNaN(c) && c > 0 && c <= 24) return c;
      } catch {
        // fall through to purity
      }
    }
    // 2) purity string
    if (product.purity) {
      const num = parseFloat(product.purity.replace(/[^0-9.]/g, ''));
      if (!Number.isNaN(num) && num > 0) {
        if (num <= 24) return num; // "22K" / "18" → carat directly
        if (num <= 1000) return round2((num / 1000) * 24); // "750" → 18k
      }
    }
    return null;
  }

  isGoldProduct(product: {
    material: string | null;
    materials: string | null;
  }): boolean {
    if (isGoldMaterial(product.material)) return true;
    if (product.materials) {
      try {
        const entries = JSON.parse(product.materials) as { base?: string }[];
        return entries.some((e) => isGoldMaterial(e.base));
      } catch {
        return false;
      }
    }
    return false;
  }

  /** Pure gold market value (NRV): weight × purity-fraction × £/g, plus optional margin. */
  computeGoldValue(
    weight: number,
    carat: number,
    gramPriceGBP: number,
    marginPercent: number,
  ): number {
    const market = weight * (carat / 24) * gramPriceGBP;
    return round2(market * (1 + (marginPercent || 0) / 100));
  }

  /** All gold-weight products for the tenant with their live value + opt-in state. */
  async getCandidates(tenantId: string): Promise<GoldCandidate[]> {
    const gramPrice = await this.metals.getGoldGramPriceGBP();
    const margin = await this.getMarginPercent(tenantId);
    const products = await this.prisma.products.findMany({
      where: { tenantId, isActive: true, weight: { not: null } },
      select: {
        id: true,
        name: true,
        sku: true,
        weight: true,
        purity: true,
        material: true,
        materials: true,
        sellingPrice: true,
        goldPricingEnabled: true,
        lastGoldPricedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return products
      .filter((p) => this.isGoldProduct(p))
      .map((p) => {
        const weight = p.weight != null ? Number(p.weight) : null;
        const carat = this.parseCarat(p);
        const liveValue =
          weight && weight > 0 && carat && gramPrice > 0
            ? this.computeGoldValue(weight, carat, gramPrice, margin)
            : null;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          weight,
          carat,
          currentPrice: Number(p.sellingPrice),
          liveValue,
          goldPricingEnabled: p.goldPricingEnabled,
          lastGoldPricedAt: p.lastGoldPricedAt
            ? p.lastGoldPricedAt.toISOString()
            : null,
        };
      });
  }

  /** Recompute and persist sellingPrice for every opted-in gold-weight product. */
  async runForTenant(tenantId: string): Promise<GoldRunResult> {
    const gramPriceGBP = await this.metals.getGoldGramPriceGBP();
    const marginPercent = await this.getMarginPercent(tenantId);
    const result: GoldRunResult = {
      gramPriceGBP,
      marginPercent,
      updated: 0,
      skipped: 0,
      skippedReasons: [],
    };

    if (!gramPriceGBP || gramPriceGBP <= 0) {
      this.logger.warn(
        `Gold repricing skipped for tenant ${tenantId}: no live GBP gold rate`,
      );
      return result;
    }

    const products = await this.prisma.products.findMany({
      where: {
        tenantId,
        isActive: true,
        goldPricingEnabled: true,
        weight: { not: null },
      },
      select: {
        id: true,
        name: true,
        weight: true,
        purity: true,
        material: true,
        materials: true,
      },
    });

    const now = new Date();
    for (const p of products) {
      const weight = p.weight != null ? Number(p.weight) : 0;
      const carat = this.parseCarat(p);
      if (!this.isGoldProduct(p)) {
        result.skipped++;
        result.skippedReasons.push({
          id: p.id,
          name: p.name,
          reason: 'not a gold item',
        });
        continue;
      }
      if (weight <= 0 || !carat) {
        result.skipped++;
        result.skippedReasons.push({
          id: p.id,
          name: p.name,
          reason: weight <= 0 ? 'missing weight' : 'missing/invalid carat',
        });
        continue;
      }
      const value = this.computeGoldValue(
        weight,
        carat,
        gramPriceGBP,
        marginPercent,
      );
      await this.prisma.products.update({
        where: { id: p.id },
        data: {
          sellingPrice: new Prisma.Decimal(value),
          lastGoldPricedAt: now,
          updatedAt: now,
        },
      });
      result.updated++;
    }

    this.logger.log(
      `Gold repricing tenant ${tenantId}: ${result.updated} updated, ${result.skipped} skipped @ £${gramPriceGBP}/g (margin ${marginPercent}%)`,
    );
    return result;
  }

  /** Enable/disable auto gold pricing for a set of products. */
  async setBulk(
    tenantId: string,
    ids: string[],
    enabled: boolean,
  ): Promise<{ updated: number }> {
    if (!ids.length) return { updated: 0 };
    const res = await this.prisma.products.updateMany({
      where: { tenantId, id: { in: ids } },
      data: { goldPricingEnabled: enabled, updatedAt: new Date() },
    });
    return { updated: res.count };
  }

  private async getMarginPercent(tenantId: string): Promise<number> {
    try {
      const settings = await this.settings.getSettings(tenantId);
      return settings?.metals?.goldMarginPercent ?? 0;
    } catch {
      return 0;
    }
  }

  /** Daily auto-reprice across every tenant that has opted-in gold products. */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async dailyReprice(): Promise<void> {
    const tenants = await this.prisma.products.findMany({
      where: { goldPricingEnabled: true, isActive: true },
      distinct: ['tenantId'],
      select: { tenantId: true },
    });
    this.logger.log(`Daily gold repricing for ${tenants.length} tenant(s)`);
    for (const { tenantId } of tenants) {
      try {
        await this.runForTenant(tenantId);
      } catch (err) {
        this.logger.error(
          `Daily gold repricing failed for tenant ${tenantId}`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }
}
