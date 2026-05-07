import { createId } from '@paralleldrive/cuid2';

/**
 * Generate a CUID for database entities
 * This is needed because Prisma schema uses manual IDs (no @default)
 */
export function generateId(): string {
  return createId();
}
