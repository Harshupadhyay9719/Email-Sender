/**
 * Organization Service
 * Handles organization and contact management
 */

import { Organization, User } from '../../models/index';
import { OrganizationInterface, ContactInterface, EmailValidationStatus } from '../../types/index';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import logger from '../../utils/logger';

export interface CreateOrganizationInput {
  companyName: string;
  industry?: string;
  website?: string;
  contacts: Array<{
    name: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
  }>;
}

export interface UpdateOrganizationInput {
  companyName?: string;
  industry?: string;
  website?: string;
}

export interface CreateContactInput {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
}

class OrganizationService {
  /**
   * Create a new organization with contacts
   */
  async createOrganization(
    userId: string,
    data: CreateOrganizationInput
  ): Promise<OrganizationInterface> {
    try {
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Check for duplicate company name (scoped to user, case-insensitive)
      const existing = await Organization.findOne({
        companyName: {
          $regex: `^${data.companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          $options: 'i',
        },
        createdBy: userId,
      });

      if (existing) {
        throw new ConflictError(`Organization "${data.companyName}" already exists`);
      }

      // Initialize contacts with validation status
      const contacts: ContactInterface[] = data.contacts.map((contact) => ({
        name: contact.name.trim(),
        email: contact.email.toLowerCase().trim(),
        phone: contact.phone?.trim(),
        position: contact.position?.trim(),
        department: contact.department?.trim(),
        emailValidation: {
          status: EmailValidationStatus.UNKNOWN,
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
      const organization = new Organization({
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
      logger.info(`Organization created: ${organization.companyName} by user ${userId}`);

      return organization.toObject();
    } catch (error) {
      logger.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string): Promise<OrganizationInterface> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization');
      }

      return organization.toObject();
    } catch (error) {
      logger.error('Error fetching organization:', error);
      throw error;
    }
  }

  /**
   * Get all organizations with pagination
   */
  async getOrganizations(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ organizations: OrganizationInterface[]; total: number }> {
    try {
      const query: any = { createdBy: userId };

      if (search) {
        query.companyName = { $regex: search, $options: 'i' };
      }

      const skip = (page - 1) * limit;
      const organizations = await Organization.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Organization.countDocuments(query);

      return {
        organizations: organizations.map((org) => org.toObject()),
        total,
      };
    } catch (error) {
      logger.error('Error fetching organizations:', error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationInput
  ): Promise<OrganizationInterface> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization');
      }

      // Check for duplicate company name if changing (scoped to user, case-insensitive)
      if (data.companyName && data.companyName.toLowerCase() !== organization.companyName.toLowerCase()) {
        const existing = await Organization.findOne({
          companyName: {
            $regex: `^${data.companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            $options: 'i',
          },
          createdBy: organization.createdBy,
          _id: { $ne: organizationId },
        });

        if (existing) {
          throw new ConflictError(`Organization "${data.companyName}" already exists`);
        }
      }

      // Update fields
      if (data.companyName) organization.companyName = data.companyName.trim();
      if (data.industry) organization.industry = data.industry.trim();
      if (data.website) organization.website = data.website.trim();

      await organization.save();
      logger.info(`Organization updated: ${organizationId}`);

      return organization.toObject();
    } catch (error) {
      logger.error('Error updating organization:', error);
      throw error;
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId: string): Promise<void> {
    try {
      const result = await Organization.findByIdAndDelete(organizationId);

      if (!result) {
        throw new NotFoundError('Organization');
      }

      logger.info(`Organization deleted: ${organizationId}`);
    } catch (error) {
      logger.error('Error deleting organization:', error);
      throw error;
    }
  }

  /**
   * Add contact to organization
   */
  async addContact(organizationId: string, contactData: CreateContactInput): Promise<OrganizationInterface> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization');
      }

      // Check for duplicate email in this organization
      if (contactData.email) {
        const emailKey = contactData.email.toLowerCase();
        const emailExists = organization.contacts.some(
          (c) => (c.email || '').toLowerCase() === emailKey
        );

        if (emailExists) {
          throw new ConflictError('Email already exists in this organization');
        }
      }

      // Create new contact
      const newContact: ContactInterface = {
        name: contactData.name.trim(),
        email: contactData.email?.toLowerCase().trim() || '',
        phone: contactData.phone?.trim(),
        position: contactData.position?.trim(),
        department: contactData.department?.trim(),
        emailValidation: {
          status: EmailValidationStatus.UNKNOWN,
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
      logger.info(`Contact added to organization: ${organizationId}`);

      return organization.toObject();
    } catch (error) {
      logger.error('Error adding contact:', error);
      throw error;
    }
  }

  /**
   * Update contact in organization
   */
  async updateContact(
    organizationId: string,
    contactId: string,
    contactData: Partial<CreateContactInput>
  ): Promise<OrganizationInterface> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization');
      }

      const contact = organization.contacts.find((c) => c._id?.toString() === contactId);

      if (!contact) {
        throw new NotFoundError('Contact');
      }

      // Check for duplicate email if changing
      if (contactData.email && contactData.email.toLowerCase() !== contact.email) {
        const nextEmail = contactData.email.toLowerCase();
        const emailExists = organization.contacts.some(
          (c) => c._id?.toString() !== contactId && c.email.toLowerCase() === nextEmail
        );

        if (emailExists) {
          throw new ConflictError('Email already exists in this organization');
        }

        contact.email = nextEmail.trim();
      }

      if (contactData.name) contact.name = contactData.name.trim();
      if (contactData.phone !== undefined) contact.phone = contactData.phone?.trim();
      if (contactData.position !== undefined) contact.position = contactData.position?.trim();
      if (contactData.department !== undefined) contact.department = contactData.department?.trim();

      await organization.save();
      logger.info(`Contact updated in organization: ${organizationId}`);

      return organization.toObject();
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete contact from organization
   */
  async deleteContact(organizationId: string, contactId: string): Promise<OrganizationInterface> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization');
      }

      const initialLength = organization.contacts.length;
      organization.contacts = organization.contacts.filter((c) => c._id?.toString() !== contactId);

      if (organization.contacts.length === initialLength) {
        throw new NotFoundError('Contact');
      }

      organization.organizationStatus.totalContacts = organization.contacts.length;

      await organization.save();
      logger.info(`Contact deleted from organization: ${organizationId}`);

      return organization.toObject();
    } catch (error) {
      logger.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Validate all contacts in an organization and update their status
   */
  async validateOrganizationContacts(
    organizationId: string,
    validationResults: Array<{ email: string; status: EmailValidationStatus; reason?: string }>
  ): Promise<OrganizationInterface> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization');
      }

      let validCount = 0;
      let invalidCount = 0;

      // Update validation status for each contact
      organization.contacts.forEach((contact) => {
        const result = validationResults.find(
          (r) => r.email.toLowerCase() === contact.email.toLowerCase()
        );

        if (result) {
          contact.emailValidation.status = result.status;
          contact.emailValidation.validatedAt = new Date();
          contact.emailValidation.reason = result.reason;

          if (result.status === EmailValidationStatus.VALID) {
            validCount++;
          } else {
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
      logger.info(`Organization contacts validated: ${organizationId} (${validCount} valid, ${invalidCount} invalid)`);

      return organization.toObject();
    } catch (error) {
      logger.error('Error validating organization contacts:', error);
      throw error;
    }
  }
}

export default new OrganizationService();
