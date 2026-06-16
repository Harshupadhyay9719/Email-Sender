/**
 * Campaign Service
 * Handles campaign creation, management, and operations
 *
 * Redis / BullMQ have been removed.
 * All email sending uses direct setTimeout scheduling (no queue required).
 */
import { CampaignInterface } from '../../types/index';
export interface CreateCampaignInput {
    campaignName: string;
    description?: string;
    emailContent: {
        subject: string;
        htmlBody: string;
        textBody?: string;
        from: string;
        fromName?: string;
        replyTo?: string;
        signature?: string;
    };
    config: {
        targetOrganizations: string[];
        sendingConfig: {
            minimumDelaySeconds?: number;
            maximumDelaySeconds?: number;
            dailySendLimit?: number;
            startDate: Date;
            endDate?: Date;
            timeZone?: string;
            activeHoursStart?: string;
            activeHoursEnd?: string;
            activeOnWeekends?: boolean;
        };
        retryConfig?: {
            maxRetries?: number;
            retryDelaySeconds?: number;
            exponentialBackoff?: boolean;
        };
        excludeEmails?: string[];
        excludeOrganizations?: string[];
    };
    attachments?: Array<{
        fileName: string;
        fileType: string;
        s3Key: string;
        s3Url: string;
        fileSize: number;
    }>;
}
export interface UpdateCampaignInput {
    campaignName?: string;
    description?: string;
    emailContent?: Partial<CreateCampaignInput['emailContent']>;
    config?: Partial<CreateCampaignInput['config']>;
    attachments?: CreateCampaignInput['attachments'];
}
declare class CampaignService {
    /**
     * Create a new campaign
     */
    createCampaign(userId: string, data: CreateCampaignInput): Promise<CampaignInterface>;
    /**
     * Get campaign by ID
     */
    getCampaignById(campaignId: string): Promise<CampaignInterface>;
    /**
     * Get all campaigns with pagination
     */
    getCampaigns(userId: string, page?: number, limit?: number, status?: string): Promise<{
        campaigns: CampaignInterface[];
        total: number;
    }>;
    /**
     * Update campaign
     */
    updateCampaign(campaignId: string, data: UpdateCampaignInput): Promise<CampaignInterface>;
    /**
     * Delete campaign
     */
    deleteCampaign(campaignId: string): Promise<void>;
    /**
     * Duplicate a campaign
     */
    duplicateCampaign(campaignId: string): Promise<CampaignInterface>;
    /**
     * Pause campaign
     */
    pauseCampaign(campaignId: string): Promise<CampaignInterface>;
    /**
     * Resume campaign
     */
    resumeCampaign(campaignId: string): Promise<CampaignInterface>;
    /**
     * Cancel campaign
     */
    cancelCampaign(campaignId: string): Promise<CampaignInterface>;
    /**
     * Extract merge fields from content
     */
    private extractMergeFields;
    /**
     * Validate contact selection for a campaign
     * Returns first valid contact per organization
     */
    validateContactSelection(campaignId: string): Promise<Array<{
        organizationId: string;
        contactId: string;
        contactEmail: string;
    }>>;
    /**
     * Launch a campaign — direct send mode (no Redis / BullMQ required).
     *
     * Steps:
     *  1. Validate campaign state.
     *  2. Clear any stale EmailLog records (if no emails have been sent yet).
     *  3. Validate contacts for each target organisation.
     *  4. Create EmailLog records (status = QUEUED).
     *  5. Schedule each send via setTimeout with a cumulative random delay.
     */
    launchCampaign(campaignId: string): Promise<CampaignInterface>;
    /**
     * Update campaign statistics
     */
    updateCampaignStatistics(campaignId: string): Promise<void>;
    /**
     * Reset campaign — clears all EmailLog records and resets status to Draft.
     * (No BullMQ job cleanup needed in direct-send mode.)
     */
    resetCampaign(campaignId: string): Promise<CampaignInterface>;
}
declare const _default: CampaignService;
export default _default;
//# sourceMappingURL=CampaignService.d.ts.map