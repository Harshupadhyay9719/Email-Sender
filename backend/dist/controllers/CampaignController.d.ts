/**
 * Campaign Controller
 * Handles campaign management operations
 */
import { Request, Response, NextFunction } from 'express';
export declare class CampaignController {
    /**
     * POST /campaigns
     * Create a new campaign
     */
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /campaigns
     * Get all campaigns
     */
    static list(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /campaigns/:id
     * Get campaign by ID
     */
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /campaigns/:id
     * Update campaign
     */
    static update(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /campaigns/:id
     * Delete campaign
     */
    static delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/duplicate
     * Duplicate campaign
     */
    static duplicate(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/pause
     * Pause campaign
     */
    static pause(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/resume
     * Resume campaign
     */
    static resume(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/cancel
     * Cancel campaign
     */
    static cancel(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/validate-contacts
     * Validate contact selection for campaign
     */
    static validateContacts(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/update-statistics
     * Update campaign statistics
     */
    static updateStatistics(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/launch
     * Validate contacts, create email logs, and queue email jobs
     */
    static launch(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /campaigns/:id/reset
     * Reset campaign state, delete logs, and remove queue jobs
     */
    static reset(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /campaigns/:id/export
     * Export campaign email sending logs as CSV
     */
    static exportLogs(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=CampaignController.d.ts.map