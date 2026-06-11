"use strict";
/**
 * Organization Service
 * Handles organization and contact management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../models/index");
const index_2 = require("../../types/index");
const errors_1 = require("../../utils/errors");
const logger_1 = __importDefault(require("../../utils/logger"));
class OrganizationService {
    /**
     * Create a new organization with contacts
     */
    async createOrganization(userId, data) {
        try {
            // Validate user exists
            const user = await index_1.User.findById(userId);
            if (!user) {
                throw new errors_1.NotFoundError('User');
            }
            // Check for duplicate company name
            const existing = await index_1.Organization.findOne({
                companyName: data.companyName.trim(),
            });
            if (existing) {
                throw new errors_1.ConflictError(`Organization "${data.companyName}" already exists`);
            }
            // Initialize contacts with validation status
            const contacts = data.contacts.map((contact) => ({
                name: contact.name.trim(),
                email: contact.email.toLowerCase().trim(),
                phone: contact.phone?.trim(),
                position: contact.position?.trim(),
                department: contact.department?.trim(),
                emailValidation: {
                    status: index_2.EmailValidationStatus.UNKNOWN,
                },
                emailSendStatus: {
                    selected: false,
                    campaignIds: [],
                    firstValidContactUsed: false,
                },
                activity: {
                    emailsSent: 0,
                    emailsDelivered: 0,
                    emailsOpened: 0,
                    emailsClicked: 0,
                    emailsFailed: 0,
                    bounceCount: 0,
                },
            }));
            // Create organization
            const organization = new index_1.Organization({
                companyName: data.companyName.trim(),
                industry: data.industry?.trim(),
                website: data.website?.trim(),
                createdBy: userId,
                contacts,
                organizationStatus: {
                    totalContacts: contacts.length,
                    validContacts: 0,
                    invalidContacts: 0,
                    allContactsInvalid: false,
                    processingStatus: 'pending',
                },
            });
            await organization.save();
            logger_1.default.info(`Organization created: ${organization.companyName} by user ${userId}`);
            return organization.toObject();
        }
        catch (error) {
            logger_1.default.error('Error creating organization:', error);
            throw error;
        }
    }
    /**
     * Get organization by ID
     */
    async getOrganizationById(organizationId) {
        try {
            const organization = await index_1.Organization.findById(organizationId);
            if (!organization) {
                throw new errors_1.NotFoundError('Organization');
            }
            return organization.toObject();
        }
        catch (error) {
            logger_1.default.error('Error fetching organization:', error);
            throw error;
        }
    }
    /**
     * Get all organizations with pagination
     */
    async getOrganizations(userId, page = 1, limit = 20, search) {
        try {
            const query = { createdBy: userId };
            if (search) {
                query.companyName = { $regex: search, $options: 'i' };
            }
            const skip = (page - 1) * limit;
            const organizations = await index_1.Organization.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });
            const total = await index_1.Organization.countDocuments(query);
            return {
                organizations: organizations.map((org) => org.toObject()),
                total,
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching organizations:', error);
            throw error;
        }
    }
    /**
     * Update organization
     */
    async updateOrganization(organizationId, data) {
        try {
            const organization = await index_1.Organization.findById(organizationId);
            if (!organization) {
                throw new errors_1.NotFoundError('Organization');
            }
            // Check for duplicate company name if changing
            if (data.companyName && data.companyName !== organization.companyName) {
                const existing = await index_1.Organization.findOne({
                    companyName: data.companyName.trim(),
                    _id: { $ne: organizationId },
                });
                if (existing) {
                    throw new errors_1.ConflictError(`Organization "${data.companyName}" already exists`);
                }
            }
            // Update fields
            if (data.companyName)
                organization.companyName = data.companyName.trim();
            if (data.industry)
                organization.industry = data.industry.trim();
            if (data.website)
                organization.website = data.website.trim();
            await organization.save();
            logger_1.default.info(`Organization updated: ${organizationId}`);
            return organization.toObject();
        }
        catch (error) {
            logger_1.default.error('Error updating organization:', error);
            throw error;
        }
    }
    /**
     * Delete organization
     */
    async deleteOrganization(organizationId) {
        try {
            const result = await index_1.Organization.findByIdAndDelete(organizationId);
            if (!result) {
                throw new errors_1.NotFoundError('Organization');
            }
            logger_1.default.info(`Organization deleted: ${organizationId}`);
        }
        catch (error) {
            logger_1.default.error('Error deleting organization:', error);
            throw error;
        }
    }
    /**
     * Add contact to organization
     */
    async addContact(organizationId, contactData) {
        try {
            const organization = await index_1.Organization.findById(organizationId);
            if (!organization) {
                throw new errors_1.NotFoundError('Organization');
            }
            // Check for duplicate email in this organization
            const emailExists = organization.contacts.some((c) => c.email.toLowerCase() === contactData.email.toLowerCase());
            if (emailExists) {
                throw new errors_1.ConflictError('Email already exists in this organization');
            }
            // Create new contact
            const newContact = {
                name: contactData.name.trim(),
                email: contactData.email.toLowerCase().trim(),
                phone: contactData.phone?.trim(),
                position: contactData.position?.trim(),
                department: contactData.department?.trim(),
                emailValidation: {
                    status: index_2.EmailValidationStatus.UNKNOWN,
                },
                emailSendStatus: {
                    selected: false,
                    campaignIds: [],
                    firstValidContactUsed: false,
                },
                activity: {
                    emailsSent: 0,
                    emailsDelivered: 0,
                    emailsOpened: 0,
                    emailsClicked: 0,
                    emailsFailed: 0,
                    bounceCount: 0,
                },
            };
            organization.contacts.push(newContact);
            organization.organizationStatus.totalContacts = organization.contacts.length;
            await organization.save();
            logger_1.default.info(`Contact added to organization: ${organizationId}`);
            return organization.toObject();
        }
        catch (error) {
            logger_1.default.error('Error adding contact:', error);
            throw error;
        }
    }
    /**
     * Update contact in organization
     */
    async updateContact(organizationId, contactId, contactData) {
        try {
            const organization = await index_1.Organization.findById(organizationId);
            if (!organization) {
                throw new errors_1.NotFoundError('Organization');
            }
            const contact = organization.contacts.find((c) => c._id?.toString() === contactId);
            if (!contact) {
                throw new errors_1.NotFoundError('Contact');
            }
            // Check for duplicate email if changing
            if (contactData.email && contactData.email.toLowerCase() !== contact.email) {
                const nextEmail = contactData.email.toLowerCase();
                const emailExists = organization.contacts.some((c) => c._id?.toString() !== contactId && c.email.toLowerCase() === nextEmail);
                if (emailExists) {
                    throw new errors_1.ConflictError('Email already exists in this organization');
                }
                contact.email = nextEmail.trim();
            }
            if (contactData.name)
                contact.name = contactData.name.trim();
            if (contactData.phone !== undefined)
                contact.phone = contactData.phone?.trim();
            if (contactData.position !== undefined)
                contact.position = contactData.position?.trim();
            if (contactData.department !== undefined)
                contact.department = contactData.department?.trim();
            await organization.save();
            logger_1.default.info(`Contact updated in organization: ${organizationId}`);
            return organization.toObject();
        }
        catch (error) {
            logger_1.default.error('Error updating contact:', error);
            throw error;
        }
    }
    /**
     * Delete contact from organization
     */
    async deleteContact(organizationId, contactId) {
        try {
            const organization = await index_1.Organization.findById(organizationId);
            if (!organization) {
                throw new errors_1.NotFoundError('Organization');
            }
            const initialLength = organization.contacts.length;
            organization.contacts = organization.contacts.filter((c) => c._id?.toString() !== contactId);
            if (organization.contacts.length === initialLength) {
                throw new errors_1.NotFoundError('Contact');
            }
            organization.organizationStatus.totalContacts = organization.contacts.length;
            await organization.save();
            logger_1.default.info(`Contact deleted from organization: ${organizationId}`);
            return organization.toObject();
        }
        catch (error) {
            logger_1.default.error('Error deleting contact:', error);
            throw error;
        }
    }
    /**
     * Validate all contacts in an organization and update their status
     */
    async validateOrganizationContacts(organizationId, validationResults) {
        try {
            const organization = await index_1.Organization.findById(organizationId);
            if (!organization) {
                throw new errors_1.NotFoundError('Organization');
            }
            let validCount = 0;
            let invalidCount = 0;
            // Update validation status for each contact
            organization.contacts.forEach((contact) => {
                const result = validationResults.find((r) => r.email.toLowerCase() === contact.email.toLowerCase());
                if (result) {
                    contact.emailValidation.status = result.status;
                    contact.emailValidation.validatedAt = new Date();
                    contact.emailValidation.reason = result.reason;
                    if (result.status === index_2.EmailValidationStatus.VALID) {
                        validCount++;
                    }
                    else {
                        invalidCount++;
                    }
                }
            });
            // Update organization statistics
            organization.organizationStatus.validContacts = validCount;
            organization.organizationStatus.invalidContacts = invalidCount;
            organization.organizationStatus.allContactsInvalid = validCount === 0 && organization.contacts.length > 0;
            organization.organizationStatus.lastProcessedAt = new Date();
            organization.organizationStatus.processingStatus = 'completed';
            await organization.save();
            logger_1.default.info(`Organization contacts validated: ${organizationId} (${validCount} valid, ${invalidCount} invalid)`);
            return organization.toObject();
        }
        catch (error) {
            logger_1.default.error('Error validating organization contacts:', error);
            throw error;
        }
    }
}
exports.default = new OrganizationService();
//# sourceMappingURL=OrganizationService.js.map