"use strict";
/**
 * Organization Controller
 * Handles organization and contact management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationController = void 0;
const OrganizationService_1 = __importDefault(require("../services/organization/OrganizationService"));
const EmailValidationService_1 = __importDefault(require("../services/email/EmailValidationService"));
const index_1 = require("../models/index");
const responseHandler_1 = require("../utils/responseHandler");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class OrganizationController {
    /**
     * POST /organizations
     * Create a new organization
     */
    static async create(req, res, next) {
        try {
            const { companyName, industry, website, contacts } = req.body;
            // Validate required fields
            if (!companyName) {
                throw new errors_1.ValidationError('Company name is required');
            }
            if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                throw new errors_1.ValidationError('At least one contact is required');
            }
            // Validate contacts structure
            contacts.forEach((contact, index) => {
                if (!contact.name || !contact.email) {
                    throw new errors_1.ValidationError(`Contact ${index + 1}: name and email are required`);
                }
            });
            const organization = await OrganizationService_1.default.createOrganization(req.user.userId, {
                companyName,
                industry,
                website,
                contacts,
            });
            responseHandler_1.ResponseHandler.created(res, organization, 'Organization created successfully');
        }
        catch (error) {
            logger_1.default.error('Error creating organization:', error);
            next(error);
        }
    }
    /**
     * GET /organizations
     * Get all organizations for user
     */
    static async list(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search;
            const result = await OrganizationService_1.default.getOrganizations(req.user.userId, page, limit, search);
            const response = {
                ...result,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    pages: Math.ceil(result.total / limit),
                },
            };
            responseHandler_1.ResponseHandler.success(res, 200, 'Organizations retrieved', response);
        }
        catch (error) {
            logger_1.default.error('Error listing organizations:', error);
            next(error);
        }
    }
    /**
     * GET /organizations/:id
     * Get organization by ID
     */
    static async getById(req, res, next) {
        try {
            const organization = await OrganizationService_1.default.getOrganizationById(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Organization retrieved', organization);
        }
        catch (error) {
            logger_1.default.error('Error fetching organization:', error);
            next(error);
        }
    }
    /**
     * PUT /organizations/:id
     * Update organization
     */
    static async update(req, res, next) {
        try {
            const { companyName, industry, website } = req.body;
            const organization = await OrganizationService_1.default.updateOrganization(req.params.id, {
                companyName,
                industry,
                website,
            });
            responseHandler_1.ResponseHandler.success(res, 200, 'Organization updated', organization);
        }
        catch (error) {
            logger_1.default.error('Error updating organization:', error);
            next(error);
        }
    }
    /**
     * DELETE /organizations/:id
     * Delete organization
     */
    static async delete(req, res, next) {
        try {
            await OrganizationService_1.default.deleteOrganization(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Organization deleted');
        }
        catch (error) {
            logger_1.default.error('Error deleting organization:', error);
            next(error);
        }
    }
    /**
     * POST /organizations/:id/contacts
     * Add contact to organization
     */
    static async addContact(req, res, next) {
        try {
            const { name, email, phone, position, department } = req.body;
            if (!name || !email) {
                throw new errors_1.ValidationError('Name and email are required');
            }
            const organization = await OrganizationService_1.default.addContact(req.params.id, {
                name,
                email,
                phone,
                position,
                department,
            });
            responseHandler_1.ResponseHandler.created(res, organization, 'Contact added successfully');
        }
        catch (error) {
            logger_1.default.error('Error adding contact:', error);
            next(error);
        }
    }
    /**
     * PUT /organizations/:id/contacts/:contactId
     * Update contact
     */
    static async updateContact(req, res, next) {
        try {
            const { name, email, phone, position, department } = req.body;
            const organization = await OrganizationService_1.default.updateContact(req.params.id, req.params.contactId, {
                name,
                email,
                phone,
                position,
                department,
            });
            responseHandler_1.ResponseHandler.success(res, 200, 'Contact updated', organization);
        }
        catch (error) {
            logger_1.default.error('Error updating contact:', error);
            next(error);
        }
    }
    /**
     * DELETE /organizations/:id/contacts/:contactId
     * Delete contact
     */
    static async deleteContact(req, res, next) {
        try {
            const organization = await OrganizationService_1.default.deleteContact(req.params.id, req.params.contactId);
            responseHandler_1.ResponseHandler.success(res, 200, 'Contact deleted', organization);
        }
        catch (error) {
            logger_1.default.error('Error deleting contact:', error);
            next(error);
        }
    }
    /**
     * POST /organizations/:id/validate
     * Validate all contacts in organization
     */
    static async validateContacts(req, res, next) {
        try {
            const results = await EmailValidationService_1.default.validateOrganizationContacts(req.params.id);
            const organization = await OrganizationService_1.default.getOrganizationById(req.params.id);
            responseHandler_1.ResponseHandler.success(res, 200, 'Contacts validated successfully', { organization, results });
        }
        catch (error) {
            logger_1.default.error('Error validating contacts:', error);
            next(error);
        }
    }
    /**
     * GET /organizations/export
     * Export organizations and contacts as CSV
     */
    static async exportOrgs(req, res, next) {
        try {
            const organizations = await index_1.Organization.find({ createdBy: req.user.userId });
            let csv = 'Company Name,Industry,Website,Contact Name,Contact Email,Contact Phone,Validation Status\n';
            for (const org of organizations) {
                if (org.contacts.length === 0) {
                    csv += `"${org.companyName.replace(/"/g, '""')}","${(org.industry || '').replace(/"/g, '""')}","${(org.website || '').replace(/"/g, '""')}","","","",""\n`;
                }
                else {
                    for (const contact of org.contacts) {
                        csv += `"${org.companyName.replace(/"/g, '""')}","${(org.industry || '').replace(/"/g, '""')}","${(org.website || '').replace(/"/g, '""')}","${contact.name.replace(/"/g, '""')}","${(contact.email || '').replace(/"/g, '""')}","${(contact.phone || '').replace(/"/g, '""')}","${contact.emailValidation?.status || 'UNKNOWN'}"\n`;
                    }
                }
            }
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="organizations-export.csv"');
            res.status(200).send(csv);
        }
        catch (error) {
            logger_1.default.error('Error exporting organizations:', error);
            next(error);
        }
    }
}
exports.OrganizationController = OrganizationController;
//# sourceMappingURL=OrganizationController.js.map