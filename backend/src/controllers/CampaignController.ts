/**
 * Campaign Controller
 * Handles campaign management operations
 */

import { Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign/CampaignService';
import { Campaign, EmailLog } from '../models/index';
import { ResponseHandler } from '../utils/responseHandler';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export class CampaignController {
  /**
   * POST /campaigns
   * Create a new campaign
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignName, description, emailContent, config, attachments } = req.body;
      
      // Validate required fields
      if (!campaignName) {
        throw new ValidationError('Campaign name is required');
      }

      if (!emailContent || !emailContent.subject || !emailContent.htmlBody || !emailContent.from) {
        throw new ValidationError('Email content (subject, htmlBody, from) is required');
      }

      if (!config || !config.targetOrganizations || config.targetOrganizations.length === 0) {
        throw new ValidationError('Target organizations are required');
      }

      if (!config.sendingConfig || !config.sendingConfig.startDate) {
        throw new ValidationError('Sending configuration and start date are required');
      }

      const campaign = await CampaignService.createCampaign(req.user!.userId, {
        campaignName,
        description,
        emailContent,
        config,
        attachments,
      });

      ResponseHandler.created(res, campaign, 'Campaign created successfully');
    } catch (error) {
      logger.error('Error creating campaign:', error);
      next(error);
    }
  }

  /**
   * GET /campaigns
   * Get all campaigns
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const result = await CampaignService.getCampaigns(
        req.user!.userId,
        page,
        limit,
        status
      );

      const response = {
        ...result,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      };

      ResponseHandler.success(res, 200, 'Campaigns retrieved', response);
    } catch (error) {
      logger.error('Error listing campaigns:', error);
      next(error);
    }
  }

  /**
   * GET /campaigns/:id
   * Get campaign by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await CampaignService.getCampaignById(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign retrieved', campaign);
    } catch (error) {
      logger.error('Error fetching campaign:', error);
      next(error);
    }
  }

  /**
   * PUT /campaigns/:id
   * Update campaign
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignName, description, emailContent, config, attachments } = req.body;

      const campaign = await CampaignService.updateCampaign(req.params.id, {
        campaignName,
        description,
        emailContent,
        config,
        attachments,
      });

      ResponseHandler.success(res, 200, 'Campaign updated', campaign);
    } catch (error) {
      logger.error('Error updating campaign:', error);
      next(error);
    }
  }

  /**
   * DELETE /campaigns/:id
   * Delete campaign
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CampaignService.deleteCampaign(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign deleted');
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/duplicate
   * Duplicate campaign
   */
  static async duplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await CampaignService.duplicateCampaign(req.params.id);

      ResponseHandler.created(res, campaign, 'Campaign duplicated successfully');
    } catch (error) {
      logger.error('Error duplicating campaign:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/pause
   * Pause campaign
   */
  static async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await CampaignService.pauseCampaign(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign paused', campaign);
    } catch (error) {
      logger.error('Error pausing campaign:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/resume
   * Resume campaign
   */
  static async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await CampaignService.resumeCampaign(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign resumed', campaign);
    } catch (error) {
      logger.error('Error resuming campaign:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/cancel
   * Cancel campaign
   */
  static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await CampaignService.cancelCampaign(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign cancelled', campaign);
    } catch (error) {
      logger.error('Error cancelling campaign:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/validate-contacts
   * Validate contact selection for campaign
   */
  static async validateContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contacts = await CampaignService.validateContactSelection(req.params.id);

      ResponseHandler.success(res, 200, 'Contact selection validated', {
        contactsSelected: contacts.length,
        contacts,
      });
    } catch (error) {
      logger.error('Error validating contacts:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/update-statistics
   * Update campaign statistics
   */
  static async updateStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CampaignService.updateCampaignStatistics(req.params.id);
      const campaign = await CampaignService.getCampaignById(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign statistics updated', campaign);
    } catch (error) {
      logger.error('Error updating statistics:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/launch
   * Validate contacts, create email logs, and queue email jobs
   */
  static async launch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await CampaignService.launchCampaign(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign queued for sending', campaign);
    } catch (error) {
      logger.error('Error launching campaign:', error);
      next(error);
    }
  }

  /**
   * POST /campaigns/:id/reset
   * Reset campaign state, delete logs, and remove queue jobs
   */
  static async reset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await CampaignService.resetCampaign(req.params.id);

      ResponseHandler.success(res, 200, 'Campaign reset successfully', campaign);
    } catch (error) {
      logger.error('Error resetting campaign:', error);
      next(error);
    }
  }

  /**
   * GET /campaigns/:id/export
   * Export campaign email sending logs as CSV
   */
  static async exportLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        throw new ValidationError('Campaign not found');
      }

      const logs = await EmailLog.find({ campaignId: campaign._id })
        .populate('organizationId', 'companyName')
        .sort({ createdAt: -1 });

      let csv = 'Campaign,Organization,Contact Name,Recipient Email,Status,Timestamp,Bounce/Failure Reason\n';

      for (const log of logs) {
        const orgName = (log.organizationId as any)?.companyName || 'Unknown Organization';
        const timestamp = log.tracking?.sentAt || log.createdAt;
        const failureReason = log.tracking?.failureReason || log.bounceDetails?.bounceReason || '';

        csv += `"${campaign.campaignName.replace(/"/g, '""')}","${orgName.replace(/"/g, '""')}","${(log.recipientName || '').replace(/"/g, '""')}","${log.recipientEmail.replace(/"/g, '""')}","${log.status}","${timestamp.toISOString()}","${failureReason.replace(/"/g, '""')}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign-${req.params.id}-export.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      logger.error('Error exporting campaign logs:', error);
      next(error);
    }
  }
}
