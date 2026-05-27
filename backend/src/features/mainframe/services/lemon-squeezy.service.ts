import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

const LS_API_URL = 'https://api.lemonsqueezy.com/v1';

@Injectable()
export class LemonSqueezyService {
  private readonly logger = new Logger(LemonSqueezyService.name);
  private readonly apiKey: string;
  private readonly storeId: string;
  private readonly variantId: string;
  private readonly webhookSecret: string;

  constructor(private config: ConfigService) {
    this.apiKey       = this.config.get<string>('LEMONSQUEEZY_API_KEY') ?? '';
    this.storeId      = this.config.get<string>('LS_STORE_ID') ?? '333794';
    this.variantId    = this.config.get<string>('LS_VARIANT_ID') ?? '1710752';
    this.webhookSecret = this.config.get<string>('LEMONSQUEEZY_WEBHOOK_SECRET') ?? '';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    };
  }

  /**
   * Create a hosted checkout URL for a tenant.
   * Embeds profileId + tenantId in custom_data so the webhook knows who paid.
   */
  async createCheckout(opts: {
    email: string;
    profileId: string;
    tenantId: string;
    name?: string;
  }): Promise<string> {
    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_options: {
            embed: true,
            media: false,
            logo: true,
          },
          checkout_data: {
            email: opts.email,
            name: opts.name ?? '',
            custom: {
              profileId: opts.profileId,
              tenantId: opts.tenantId,
            },
          },
          expires_at: null,
        },
        relationships: {
          store: {
            data: { type: 'stores', id: this.storeId },
          },
          variant: {
            data: { type: 'variants', id: this.variantId },
          },
        },
      },
    };

    const response = await axios.post(`${LS_API_URL}/checkouts`, body, {
      headers: this.headers,
    });

    const checkoutUrl: string = response.data?.data?.attributes?.url;
    if (!checkoutUrl) throw new Error('LemonSqueezy did not return a checkout URL');

    this.logger.log(`Checkout created for ${opts.email} → ${checkoutUrl}`);
    return checkoutUrl;
  }

  /**
   * Get the LemonSqueezy customer portal URL so users can manage/cancel their sub.
   */
  async getCustomerPortalUrl(lsSubscriptionId: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${LS_API_URL}/subscriptions/${lsSubscriptionId}`,
        { headers: this.headers },
      );
      return response.data?.data?.attributes?.urls?.customer_portal ?? null;
    } catch (err) {
      this.logger.warn(`Could not fetch portal URL for sub ${lsSubscriptionId}: ${err}`);
      return null;
    }
  }

  /**
   * Verify the X-Signature header from a LemonSqueezy webhook.
   * Returns true if the payload was signed with our webhook secret.
   */
  verifySignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('LEMONSQUEEZY_WEBHOOK_SECRET not set — skipping signature check');
      return true; // allow in dev if secret not configured yet
    }
    const digest = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /** Map a LemonSqueezy subscription status to our tenant status. */
  static mapLsStatusToTenantStatus(
    lsStatus: string,
  ): 'ACTIVE' | 'PAYMENT_WARNING' | 'SUSPENDED' | 'INACTIVE' {
    switch (lsStatus) {
      case 'active':
      case 'on_trial':
        return 'ACTIVE';
      case 'past_due':
      case 'unpaid':
        return 'PAYMENT_WARNING';
      case 'paused':
      case 'cancelled':
        return 'SUSPENDED';
      case 'expired':
      default:
        return 'INACTIVE';
    }
  }
}
