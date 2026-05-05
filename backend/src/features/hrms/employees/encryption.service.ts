import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>('HRMS_ENCRYPTION_KEY');
    if (!secret || secret.length < 32) {
      this.logger.warn(
        '⚠️  HRMS_ENCRYPTION_KEY not set or too short — using derived dev key. Set a 32-char key in production.',
      );
    }
    // Derive a 32-byte key via SHA-256 so any string length works
    this.key = crypto
      .createHash('sha256')
      .update(secret || 'hrms-dev-encryption-key-change-me')
      .digest();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // Format: hex(iv):hex(tag):hex(ciphertext)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, tagHex, dataHex] = ciphertext.split(':');
    if (!ivHex || !tagHex || !dataHex)
      throw new Error('Invalid encrypted format');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  }

  /** Encrypt only if value is non-empty, otherwise return null */
  encryptOptional(value: string | null | undefined): string | null {
    if (!value) return null;
    return this.encrypt(value);
  }

  /** Decrypt only if value is non-empty, otherwise return null */
  decryptOptional(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      return this.decrypt(value);
    } catch {
      // Return null rather than crashing if field is not yet encrypted (migration)
      return null;
    }
  }

  /** Return masked NI: "AB 12 34 56 C" → "** ** ** ** C" */
  maskNi(ni: string): string {
    return ni.replace(/[A-Z0-9]/g, (c, i) => (i >= ni.length - 2 ? c : '*'));
  }

  /** Return masked sort code: "12-34-56" → "**-**-56" */
  maskSortCode(sc: string): string {
    return sc.replace(/\d/g, (d, i) =>
      i >= sc.replace(/-/g, '').length - 2 ? d : '*',
    );
  }
}
