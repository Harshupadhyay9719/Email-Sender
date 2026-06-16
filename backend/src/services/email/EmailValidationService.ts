import { validate } from 'deep-email-validator';
import { Organization } from '../../models/index';
import { EmailValidationStatus } from '../../types/index';
import logger from '../../utils/logger';
import config from '../../config/env';

export interface EmailValidationResult {
  email: string;
  status: EmailValidationStatus;
  reason?: string;
  validatedAt: Date;
}

class EmailValidationService {
  async validateEmail(email: string): Promise<EmailValidationResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const validatedAt = new Date();

    if (!config.enable_email_validation) {
      return {
        email: normalizedEmail,
        status: EmailValidationStatus.VALID,
        reason: 'Email validation disabled',
        validatedAt,
      };
    }

    try {
      const result = await validate({
        email: normalizedEmail,
        sender: 'noreply@gmail.com',
        validateRegex: true,
        validateMx: true,
        validateTypo: true,
        validateDisposable: true,
        validateSMTP: false,
      });

      return {
        email: normalizedEmail,
        status: result.valid ? EmailValidationStatus.VALID : this.mapFailureToStatus(result.reason),
        reason: result.valid ? undefined : this.formatReason(result.reason, result.validators),
        validatedAt,
      };
    } catch (error) {
      logger.warn(`Email validation failed for ${normalizedEmail}:`, error);
      return {
        email: normalizedEmail,
        status: EmailValidationStatus.UNKNOWN,
        reason: 'Validation provider error',
        validatedAt,
      };
    }
  }

  async validateOrganizationContacts(organizationId: string): Promise<EmailValidationResult[]> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return [];
    }

    organization.organizationStatus.processingStatus = 'processing';
    await organization.save();

    const results: EmailValidationResult[] = [];

    for (const contact of organization.contacts) {
      const currentStatus = contact.emailValidation?.status;
      if (currentStatus === EmailValidationStatus.VALID || currentStatus === EmailValidationStatus.INVALID) {
        results.push({
          email: contact.email || '',
          status: currentStatus,
          reason: contact.emailValidation.reason,
          validatedAt: contact.emailValidation.validatedAt || new Date(),
        });
        continue;
      }

      const result = await this.validateEmail(contact.email || '');
      contact.emailValidation = {
        status: result.status,
        reason: result.reason,
        validatedAt: result.validatedAt,
      };
      results.push(result);
    }

    const validContacts = organization.contacts.filter(
      (contact) => contact.emailValidation.status === EmailValidationStatus.VALID
    ).length;
    const invalidContacts = organization.contacts.filter(
      (contact) => contact.emailValidation.status === EmailValidationStatus.INVALID
    ).length;

    organization.organizationStatus = {
      totalContacts: organization.contacts.length,
      validContacts,
      invalidContacts,
      allContactsInvalid: organization.contacts.length > 0 && validContacts === 0,
      lastProcessedAt: new Date(),
      processingStatus: 'completed',
    };

    await organization.save();
    return results;
  }

  private mapFailureToStatus(reason?: string): EmailValidationStatus {
    if (reason === 'disposable' || reason === 'smtp') {
      return EmailValidationStatus.RISKY;
    }

    if (reason === 'regex' || reason === 'typo' || reason === 'mx') {
      return EmailValidationStatus.INVALID;
    }

    return EmailValidationStatus.UNKNOWN;
  }

  private formatReason(reason?: string, validators?: Record<string, any>): string {
    if (!reason) {
      return 'Email did not pass validation';
    }

    const validatorReason = validators?.[reason]?.reason;
    return validatorReason ? `${reason}: ${validatorReason}` : reason;
  }
}

export default new EmailValidationService();
