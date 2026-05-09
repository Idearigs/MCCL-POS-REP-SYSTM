import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { buildHmacHeaders } from './hmac';

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = 'Td#';
  for (let i = 0; i < 7; i++) {
    pw += chars[crypto.randomInt(chars.length)];
  }
  return pw;
}

export async function provisionPosTenant(data: {
  tenantId: string;
  businessName: string;
  subdomain: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
  tradingName?: string;
  vatNumber?: string;
  businessAddress?: string;
  city?: string;
  postalCode?: string;
  businessPhone?: string;
}): Promise<void> {
  const posBackendUrl =
    process.env.POS_BACKEND_URL || 'http://localhost:3002/api/v1';
  const body = JSON.stringify(data);

  return new Promise((resolve, reject) => {
    const url = new URL(`${posBackendUrl}/auth/provision-tenant`);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...buildHmacHeaders(body),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(`POS provisioning failed: ${res.statusCode} ${raw}`),
            );
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export function calcNextBillingDate(billingCycle: string): Date {
  const d = new Date();
  switch (billingCycle) {
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function getPlanConfig(plan: string) {
  const configs: Record<
    string,
    {
      basePrice: number;
      perUserPrice: number;
      includedUsers: number;
      maxUsers: number | null;
    }
  > = {
    STARTER: { basePrice: 29, perUserPrice: 10, includedUsers: 1, maxUsers: 3 },
    PROFESSIONAL: {
      basePrice: 79,
      perUserPrice: 8,
      includedUsers: 5,
      maxUsers: 15,
    },
    BUSINESS: {
      basePrice: 199,
      perUserPrice: 6,
      includedUsers: 15,
      maxUsers: 50,
    },
    ENTERPRISE: {
      basePrice: 499,
      perUserPrice: 5,
      includedUsers: 50,
      maxUsers: null,
    },
    CUSTOM: { basePrice: 0, perUserPrice: 0, includedUsers: 1, maxUsers: null },
  };
  return configs[plan] || configs.STARTER;
}
