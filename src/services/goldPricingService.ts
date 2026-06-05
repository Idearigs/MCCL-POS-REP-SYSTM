import { apiClient } from './apiClient';

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

export interface GoldRate {
  pricePerGram: number;
  pricePerOunce: number;
  currency: string;
  stale: boolean;
  lastUpdated: string;
}

const BASE = '/inventory/gold-pricing';

export const goldPricingService = {
  async candidates(): Promise<GoldCandidate[]> {
    return apiClient.get<GoldCandidate[]>(`${BASE}/candidates`);
  },

  async run(): Promise<GoldRunResult> {
    return apiClient.post<GoldRunResult>(`${BASE}/run`, {});
  },

  async setEnabled(ids: string[], enabled: boolean): Promise<{ updated: number }> {
    return apiClient.patch<{ updated: number }>(`${BASE}/bulk`, { ids, enabled });
  },

  /** Live 24k gold price per gram in GBP (server-side feed, no API key in the browser). */
  async goldRateGBP(): Promise<GoldRate> {
    return apiClient.get<GoldRate>('/metals/gold', { currency: 'GBP' });
  },
};
