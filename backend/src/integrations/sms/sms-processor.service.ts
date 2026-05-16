/**
 * Kept for backwards compatibility — all SMS logic now lives in SmsService.
 * This re-exports the same types so any imports still resolve.
 */
export type { SMSResult as SMSProcessorResult } from './sms.service';

export interface SMSProcessorData {
  to: string;
  message: string;
  reference?: string;
  from?: string;
}

// SmsProcessorService is no longer a separate class.
// It was merged into SmsService in the TextMagic refactor.
// Keeping the export name so existing imports compile without change.
export { SmsService as SmsProcessorService } from './sms.service';
