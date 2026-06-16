"use strict";
/**
 * Campaign Controller
 * Handles campaign management operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignController = void 0;
const CampaignService_1 = __importDefault(require("../services/campaign/CampaignService"));
const index_1 = require("../models/index");
const responseHandler_1 = require("../utils/responseHandler");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class CampaignController {
    /**
     * POST /campaigns
     * Create a new campaign
     */
    static async create(req, res, next) {
        try {
            const { campaignName, description, emailContent, config, attachments } = req.body;
            // Validate required fields
            if (!campaignName) {
                throw new errors_1.ValidationError('Campaign name is required');
            }
            if (!emailContent || !emailContent.subject || !emailContent.htmlBody || !emailContent.from) {
                throw new errors_1.ValidationError('Email content (subject, htmlBody, from) is required');
            }
            if (!config || !config.targetOrganizations || config.targetOrganizations.length === 0) {
                throw new errors_1.ValidationError('Target organizations are required');
            }
            if (!config.sendingConfig || !config.sendingConfig.startDate) {
                throw new errors_1.ValidationError('Sending configuration and start date are required');
            }
            const campaign = await CampaignService_1.default.createCampaign(req.user.userId, {
                campaignName,
                description,
                emailContent,
                config,
                attachments,
            });
            responseHandler_1.ResponseHandler.created(res, campaign, 'Campaign created successfully');
        }
        catch (error) {
            logger_1.default.error('Error creating campaign:', error);
            next(error);
        }
    }
    /**
     * GET /campaigns
     * Get all campaigns
     */
    static async list(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const result = await CampaignService_1.default.getCampaigns(req.user.userId, page, limit, status);
            const response = {
                ...result,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    pages: Math.ceil(result.total / limit),
                },
            };
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaigns retrieved', response);
        }
        catch (error) {
            logger_1.default.error('Error listing campaigns:', error);
            next(error);
        }
    }
    /**
     * GET /campaigns/:id
     * Get campaign by ID
     */
    static async getById(req, res, next) {
        try {
            const campaign = await CampaignService_1.default.getCampaignById(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign retrieved', campaign);
        }
        catch (error) {
            logger_1.default.error('Error fetching campaign:', error);
            next(error);
        }
    }
    /**
     * PUT /campaigns/:id
     * Update campaign
     */
    static async update(req, res, next) {
        try {
            const { campaignName, description, emailContent, config, attachments } = req.body;
            const campaign = await CampaignService_1.default.updateCampaign(req.params.id, {
                campaignName,
                description,
                emailContent,
                config,
                attachments,
            });
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign updated', campaign);
        }
        catch (error) {
            logger_1.default.error('Error updating campaign:', error);
            next(error);
        }
    }
    /**
     * DELETE /campaigns/:id
     * Delete campaign
     */
    static async delete(req, res, next) {
        try {
            await CampaignService_1.default.deleteCampaign(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign deleted');
        }
        catch (error) {
            logger_1.default.error('Error deleting campaign:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/duplicate
     * Duplicate campaign
     */
    static async duplicate(req, res, next) {
        try {
            const campaign = await CampaignService_1.default.duplicateCampaign(req.params.id);
            responseHandler_1.ResponseHandler.created(res, campaign, 'Campaign duplicated successfully');
        }
        catch (error) {
            logger_1.default.error('Error duplicating campaign:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/pause
     * Pause campaign
     */
    static async pause(req, res, next) {
        try {
            const campaign = await CampaignService_1.default.pauseCampaign(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign paused', campaign);
        }
        catch (error) {
            logger_1.default.error('Error pausing campaign:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/resume
     * Resume campaign
     */
    static async resume(req, res, next) {
        try {
            const campaign = await CampaignService_1.default.resumeCampaign(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign resumed', campaign);
        }
        catch (error) {
            logger_1.default.error('Error resuming campaign:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/cancel
     * Cancel campaign
     */
    static async cancel(req, res, next) {
        try {
            const campaign = await CampaignService_1.default.cancelCampaign(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign cancelled', campaign);
        }
        catch (error) {
            logger_1.default.error('Error cancelling campaign:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/validate-contacts
     * Validate contact selection for campaign
     */
    static async validateContacts(req, res, next) {
        try {
            const contacts = await CampaignService_1.default.validateContactSelection(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Contact selection validated', {
                contactsSelected: contacts.length,
                contacts,
            });
        }
        catch (error) {
            logger_1.default.error('Error validating contacts:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/update-statistics
     * Update campaign statistics
     */
    static async updateStatistics(req, res, next) {
        try {
            await CampaignService_1.default.updateCampaignStatistics(req.params.id);
            const campaign = await CampaignService_1.default.getCampaignById(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign statistics updated', campaign);
        }
        catch (error) {
            logger_1.default.error('Error updating statistics:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/launch
     * Validate contacts, create email logs, and queue email jobs
     */
    static async launch(req, res, next) {
        try {
            const campaign = await CampaignService_1.default.launchCampaign(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign queued for sending', campaign);
        }
        catch (error) {
            logger_1.default.error('Error launching campaign:', error);
            next(error);
        }
    }
    /**
     * POST /campaigns/:id/reset
     * Reset campaign state, delete logs, and remove queue jobs
     */
    static async reset(req, res, next) {
        try {
            const campaign = await CampaignService_1.default.resetCampaign(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Campaign reset successfully', campaign);
        }
        catch (error) {
            logger_1.default.error('Error resetting campaign:', error);
            next(error);
        }
    }
    /**
     * GET /campaigns/:id/export
     * Export campaign email sending logs as CSV
     */
    static async exportLogs(req, res, next) {
        try {
            const campaign = await index_1.Campaign.findById(req.params.id);
            if (!campaign) {
                throw new errors_1.ValidationError('Campaign not found');
            }
            const logs = await index_1.EmailLog.find({ campaignId: campaign._id })
                .populate('organizationId', 'companyName')
                .sort({ createdAt: -1 });
            let csv = 'Campaign,Organization,Contact Name,Recipient Email,Status,Timestamp,Bounce/Failure Reason\n';
            for (const log of logs) {
                const orgName = log.organizationId?.companyName || 'Unknown Organization';
                const timestamp = log.tracking?.sentAt || log.createdAt;
                const failureReason = log.tracking?.failureReason || log.bounceDetails?.bounceReason || '';
                csv += `"${campaign.campaignName.replace(/"/g, '""')}","${orgName.replace(/"/g, '""')}","${(log.recipientName || '').replace(/"/g, '""')}","${log.recipientEmail.replace(/"/g, '""')}","${log.status}","${timestamp.toISOString()}","${failureReason.replace(/"/g, '""')}"\n`;
            }
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="campaign-${req.params.id}-export.csv"`);
            res.status(200).send(csv);
        }
        catch (error) {
            logger_1.default.error('Error exporting campaign logs:', error);
            next(error);
        }
    }
}
exports.CampaignController = CampaignController;
//# sourceMappingURL=CampaignController.js.map