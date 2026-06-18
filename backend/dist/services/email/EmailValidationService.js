"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const deep_email_validator_1 = require("deep-email-validator");
const index_1 = require("../../models/index");
const index_2 = require("../../types/index");
const logger_1 = __importDefault(require("../../utils/logger"));
const env_1 = __importDefault(require("../../config/env"));
class EmailValidationService {
    async validateEmail(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const validatedAt = new Date();
        if (!env_1.default.enable_email_validation) {
            return {
                email: normalizedEmail,
                status: index_2.EmailValidationStatus.VALID,
                reason: 'Email validation disabled',
                validatedAt,
            };
        }
        try {
            const result = await (0, deep_email_validator_1.validate)({
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
                status: result.valid ? index_2.EmailValidationStatus.VALID : this.mapFailureToStatus(result.reason),
                reason: result.valid ? undefined : this.formatReason(result.reason, result.validators),
                validatedAt,
            };
        }
        catch (error) {
            logger_1.default.warn(`Email validation failed for ${normalizedEmail}:`, error);
            return {
                email: normalizedEmail,
                status: index_2.EmailValidationStatus.UNKNOWN,
                reason: 'Validation provider error',
                validatedAt,
            };
        }
    }
    async validateOrganizationContacts(organizationId) {
        const organization = await index_1.Organization.findById(organizationId);
        if (!organization) {
            return [];
        }
        organization.organizationStatus.processingStatus = 'processing';
        await organization.save();
        const results = [];
        for (const contact of organization.contacts) {
            const currentStatus = contact.emailValidation?.status;
            if (currentStatus === index_2.EmailValidationStatus.VALID || currentStatus === index_2.EmailValidationStatus.INVALID) {
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
        const validContacts = organization.contacts.filter((contact) => contact.emailValidation.status === index_2.EmailValidationStatus.VALID).length;
        const invalidContacts = organization.contacts.filter((contact) => contact.emailValidation.status === index_2.EmailValidationStatus.INVALID).length;
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
    mapFailureToStatus(reason) {
        if (reason === 'disposable' || reason === 'smtp') {
            return index_2.EmailValidationStatus.RISKY;
        }
        if (reason === 'regex' || reason === 'typo' || reason === 'mx') {
            return index_2.EmailValidationStatus.INVALID;
        }
        return index_2.EmailValidationStatus.UNKNOWN;
    }
    formatReason(reason, validators) {
        if (!reason) {
            return 'Email did not pass validation';
        }
        const validatorReason = validators?.[reason]?.reason;
        return validatorReason ? `${reason}: ${validatorReason}` : reason;
    }
}
exports.default = new EmailValidationService();
