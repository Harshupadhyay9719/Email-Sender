/**
 * Email Worker — Redis-free direct sending mode
 *
 * BullMQ / Redis have been removed. Emails are sent directly
 * via setTimeout delays scheduled by CampaignService.launchCampaign().
 */

import { Campaign, EmailLog, Organization, ConnectedAccount } from '../models/index';
import GmailService from '../services/email/GmailService';
import { CampaignStatus, EmailStatus } from '../types/index';
import logger from '../utils/logger';

// ── No-op stubs kept for server.ts compatibility ─────────────────────────────

export function startEmailWorker(): undefined {
  logger.info('✓ Email worker started (direct-send mode via Gmail API, no Redis required)');
  return undefined;
}

export async function stopEmailWorker(): Promise<void> {
  // Nothing to stop in direct-send mode
}

// ── Core sending logic ────────────────────────────────────────────────────────

/**
 * Send one email log entry directly (no queue).
 * Called via setTimeout from CampaignService.launchCampaign().
 */
export async function sendCampaignEmailDirectly(
  campaignId: string,
  emailLogId: string,
  attemptsMade: number = 0
): Promise<void> {
  const emailLog = await EmailLog.findById(emailLogId);
  if (!emailLog) {
    // Expected: stale setTimeout from a previous launch that was relaunched/cancelled.
    logger.debug(`[DirectSend] Skipping stale timer — log ${emailLogId} no longer exists.`);
    return;
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    logger.warn(`[DirectSend] Campaign not found: ${campaignId}`);
    return;
  }

  // Skip if campaign was cancelled
  if (campaign.config.status === CampaignStatus.CANCELLED) {
    emailLog.status = EmailStatus.SKIPPED;
    emailLog.tracking.failureReason = 'Campaign cancelled before send';
    await emailLog.save();
    await updateCampaignStatistics(campaignId);
    return;
  }

  // If campaign is paused, reschedule this email for 60 s later
  if (campaign.config.status === CampaignStatus.PAUSED) {
    logger.info(`[DirectSend] Campaign ${campaignId} is paused. Rescheduling log ${emailLogId} in 60 s.`);
    setTimeout(() => {
      sendCampaignEmailDirectly(campaignId, emailLogId, attemptsMade).catch((err) =>
        logger.error(`[DirectSend] Rescheduled send failed for log ${emailLogId}:`, err)
      );
    }, 60_000);
    return;
  }

  // Mark campaign as Sending on first job
  const currentStatus = campaign.config.status as string;
  if (
    currentStatus !== CampaignStatus.SENDING &&
    currentStatus !== CampaignStatus.PAUSED
  ) {
    campaign.config.status = CampaignStatus.SENDING;
    campaign.startedAt = campaign.startedAt || new Date();
    campaign.activityLog.push({
      action: 'sending_started',
      timestamp: new Date(),
      details: 'First email job started processing',
    });
    await campaign.save();
  }

  try {
    // Load ConnectedAccount for this user
    const connectedAccount = await ConnectedAccount.findOne({
      userId: campaign.createdBy,
      provider: 'google',
    });

    if (!connectedAccount || !connectedAccount.email) {
      throw new Error(`No connected Gmail account found for user ${campaign.createdBy}`);
    }

    logger.info(`[Email Send Start] Sending log ${emailLogId} to ${emailLog.recipientEmail} via Gmail API (${connectedAccount.email})`);
    const result = await GmailService.sendEmail(
      campaign.createdBy.toString(),
      connectedAccount.email,
      {
        to: emailLog.recipientEmail,
        from: connectedAccount.email,
        replyTo: campaign.emailContent.replyTo || connectedAccount.email,
        subject: emailLog.personalizedContent.subject,
        htmlBody: emailLog.personalizedContent.htmlBody,
        textBody: emailLog.personalizedContent.textBody,
      }
    );

    logger.info(`[Email Send Success] Sent log ${emailLogId} successfully. MessageId: ${result.gmailMessageId}, ThreadId: ${result.threadId}`);

    emailLog.status = EmailStatus.SENT;
    emailLog.gmailMessageId = result.gmailMessageId;
    emailLog.threadId = result.threadId;
    emailLog.sesMessageId = result.MessageId; // for backwards compatibility
    emailLog.sesResponse = result as Record<string, any>;
    emailLog.tracking.sentAt = new Date();
    await emailLog.save();

    // Update contact activity
    await Organization.updateOne(
      { _id: emailLog.organizationId, 'contacts._id': emailLog.contactId },
      {
        $inc: { 'contacts.$.activity.emailsSent': 1 },
        $set: { 'contacts.$.activity.lastEmailSentAt': new Date() },
        $addToSet: { 'contacts.$.emailSendStatus.campaignIds': campaign._id },
      }
    );

    await updateCampaignStatistics(campaignId);
    await markCampaignCompleteIfDone(campaignId);
  } catch (error: any) {
    logger.error(`[Email Send Failed] Error sending log ${emailLogId}: ${error.message}`);
    logger.error(`[DirectSend] Error sending log ${emailLogId}:`, error);

    const retryDelaySeconds = campaign.config.retryConfig.exponentialBackoff
      ? Math.min(
          campaign.config.retryConfig.retryDelaySeconds * Math.pow(2, Math.max(0, attemptsMade)),
          3600
        )
      : campaign.config.retryConfig.retryDelaySeconds;

    const nextAttempt = attemptsMade + 1;
    emailLog.tracking.failureAttempts = nextAttempt;
    emailLog.tracking.failureReason = error.message;
    emailLog.tracking.failureCode = error.name;
    emailLog.tracking.nextRetryAt = new Date(Date.now() + retryDelaySeconds * 1_000);

    if (nextAttempt > campaign.config.retryConfig.maxRetries) {
      emailLog.status = EmailStatus.FAILED;
      await emailLog.save();
      await updateCampaignStatistics(campaignId);
      await markCampaignCompleteIfDone(campaignId);
    } else {
      await emailLog.save();
      logger.info(
        `[DirectSend] Retrying log ${emailLogId} in ${retryDelaySeconds} s (attempt ${nextAttempt}/${campaign.config.retryConfig.maxRetries})`
      );
      setTimeout(() => {
        sendCampaignEmailDirectly(campaignId, emailLogId, nextAttempt).catch((err) =>
          logger.error(`[DirectSend] Retry failed for log ${emailLogId}:`, err)
        );
      }, retryDelaySeconds * 1_000);
    }
  }
}

// ── Statistics helpers ────────────────────────────────────────────────────────

export async function updateCampaignStatistics(campaignId: string): Promise<void> {
  try {
    const logs = await EmailLog.aggregate([
      { $match: { campaignId: require('mongoose').Types.ObjectId.isValid(campaignId)
          ? new (require('mongoose').Types.ObjectId)(campaignId)
          : campaignId } },
      {
        $group: {
          _id: null,
          totalQueued:    { $sum: { $cond: [{ $eq: ['$status', EmailStatus.QUEUED] }, 1, 0] } },
          totalSent:      { $sum: { $cond: [{ $eq: ['$status', EmailStatus.SENT] }, 1, 0] } },
          totalDelivered: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.DELIVERED] }, 1, 0] } },
          totalFailed:    { $sum: { $cond: [{ $eq: ['$status', EmailStatus.FAILED] }, 1, 0] } },
          totalBounced:   { $sum: { $cond: [{ $eq: ['$status', EmailStatus.BOUNCED] }, 1, 0] } },
          totalOpened:    { $sum: { $cond: [{ $gt: ['$tracking.openedAt', null] }, 1, 0] } },
          totalClicked:   { $sum: { $cond: [{ $gt: ['$tracking.clickedAt', null] }, 1, 0] } },
        },
      },
    ]);

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || logs.length === 0) return;

    const s = logs[0];
    campaign.statistics.emailsQueued    = s.totalQueued    || 0;
    campaign.statistics.emailsSent      = s.totalSent      || 0;
    campaign.statistics.emailsDelivered = s.totalDelivered || 0;
    campaign.statistics.emailsFailed    = s.totalFailed    || 0;
    campaign.statistics.emailsBounced   = s.totalBounced   || 0;
    campaign.statistics.emailsOpened    = s.totalOpened    || 0;
    campaign.statistics.emailsClicked   = s.totalClicked   || 0;

    const sent = campaign.statistics.emailsSent;
    if (sent > 0) {
      campaign.statistics.openRate   = parseFloat(((campaign.statistics.emailsOpened / sent) * 100).toFixed(2));
      campaign.statistics.clickRate  = parseFloat(((campaign.statistics.emailsClicked / sent) * 100).toFixed(2));
      campaign.statistics.bounceRate = parseFloat(((campaign.statistics.emailsBounced / sent) * 100).toFixed(2));
    }

    await campaign.save();
  } catch (err) {
    logger.error('[DirectSend] updateCampaignStatistics error:', err);
  }
}

export async function markCampaignCompleteIfDone(campaignId: string): Promise<void> {
  const remaining = await EmailLog.countDocuments({
    campaignId,
    status: EmailStatus.QUEUED,
  });

  if (remaining > 0) return;

  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.config.status !== CampaignStatus.SENDING) return;

  campaign.config.status = CampaignStatus.COMPLETED;
  campaign.completedAt = new Date();
  campaign.activityLog.push({
    action: 'completed',
    timestamp: new Date(),
    details: 'All emails processed',
  });
  await campaign.save();
  logger.info(`[DirectSend] Campaign ${campaignId} marked Completed.`);
}
