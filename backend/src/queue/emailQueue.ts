/**
 * Email Queue — Redis-free stub
 *
 * BullMQ / Redis have been removed from this project.
 * All email sending is handled directly via setTimeout in CampaignService.
 * This file exists only so that any legacy imports compile without errors.
 */

export const EMAIL_QUEUE_NAME = 'email-send-queue';

export interface SendEmailJobData {
  campaignId: string;
  emailLogId: string;
}

// Stubs kept for compile-time compatibility — they do nothing at runtime.
export function getEmailQueue(): never {
  throw new Error('Redis / BullMQ queue is not available — direct sending mode is active.');
}

export async function closeEmailQueue(): Promise<void> {
  // No-op: no queue to close
}

export function buildEmailJobOptions(): Record<string, unknown> {
  return {};
}

/**
 * Always returns false — Redis is not available.
 */
export async function checkRedisConnection(): Promise<boolean> {
  return false;
}
