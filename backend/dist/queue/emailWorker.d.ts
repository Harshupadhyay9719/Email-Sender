/**
 * Email Worker — Redis-free direct sending mode
 *
 * BullMQ / Redis have been removed. Emails are sent directly
 * via setTimeout delays scheduled by CampaignService.launchCampaign().
 */
export declare function startEmailWorker(): undefined;
export declare function stopEmailWorker(): Promise<void>;
/**
 * Send one email log entry directly (no queue).
 * Called via setTimeout from CampaignService.launchCampaign().
 */
export declare function sendCampaignEmailDirectly(campaignId: string, emailLogId: string, attemptsMade?: number): Promise<void>;
export declare function updateCampaignStatistics(campaignId: string): Promise<void>;
export declare function markCampaignCompleteIfDone(campaignId: string): Promise<void>;
//# sourceMappingURL=emailWorker.d.ts.map