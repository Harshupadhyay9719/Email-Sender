/**
 * Organization Controller
 * Handles organization and contact management
 */
import { Request, Response, NextFunction } from 'express';
export declare class OrganizationController {
    /**
     * POST /organizations
     * Create a new organization
     */
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /organizations
     * Get all organizations for user
     */
    static list(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /organizations/:id
     * Get organization by ID
     */
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /organizations/:id
     * Update organization
     */
    static update(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /organizations/:id
     * Delete organization
     */
    static delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /organizations/:id/contacts
     * Add contact to organization
     */
    static addContact(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /organizations/:id/contacts/:contactId
     * Update contact
     */
    static updateContact(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /organizations/:id/contacts/:contactId
     * Delete contact
     */
    static deleteContact(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /organizations/:id/validate
     * Validate all contacts in organization
     */
    static validateContacts(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /organizations/export
     * Export organizations and contacts as CSV
     */
    static exportOrgs(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=OrganizationController.d.ts.map