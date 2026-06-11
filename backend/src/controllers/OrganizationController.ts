/**
 * Organization Controller
 * Handles organization and contact management
 */

import { Request, Response, NextFunction } from 'express';
import OrganizationService from '../services/organization/OrganizationService';
import EmailValidationService from '../services/email/EmailValidationService';
import { Organization } from '../models/index';
import { ResponseHandler } from '../utils/responseHandler';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export class OrganizationController {
  /**
   * POST /organizations
   * Create a new organization
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyName, industry, website, contacts } = req.body;

      // Validate required fields
      if (!companyName) {
        throw new ValidationError('Company name is required');
      }

      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        throw new ValidationError('At least one contact is required');
      }

      // Validate contacts structure
      contacts.forEach((contact: any, index: number) => {
        if (!contact.name || !contact.email) {
          throw new ValidationError(`Contact ${index + 1}: name and email are required`);
        }
      });

      const organization = await OrganizationService.createOrganization(req.user!.userId, {
        companyName,
        industry,
        website,
        contacts,
      });

      ResponseHandler.created(res, organization, 'Organization created successfully');
    } catch (error) {
      logger.error('Error creating organization:', error);
      next(error);
    }
  }

  /**
   * GET /organizations
   * Get all organizations for user
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const result = await OrganizationService.getOrganizations(
        req.user!.userId,
        page,
        limit,
        search
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

      ResponseHandler.success(res, 200, 'Organizations retrieved', response);
    } catch (error) {
      logger.error('Error listing organizations:', error);
      next(error);
    }
  }

  /**
   * GET /organizations/:id
   * Get organization by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organization = await OrganizationService.getOrganizationById(req.params.id);

      ResponseHandler.success(res, 200, 'Organization retrieved', organization);
    } catch (error) {
      logger.error('Error fetching organization:', error);
      next(error);
    }
  }

  /**
   * PUT /organizations/:id
   * Update organization
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyName, industry, website } = req.body;

      const organization = await OrganizationService.updateOrganization(req.params.id, {
        companyName,
        industry,
        website,
      });

      ResponseHandler.success(res, 200, 'Organization updated', organization);
    } catch (error) {
      logger.error('Error updating organization:', error);
      next(error);
    }
  }

  /**
   * DELETE /organizations/:id
   * Delete organization
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await OrganizationService.deleteOrganization(req.params.id);

      ResponseHandler.success(res, 200, 'Organization deleted');
    } catch (error) {
      logger.error('Error deleting organization:', error);
      next(error);
    }
  }

  /**
   * POST /organizations/:id/contacts
   * Add contact to organization
   */
  static async addContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, phone, position, department } = req.body;

      if (!name || !email) {
        throw new ValidationError('Name and email are required');
      }

      const organization = await OrganizationService.addContact(req.params.id, {
        name,
        email,
        phone,
        position,
        department,
      });

      ResponseHandler.created(res, organization, 'Contact added successfully');
    } catch (error) {
      logger.error('Error adding contact:', error);
      next(error);
    }
  }

  /**
   * PUT /organizations/:id/contacts/:contactId
   * Update contact
   */
  static async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, phone, position, department } = req.body;

      const organization = await OrganizationService.updateContact(
        req.params.id,
        req.params.contactId,
        {
          name,
          email,
          phone,
          position,
          department,
        }
      );

      ResponseHandler.success(res, 200, 'Contact updated', organization);
    } catch (error) {
      logger.error('Error updating contact:', error);
      next(error);
    }
  }

  /**
   * DELETE /organizations/:id/contacts/:contactId
   * Delete contact
   */
  static async deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organization = await OrganizationService.deleteContact(
        req.params.id,
        req.params.contactId
      );

      ResponseHandler.success(res, 200, 'Contact deleted', organization);
    } catch (error) {
      logger.error('Error deleting contact:', error);
      next(error);
    }
  }

  /**
   * POST /organizations/:id/validate
   * Validate all contacts in organization
   */
  static async validateContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await EmailValidationService.validateOrganizationContacts(req.params.id);
      const organization = await OrganizationService.getOrganizationById(req.params.id);
      ResponseHandler.success(res, 200, 'Contacts validated successfully', { organization, results });
    } catch (error) {
      logger.error('Error validating contacts:', error);
      next(error);
    }
  }

  /**
   * GET /organizations/export
   * Export organizations and contacts as CSV
   */
  static async exportOrgs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizations = await Organization.find({ createdBy: req.user!.userId });
      
      let csv = 'Company Name,Industry,Website,Contact Name,Contact Email,Contact Phone,Validation Status\n';
      
      for (const org of organizations) {
        if (org.contacts.length === 0) {
          csv += `"${org.companyName.replace(/"/g, '""')}","${(org.industry || '').replace(/"/g, '""')}","${(org.website || '').replace(/"/g, '""')}","","","",""\n`;
        } else {
          for (const contact of org.contacts) {
            csv += `"${org.companyName.replace(/"/g, '""')}","${(org.industry || '').replace(/"/g, '""')}","${(org.website || '').replace(/"/g, '""')}","${contact.name.replace(/"/g, '""')}","${contact.email.replace(/"/g, '""')}","${(contact.phone || '').replace(/"/g, '""')}","${contact.emailValidation?.status || 'UNKNOWN'}"\n`;
          }
        }
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="organizations-export.csv"');
      res.status(200).send(csv);
    } catch (error) {
      logger.error('Error exporting organizations:', error);
      next(error);
    }
  }
}
