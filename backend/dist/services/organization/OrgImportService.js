"use strict";
/**
 * OrgImportService
 * Imports an Excel file into a single named organization using dynamic column mappings.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const index_1 = require("../../models/index");
const index_2 = require("../../types/index");
const logger_1 = __importDefault(require("../../utils/logger"));
const errors_1 = require("../../utils/errors");
const ColumnMappingService_1 = __importDefault(require("../excel/ColumnMappingService"));
class OrgImportService {
    extractColumns(filePath) {
        return ColumnMappingService_1.default.extractColumns(filePath);
    }
    suggestMappings(columns) {
        return ColumnMappingService_1.default.suggestMappings(columns);
    }
    getSampleValues(filePath) {
        return ColumnMappingService_1.default.getSampleValues(filePath);
    }
    parseWithMappings(filePath, mappings) {
        return ColumnMappingService_1.default.parseWithMappings(filePath, mappings);
    }
    async checkOrgExists(userId, orgName) {
        const org = await index_1.Organization.findOne({
            companyName: { $regex: `^${this.escapeRegex(orgName.trim())}$`, $options: 'i' },
            createdBy: userId,
        });
        if (!org) {
            return { exists: false };
        }
        return {
            exists: true,
            organizationId: org._id.toString(),
            existingContactCount: org.contacts.length,
        };
    }
    async confirmImport(userId, orgName, filePath, mappings, strategy, importLogId) {
        const trimmedName = orgName.trim();
        const parsed = this.parseWithMappings(filePath, mappings);
        const orgCheck = await this.checkOrgExists(userId, trimmedName);
        let appliedStrategy;
        if (!orgCheck.exists) {
            appliedStrategy = 'create';
        }
        else {
            if (!strategy) {
                throw new errors_1.ValidationError('duplicateStrategy is required when organization already exists (merge or replace)');
            }
            appliedStrategy = strategy;
        }
        let org = await index_1.Organization.findOne({
            companyName: { $regex: `^${this.escapeRegex(trimmedName)}$`, $options: 'i' },
            createdBy: userId,
        });
        if (!org) {
            org = new index_1.Organization({
                companyName: trimmedName,
                createdBy: userId,
                contacts: [],
                organizationStatus: {
                    totalContacts: 0,
                    validContacts: 0,
                    invalidContacts: 0,
                    allContactsInvalid: false,
                    processingStatus: 'pending',
                },
            });
        }
        else if (appliedStrategy === 'replace') {
            org.contacts = [];
        }
        this.applyOrgFields(org, parsed.orgFields);
        const existingEmails = new Set(appliedStrategy === 'replace'
            ? []
            : org.contacts
                .map((c) => (c.email || '').toLowerCase())
                .filter(Boolean));
        let contactsAdded = 0;
        let duplicatesSkipped = 0;
        const warnings = [...parsed.warnings];
        for (const raw of parsed.contacts) {
            const emailKey = raw.email?.toLowerCase();
            if (emailKey && existingEmails.has(emailKey)) {
                duplicatesSkipped++;
                warnings.push(`Duplicate email skipped: "${raw.email}"`);
                continue;
            }
            if (emailKey)
                existingEmails.add(emailKey);
            org.contacts.push(this.buildContactDoc(raw));
            contactsAdded++;
        }
        org.organizationStatus = {
            ...org.organizationStatus,
            totalContacts: org.contacts.length,
        };
        await org.save();
        const isNew = appliedStrategy === 'create';
        logger_1.default.info(`OrgImport: "${trimmedName}" — ${appliedStrategy}, +${contactsAdded} contacts, ${duplicatesSkipped} dupes skipped`);
        const importLog = await index_1.ImportLog.findById(importLogId);
        if (importLog) {
            importLog.importStatus = 'completed';
            importLog.completedAt = new Date();
            importLog.duplicateStrategy = strategy ?? undefined;
            importLog.columnMappings = mappings;
            importLog.results = {
                totalRows: parsed.totalRows,
                successfulImports: contactsAdded,
                failedImports: parsed.invalidRows,
                duplicateOrganizations: isNew ? [] : [trimmedName],
                duplicateEmails: [],
                validationErrors: [],
            };
            importLog.organizationsCreated = isNew ? [org._id] : importLog.organizationsCreated;
            await importLog.save();
        }
        this.deleteFile(filePath);
        return {
            organization: {
                _id: org._id.toString(),
                companyName: org.companyName,
                totalContacts: org.contacts.length,
            },
            contactsAdded,
            duplicatesSkipped,
            invalidRows: parsed.invalidRows,
            strategy: appliedStrategy,
            warnings,
        };
    }
    // ─── Helpers ───────────────────────────────────────────────────────────────
    applyOrgFields(org, orgFields) {
        if (orgFields.website && !org.website)
            org.website = orgFields.website;
        if (orgFields.industry && !org.industry)
            org.industry = orgFields.industry;
        if (orgFields.tags?.length && (!org.tags || org.tags.length === 0)) {
            org.tags = orgFields.tags;
        }
    }
    buildContactDoc(raw) {
        const doc = {
            name: raw.name?.trim() || 'Unknown',
            email: raw.email?.toLowerCase().trim() || '',
            emailValidation: { status: index_2.EmailValidationStatus.UNKNOWN },
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
        if (raw.companyName)
            doc.companyName = raw.companyName.trim();
        if (raw.phone)
            doc.phone = raw.phone.trim();
        if (raw.position)
            doc.position = raw.position.trim();
        if (raw.department)
            doc.department = raw.department.trim();
        if (raw.linkedin)
            doc.linkedin = raw.linkedin.trim();
        if (raw.city)
            doc.city = raw.city.trim();
        if (raw.notes)
            doc.notes = raw.notes.trim();
        return doc;
    }
    escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    deleteFile(filePath) {
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch {
            /* ignore */
        }
    }
}
exports.default = new OrgImportService();
