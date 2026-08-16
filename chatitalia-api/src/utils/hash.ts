import crypto from 'crypto';

/**
 * Generate an idempotent SHA256 hash from lesson title
 * Used for deduplication across lessons
 */
export function generateLessonHash(title: string): string {
  return crypto.createHash('sha256').update(title).digest('hex');
}
