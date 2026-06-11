/**
 * Email Queue — Redis-free stub
 *
 * BullMQ / Redis have been removed from this project.
 * All email sending is handled directly via setTimeout in CampaignService.
 * This file exists only so that any legacy imports compile without errors.
 */
export declare const EMAIL_QUEUE_NAME = "email-send-queue";
export interface SendEmailJobData {
    campaignId: string;
    emailLogId: string;
}
export declare function getEmailQueue(): never;
export declare function closeEmailQueue(): Promise<void>;
export declare function buildEmailJobOptions(): Record<string, unknown>;
/**
 * Always returns false — Redis is not available.
 */
export declare function checkRedisConnection(): Promise<boolean>;
//# sourceMappingURL=emailQueue.d.ts.map