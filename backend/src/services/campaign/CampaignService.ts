/**
 * Campaign Service
 * Handles campaign creation, management, and operations
 *
 * Redis / BullMQ have been removed.
 * All email sending uses direct setTimeout scheduling (no queue required).
 */

import { Campaign, Organization, EmailLog } from '../../models/index';
import { CampaignInterface, CampaignStatus, EmailStatus } from '../../types/index';
import { NotFoundError, ValidationError, ConflictError, CampaignLaunchConflictError } from '../../utils/errors';
import { StringUtils, ValidationUtils } from '../../utils/helpers';
import EmailValidationService from '../email/EmailValidationService';
import { sendCampaignEmailDirectly } from '../../queue/emailWorker';
import logger from '../../utils/logger';

export interface CreateCampaignInput {
  campaignName: string;
  description?: string;
  emailContent: {
    subject: string;
    htmlBody: string;
    textBody?: string;
    from: string;
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
}

export interface UpdateCampaignInput {
  campaignName?: string;
  description?: string;
  emailContent?: Partial<CreateCampaignInput['emailContent']>;
  config?: Partial<CreateCampaignInput['config']>;
}

class CampaignService {
  /**
   * Create a new campaign
   */
  async createCampaign(userId: string, data: CreateCampaignInput): Promise<CampaignInterface> {
    try {
      // Validate campaign name doesn't exist
      const existing = await Campaign.findOne({ campaignName: data.campaignName });
      if (existing) {
        throw new ConflictError(`Campaign "${data.campaignName}" already exists`);
      }

      // Validate target organizations exist
      const organizations = await Organization.find({
        _id: { $in: data.config.targetOrganizations },
      });

      if (organizations.length !== data.config.targetOrganizations.length) {
        throw new ValidationError('One or more target organizations do not exist');
      }

      // Extract merge fields from email content
      const mergeFields = this.extractMergeFields(
        data.emailContent.subject + data.emailContent.htmlBody
      );

      // Create campaign
      const campaign = new Campaign({
        campaignName: data.campaignName.trim(),
        description: data.description?.trim(),
        createdBy: userId,
        emailContent: {
          subject: data.emailContent.subject,
          htmlBody: data.emailContent.htmlBody,
          textBody: data.emailContent.textBody,
          from: data.emailContent.from,
          replyTo: data.emailContent.replyTo,
          mergeFields,
          signature: data.emailContent.signature,
        },
        attachments: [],
        config: {
          status: CampaignStatus.DRAFT,
          targetOrganizations: data.config.targetOrganizations,
          sendingConfig: {
            minimumDelaySeconds: data.config.sendingConfig.minimumDelaySeconds || 30,
            maximumDelaySeconds: data.config.sendingConfig.maximumDelaySeconds || 90,
            dailySendLimit: data.config.sendingConfig.dailySendLimit || 500,
            startDate: data.config.sendingConfig.startDate,
            endDate: data.config.sendingConfig.endDate,
            timeZone: data.config.sendingConfig.timeZone || 'UTC',
            activeHoursStart: data.config.sendingConfig.activeHoursStart,
            activeHoursEnd: data.config.sendingConfig.activeHoursEnd,
            activeOnWeekends: data.config.sendingConfig.activeOnWeekends ?? true,
          },
          retryConfig: {
            maxRetries: data.config.retryConfig?.maxRetries || 3,
            retryDelaySeconds: data.config.retryConfig?.retryDelaySeconds || 3600,
            exponentialBackoff: data.config.retryConfig?.exponentialBackoff ?? true,
          },
          excludeEmails: data.config.excludeEmails || [],
          excludeOrganizations: data.config.excludeOrganizations || [],
        },
        statistics: {
          totalOrganizationsTargeted: organizations.length,
          totalContactsSelected: 0,
          emailsQueued: 0,
          emailsSent: 0,
          emailsDelivered: 0,
          emailsFailed: 0,
          emailsBounced: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
        },
        activityLog: [
          {
            action: 'created',
            timestamp: new Date(),
            details: 'Campaign created',
          },
        ],
      });

      await campaign.save();
      logger.info(`Campaign created: ${campaign.campaignName} by user ${userId}`);

      return campaign.toObject();
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string): Promise<CampaignInterface> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      return campaign.toObject();
    } catch (error) {
      logger.error('Error fetching campaign:', error);
      throw error;
    }
  }

  /**
   * Get all campaigns with pagination
   */
  async getCampaigns(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ campaigns: CampaignInterface[]; total: number }> {
    try {
      const query: any = { createdBy: userId };

      if (status) {
        query['config.status'] = status;
      }

      const skip = (page - 1) * limit;
      const campaigns = await Campaign.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Campaign.countDocuments(query);

      return {
        campaigns: campaigns.map((cam) => cam.toObject()),
        total,
      };
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, data: UpdateCampaignInput): Promise<CampaignInterface> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      // Cannot update if campaign is sending or completed
      if (
        campaign.config.status === CampaignStatus.SENDING ||
        campaign.config.status === CampaignStatus.COMPLETED
      ) {
        throw new ValidationError(
          `Cannot update campaign with status: ${campaign.config.status}`
        );
      }

      // Update basic fields
      if (data.campaignName) campaign.campaignName = data.campaignName.trim();
      if (data.description !== undefined) campaign.description = data.description?.trim();

      // Update email content
      if (data.emailContent) {
        campaign.emailContent = {
          ...campaign.emailContent,
          ...data.emailContent,
        };

        // Re-extract merge fields if content changed
        if (data.emailContent.subject || data.emailContent.htmlBody) {
          campaign.emailContent.mergeFields = this.extractMergeFields(
            campaign.emailContent.subject + campaign.emailContent.htmlBody
          );
        }
      }

      // Update config — deep-merge nested sub-objects so a partial payload
      // (e.g. no retryConfig) doesn't overwrite existing values with undefined.
      if (data.config) {
        const existing = campaign.config as any;
        const incoming = data.config as any;

        (campaign as any).config = {
          ...existing,
          ...incoming,
          // Preserve nested objects that may not be in the incoming payload
          sendingConfig: incoming.sendingConfig
            ? { ...existing.sendingConfig, ...incoming.sendingConfig }
            : existing.sendingConfig,
          retryConfig: incoming.retryConfig
            ? { ...existing.retryConfig, ...incoming.retryConfig }
            : existing.retryConfig,
          // Always keep current status — status changes go through dedicated endpoints
          status: existing.status,
          // Merge array fields only when provided
          excludeEmails: incoming.excludeEmails ?? existing.excludeEmails,
          excludeOrganizations: incoming.excludeOrganizations ?? existing.excludeOrganizations,
          targetOrganizations: incoming.targetOrganizations ?? existing.targetOrganizations,
        };
      }

      await campaign.save();
      logger.info(`Campaign updated: ${campaignId}`);

      return campaign.toObject();
    } catch (error) {
      logger.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      // Only allow deletion of draft campaigns
      if (campaign.config.status !== CampaignStatus.DRAFT) {
        throw new ValidationError(
          `Cannot delete campaign with status: ${campaign.config.status}`
        );
      }

      await Campaign.findByIdAndDelete(campaignId);
      logger.info(`Campaign deleted: ${campaignId}`);
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Duplicate a campaign
   */
  async duplicateCampaign(campaignId: string): Promise<CampaignInterface> {
    try {
      const originalCampaign = await Campaign.findById(campaignId);

      if (!originalCampaign) {
        throw new NotFoundError('Campaign');
      }

      const campaignData = originalCampaign.toObject();
      delete (campaignData as any)._id;

      // Generate new campaign name
      const timestamp = new Date().getTime();
      campaignData.campaignName = `${originalCampaign.campaignName} - Copy (${timestamp})`;
      campaignData.config.status = CampaignStatus.DRAFT;
      campaignData.createdAt = new Date();
      campaignData.updatedAt = new Date();
      campaignData.startedAt = undefined;
      campaignData.completedAt = undefined;
      campaignData.cancelledAt = undefined;
      campaignData.activityLog = [
        {
          action: 'duplicated',
          timestamp: new Date(),
          details: `Duplicated from campaign: ${originalCampaign.campaignName}`,
        },
      ];

      // Reset statistics
      campaignData.statistics = {
        totalOrganizationsTargeted: originalCampaign.statistics.totalOrganizationsTargeted,
        totalContactsSelected: 0,
        emailsQueued: 0,
        emailsSent: 0,
        emailsDelivered: 0,
        emailsFailed: 0,
        emailsBounced: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      };

      const newCampaign = new Campaign(campaignData);
      await newCampaign.save();

      logger.info(`Campaign duplicated: ${campaignId} -> ${newCampaign._id}`);

      return newCampaign.toObject();
    } catch (error) {
      logger.error('Error duplicating campaign:', error);
      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<CampaignInterface> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      if (campaign.config.status !== CampaignStatus.SENDING) {
        throw new ValidationError('Only sending campaigns can be paused');
      }

      campaign.config.status = CampaignStatus.PAUSED;
      campaign.activityLog.push({
        action: 'paused',
        timestamp: new Date(),
      });

      await campaign.save();
      logger.info(`Campaign paused: ${campaignId}`);

      return campaign.toObject();
    } catch (error) {
      logger.error('Error pausing campaign:', error);
      throw error;
    }
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<CampaignInterface> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      if (campaign.config.status !== CampaignStatus.PAUSED) {
        throw new ValidationError('Only paused campaigns can be resumed');
      }

      campaign.config.status = CampaignStatus.SENDING;
      campaign.activityLog.push({
        action: 'resumed',
        timestamp: new Date(),
      });

      await campaign.save();
      logger.info(`Campaign resumed: ${campaignId}`);

      return campaign.toObject();
    } catch (error) {
      logger.error('Error resuming campaign:', error);
      throw error;
    }
  }

  /**
   * Cancel campaign
   */
  async cancelCampaign(campaignId: string): Promise<CampaignInterface> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      if (
        campaign.config.status === CampaignStatus.COMPLETED ||
        campaign.config.status === CampaignStatus.CANCELLED
      ) {
        throw new ValidationError(
          `Cannot cancel campaign with status: ${campaign.config.status}`
        );
      }

      campaign.config.status = CampaignStatus.CANCELLED;
      campaign.cancelledAt = new Date();
      campaign.activityLog.push({
        action: 'cancelled',
        timestamp: new Date(),
      });

      await campaign.save();
      logger.info(`Campaign cancelled: ${campaignId}`);

      return campaign.toObject();
    } catch (error) {
      logger.error('Error cancelling campaign:', error);
      throw error;
    }
  }

  /**
   * Extract merge fields from content
   */
  private extractMergeFields(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map((match) => match[0]))];
  }

  /**
   * Validate contact selection for a campaign
   * Returns first valid contact per organization
   */
  async validateContactSelection(
    campaignId: string
  ): Promise<Array<{ organizationId: string; contactId: string; contactEmail: string }>> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      const selectedContacts: Array<{
        organizationId: string;
        contactId: string;
        contactEmail: string;
      }> = [];

      // Get all target organizations
      const organizations = await Organization.find({
        _id: { $in: campaign.config.targetOrganizations },
      });

      for (const org of organizations) {
        // Skip if organization is excluded
        if (campaign.config.excludeOrganizations.some((id) => id.toString() === org._id.toString())) {
          continue;
        }

        // Find first valid contact
        const validContacts = org.contacts.filter(
          (contact) =>
            contact.emailValidation.status === 'VALID' &&
            !campaign.config.excludeEmails.includes(contact.email || '')
        );

        for (const contact of validContacts) {
          selectedContacts.push({
            organizationId: org._id.toString(),
            contactId: contact._id?.toString() || '',
            contactEmail: contact.email || '',
          });
        }
      }

      logger.info(
        `Contact selection validated for campaign ${campaignId}: ${selectedContacts.length} contacts selected`
      );

      return selectedContacts;
    } catch (error) {
      logger.error('Error validating contact selection:', error);
      throw error;
    }
  }

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
  async launchCampaign(campaignId: string): Promise<CampaignInterface> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      // ── Conflict check ───────────────────────────────────────────────────
      const sentCount = await EmailLog.countDocuments({
        campaignId: campaign._id,
        status: { $in: [EmailStatus.SENT, EmailStatus.DELIVERED] },
      });

      const totalCount = await EmailLog.countDocuments({ campaignId: campaign._id });
      const existingQueuedCount = await EmailLog.countDocuments({
        campaignId: campaign._id,
        status: EmailStatus.QUEUED,
      });

      logger.info(
        `[Launch] Campaign ${campaignId} — status: ${campaign.config.status}, ` +
        `totalLogs: ${totalCount}, queued: ${existingQueuedCount}, sent: ${sentCount}`
      );

      if (sentCount > 0) {
        throw new CampaignLaunchConflictError(
          'Campaign already has sent or delivered emails',
          existingQueuedCount,
          sentCount,
          campaign.config.status,
          'At least one email has already been sent or delivered. Re-launching is blocked to prevent duplication.'
        );
      }

      const launchableStatuses: CampaignStatus[] = [
        CampaignStatus.DRAFT,
        CampaignStatus.SCHEDULED,
        CampaignStatus.PAUSED,
        CampaignStatus.CANCELLED,
        CampaignStatus.FAILED,
      ];

      if (!launchableStatuses.includes(campaign.config.status)) {
        throw new CampaignLaunchConflictError(
          `Cannot launch campaign with status: ${campaign.config.status}`,
          existingQueuedCount,
          sentCount,
          campaign.config.status,
          `Campaign is in "${campaign.config.status}" status which does not permit launching.`
        );
      }

      // ── Clean up stale logs from a previous (failed/cancelled) launch ────
      if (totalCount > 0) {
        const deleteResult = await EmailLog.deleteMany({ campaignId: campaign._id });
        logger.info(`[Launch] Cleared ${deleteResult.deletedCount} stale email log records.`);
      }

      // ── Build send schedule ───────────────────────────────────────────────
      const organizations = await Organization.find({
        _id: { $in: campaign.config.targetOrganizations },
      });

      const now = Date.now();
      const startDate = campaign.config.sendingConfig.startDate
        ? new Date(campaign.config.sendingConfig.startDate)
        : new Date();
      let cumulativeDelayMs = Math.max(0, startDate.getTime() - now);
      let queuedCount = 0;
      let skippedCount = 0;

      for (const organization of organizations) {
        // Skip excluded organisations
        if (
          campaign.config.excludeOrganizations.some(
            (id) => id.toString() === organization._id.toString()
          )
        ) {
          skippedCount += 1;
          continue;
        }

        // Validate contacts (updates emailValidation.status in the DB)
        await EmailValidationService.validateOrganizationContacts(organization._id.toString());

        const refreshed = await Organization.findById(organization._id);
        if (!refreshed) continue;

        const selectedContacts = refreshed.contacts.filter(
          (c) =>
            c.emailValidation.status === 'VALID' &&
            !campaign.config.excludeEmails.includes((c.email || '').toLowerCase())
        );

        if (selectedContacts.length === 0) {
          skippedCount += 1;
          await EmailLog.create({
            campaignId: campaign._id,
            organizationId: refreshed._id,
            contactId: refreshed._id,
            recipientEmail: 'skipped@example.com',
            recipientName: refreshed.companyName,
            personalizedContent: {
              subject: campaign.emailContent.subject,
              htmlBody: campaign.emailContent.htmlBody,
              textBody: campaign.emailContent.textBody,
            },
            mergeFieldsApplied: {},
            status: EmailStatus.SKIPPED,
            tracking: {
              openCount: 0,
              clickCount: 0,
              failureAttempts: 0,
              failureReason: 'No valid contact found for slot',
            },
          });
          continue;
        }

        for (const selectedContact of selectedContacts) {
          const mergeFields: Record<string, string> = {
            company_name: selectedContact.companyName || refreshed.companyName,
            companyName:  selectedContact.companyName || refreshed.companyName,
            contact_name: selectedContact.name,
            contactName:  selectedContact.name,
            industry:     refreshed.industry || '',
            website:      refreshed.website  || '',
          };

          const emailLog = await EmailLog.create({
            campaignId: campaign._id,
            organizationId: refreshed._id,
            contactId: selectedContact._id,
            recipientEmail: selectedContact.email,
            recipientName:  selectedContact.name,
            personalizedContent: {
              subject:  StringUtils.replaceMergeFields(campaign.emailContent.subject,  mergeFields),
              htmlBody: StringUtils.replaceMergeFields(campaign.emailContent.htmlBody, mergeFields),
              textBody: campaign.emailContent.textBody
                ? StringUtils.replaceMergeFields(campaign.emailContent.textBody, mergeFields)
                : undefined,
            },
            mergeFieldsApplied: mergeFields,
            status: EmailStatus.QUEUED,
            tracking: { openCount: 0, clickCount: 0, failureAttempts: 0 },
          });

          selectedContact.emailSendStatus.selected = true;
          selectedContact.emailSendStatus.firstValidContactUsed = true;
          await refreshed.save();

          // Add a random inter-email delay (configurable via sendingConfig)
          cumulativeDelayMs += ValidationUtils.getRandomDelay(
            campaign.config.sendingConfig.minimumDelaySeconds,
            campaign.config.sendingConfig.maximumDelaySeconds
          );

          // Schedule the send via setTimeout — no Redis required
          const logIdStr  = emailLog._id.toString();
          const campIdStr = campaign._id.toString();
          const delayMs   = cumulativeDelayMs;

          setTimeout(() => {
            sendCampaignEmailDirectly(campIdStr, logIdStr).catch((err) =>
              logger.error(`[Launch] Direct send failed for log ${logIdStr}:`, err)
            );
          }, delayMs);

          logger.info(
            `[Launch] Scheduled email for ${selectedContact.email} in ${Math.round(delayMs / 1000)} s`
          );

          queuedCount += 1;
        }
      }

      // ── Update campaign record ────────────────────────────────────────────
      campaign.config.status =
        startDate.getTime() > now ? CampaignStatus.SCHEDULED : CampaignStatus.SENDING;
      campaign.scheduledAt  = startDate;
      campaign.startedAt    = startDate.getTime() <= now ? new Date() : undefined;
      campaign.statistics.totalContactsSelected = queuedCount;
      campaign.statistics.emailsQueued          = queuedCount;
      campaign.activityLog.push({
        action: 'launched',
        timestamp: new Date(),
        details: `${queuedCount} emails scheduled, ${skippedCount} organisations skipped`,
      });

      await campaign.save();
      logger.info(
        `[Launch] Campaign ${campaignId} launched — ` +
        `${queuedCount} emails scheduled, ${skippedCount} skipped`
      );

      return campaign.toObject();
    } catch (error) {
      logger.error('Error launching campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign statistics
   */
  async updateCampaignStatistics(campaignId: string): Promise<void> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      // Get email log statistics
      const logs = await EmailLog.aggregate([
        { $match: { campaignId: campaign._id } },
        {
          $group: {
            _id: null,
            totalQueued: { $sum: { $cond: [{ $eq: ['$status', 'queued'] }, 1, 0] } },
            totalSent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            totalDelivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            totalBounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
            totalOpened: {
              $sum: { $cond: [{ $gt: ['$tracking.openedAt', null] }, 1, 0] },
            },
            totalClicked: {
              $sum: { $cond: [{ $gt: ['$tracking.clickedAt', null] }, 1, 0] },
            },
          },
        },
      ]);

      if (logs.length > 0) {
        const stats = logs[0];
        campaign.statistics.emailsQueued = stats.totalQueued || 0;
        campaign.statistics.emailsSent = stats.totalSent || 0;
        campaign.statistics.emailsDelivered = stats.totalDelivered || 0;
        campaign.statistics.emailsFailed = stats.totalFailed || 0;
        campaign.statistics.emailsBounced = stats.totalBounced || 0;
        campaign.statistics.emailsOpened = stats.totalOpened || 0;
        campaign.statistics.emailsClicked = stats.totalClicked || 0;

        // Calculate rates
        if (campaign.statistics.emailsSent > 0) {
          campaign.statistics.openRate = parseFloat(
            (
              (campaign.statistics.emailsOpened / campaign.statistics.emailsSent) *
              100
            ).toFixed(2)
          );
          campaign.statistics.clickRate = parseFloat(
            (
              (campaign.statistics.emailsClicked / campaign.statistics.emailsSent) *
              100
            ).toFixed(2)
          );
          campaign.statistics.bounceRate = parseFloat(
            (
              (campaign.statistics.emailsBounced / campaign.statistics.emailsSent) *
              100
            ).toFixed(2)
          );
        }

        await campaign.save();
        logger.debug(`Campaign statistics updated: ${campaignId}`);
      }
    } catch (error) {
      logger.error('Error updating campaign statistics:', error);
      throw error;
    }
  }

  /**
   * Reset campaign — clears all EmailLog records and resets status to Draft.
   * (No BullMQ job cleanup needed in direct-send mode.)
   */
  async resetCampaign(campaignId: string): Promise<CampaignInterface> {
    try {
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        throw new NotFoundError('Campaign');
      }

      logger.info(`[Reset] Campaign ${campaignId} — previous status: ${campaign.config.status}`);

      // Delete all email log records
      const deleteResult = await EmailLog.deleteMany({ campaignId: campaign._id });
      logger.info(`[Reset] Deleted ${deleteResult.deletedCount} email log records.`);

      // Reset campaign status and statistics
      campaign.config.status = CampaignStatus.DRAFT;
      campaign.startedAt     = undefined;
      campaign.completedAt   = undefined;
      campaign.cancelledAt   = undefined;
      campaign.scheduledAt   = undefined;

      campaign.statistics = {
        totalOrganizationsTargeted: campaign.config.targetOrganizations.length,
        totalContactsSelected: 0,
        emailsQueued:   0,
        emailsSent:     0,
        emailsDelivered: 0,
        emailsFailed:   0,
        emailsBounced:  0,
        emailsOpened:   0,
        emailsClicked:  0,
        openRate:   0,
        clickRate:  0,
        bounceRate: 0,
      };

      campaign.activityLog.push({
        action: 'reset',
        timestamp: new Date(),
        details: 'Campaign reset to Draft',
      });

      await campaign.save();
      logger.info(`[Reset] Campaign ${campaignId} reset to Draft.`);

      return campaign.toObject();
    } catch (error) {
      logger.error('Error resetting campaign:', error);
      throw error;
    }
  }
}

export default new CampaignService();
