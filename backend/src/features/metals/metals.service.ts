import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import CircuitBreaker from 'opossum';
import { CacheService } from '../../core/cache/cache.service';

export interface MetalPrice {
  metal: 'XAU' | 'XAG' | 'XPT';
  currency: string;
  pricePerOunce: number;
  pricePerGram: number;
  lastUpdated: string;
  /** true when served from cache because the live feed is unavailable */
  stale: boolean;
  source: 'live' | 'cache';
}

type MetalSymbol = 'XAU' | 'XAG' | 'XPT';

/** Encodes a metal+currency pair into the single arg the circuit breaker fires with. */
function packKey(metal: MetalSymbol, currency: string): string {
  return `${metal}/${currency.toUpperCase()}`;
}
function unpackKey(key: string): { metal: MetalSymbol; currency: string } {
  const [metal, currency] = key.split('/');
  return { metal: metal as MetalSymbol, currency: currency || 'USD' };
}

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const LAST_KNOWN_PREFIX = 'metals:last-known:';
// Cache last-known price for 7 days so it survives extended outages.
const LAST_KNOWN_TTL = 7 * 24 * 60 * 60;

@Injectable()
export class MetalsService implements OnModuleDestroy {
  private readonly logger = new Logger(MetalsService.name);
  private readonly apiKey: string;
  // Breaker fires with a packed "<metal>/<currency>" key (see packKey).
  private readonly breaker: CircuitBreaker<[string], MetalPrice>;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.apiKey = this.config.get<string>('GOLD_API_KEY') ?? '';

    // Circuit breaker: trips OPEN after the failure threshold, then short-circuits
    // straight to the fallback for `resetTimeout` ms before testing the feed again.
    this.breaker = new CircuitBreaker((key: string) => this.fetchLive(key), {
      timeout: 5000, // a single fetch may take at most 5s
      errorThresholdPercentage: 50, // open once >=50% of a rolling window fail
      volumeThreshold: 3, // ...but only after at least 3 requests (the "3 fails" rule)
      resetTimeout: 30000, // stay open 30s, then half-open to probe recovery
      rollingCountTimeout: 60000,
    });

    this.breaker.on('open', () =>
      this.logger.warn(
        '⚡ Metals circuit OPEN — serving last-known cached price',
      ),
    );
    this.breaker.on('halfOpen', () =>
      this.logger.log('Metals circuit HALF-OPEN — probing live feed'),
    );
    this.breaker.on('close', () =>
      this.logger.log('✅ Metals circuit CLOSED — live feed healthy'),
    );

    // When the breaker rejects (open) or the call fails, serve cached price.
    this.breaker.fallback((key: string) => this.fromCache(key));
  }

  onModuleDestroy() {
    this.breaker.shutdown();
  }

  /** Public API — always resolves: live price when healthy, else last-known. */
  async getPrice(
    metal: MetalSymbol = 'XAU',
    currency: string = 'USD',
  ): Promise<MetalPrice> {
    const key = packKey(metal, currency);
    try {
      return await this.breaker.fire(key);
    } catch {
      // Both live and cache unavailable — return a neutral stale response.
      return {
        metal,
        currency: currency.toUpperCase(),
        pricePerOunce: 0,
        pricePerGram: 0,
        lastUpdated: new Date(0).toISOString(),
        stale: true,
        source: 'cache',
      };
    }
  }

  /**
   * Live 24k gold price per gram in GBP. Used by the inventory gold-pricing
   * engine. Returns 0 when no live or cached price is available.
   */
  async getGoldGramPriceGBP(): Promise<number> {
    const price = await this.getPrice('XAU', 'GBP');
    return price.pricePerGram || 0;
  }

  /** Hits goldapi.io. Throws on any non-2xx / timeout so the breaker counts it. */
  private async fetchLive(key: string): Promise<MetalPrice> {
    if (!this.apiKey) {
      throw new Error('GOLD_API_KEY not configured');
    }
    const { metal, currency } = unpackKey(key);
    const res = await axios.get(
      `https://www.goldapi.io/api/${metal}/${currency}`,
      {
        headers: {
          'x-access-token': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      },
    );

    const data = res.data as { price?: number; price_gram_24k?: number };
    const pricePerOunce = Number(data.price) || 0;
    const pricePerGram =
      Number(data.price_gram_24k) || pricePerOunce / GRAMS_PER_TROY_OUNCE;

    if (pricePerOunce <= 0) {
      throw new Error('Invalid price payload from gold feed');
    }

    const result: MetalPrice = {
      metal,
      currency,
      pricePerOunce,
      pricePerGram,
      lastUpdated: new Date().toISOString(),
      stale: false,
      source: 'live',
    };

    // Persist as the last-known good price for graceful degradation.
    await this.cache.set(`${LAST_KNOWN_PREFIX}${key}`, result, LAST_KNOWN_TTL);
    return result;
  }

  /** Fallback path — returns the cached last-known price flagged as stale. */
  private async fromCache(key: string): Promise<MetalPrice> {
    const { metal, currency } = unpackKey(key);
    const cached = await this.cache.get<MetalPrice>(
      `${LAST_KNOWN_PREFIX}${key}`,
    );
    if (cached) {
      return { ...cached, stale: true, source: 'cache' };
    }
    // No cache yet — surface a clearly-empty stale response.
    return {
      metal,
      currency,
      pricePerOunce: 0,
      pricePerGram: 0,
      lastUpdated: new Date(0).toISOString(),
      stale: true,
      source: 'cache',
    };
  }
}
