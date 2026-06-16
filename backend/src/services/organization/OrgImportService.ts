/**
 * OrgImportService
 * Imports an Excel file into a single named organization using dynamic column mappings.
 */

import fs from 'fs';
import { Organization, ImportLog } from '../../models/index';
import { EmailValidationStatus } from '../../types/index';
import logger from '../../utils/logger';
import { ValidationError } from '../../utils/errors';
import ColumnMappingService, {
  ColumnMapping,
  MappedContact,
  MappedOrgFields,
  MappedParseResult,
  SuggestedMapping,
} from '../excel/ColumnMappingService';

export type DuplicateStrategy = 'merge' | 'replace';

export interface OrgExistsResult {
  exists: boolean;
  organizationId?: string;
  existingContactCount?: number;
}

export interface OrgImportConfirmResult {
  organization: {
    _id: string;
    companyName: string;
    totalContacts: number;
  };
  contactsAdded: number;
  duplicatesSkipped: number;
  invalidRows: number;
  strategy: 'create' | 'merge' | 'replace';
  warnings: string[];
}

class OrgImportService {
  extractColumns(filePath: string): string[] {
    return ColumnMappingService.extractColumns(filePath);
  }

  suggestMappings(columns: string[]): SuggestedMapping[] {
    return ColumnMappingService.suggestMappings(columns);
  }

  getSampleValues(filePath: string): Record<string, string[]> {
    return ColumnMappingService.getSampleValues(filePath);
  }

  parseWithMappings(filePath: string, mappings: ColumnMapping[]): MappedParseResult {
    return ColumnMappingService.parseWithMappings(filePath, mappings);
  }

  async checkOrgExists(userId: string, orgName: string): Promise<OrgExistsResult> {
    const org = await Organization.findOne({
      companyName: { $regex: `^${this.escapeRegex(orgName.trim())}$`, $options: 'i' },
      createdBy: userId,
    });

    if (!org) {
      return { exists: false };
    }

    return {
      exists: true,
      organizationId: (org._id as any).toString(),
      existingContactCount: (org.contacts as any[]).length,
    };
  }

  async confirmImport(
    userId: string,
    orgName: string,
    filePath: string,
    mappings: ColumnMapping[],
    strategy: DuplicateStrategy | null,
    importLogId: string
  ): Promise<OrgImportConfirmResult> {
    const trimmedName = orgName.trim();
    const parsed = this.parseWithMappings(filePath, mappings);
    const orgCheck = await this.checkOrgExists(userId, trimmedName);

    let appliedStrategy: 'create' | 'merge' | 'replace';

    if (!orgCheck.exists) {
      appliedStrategy = 'create';
    } else {
      if (!strategy) {
        throw new ValidationError(
          'duplicateStrategy is required when organization already exists (merge or replace)'
        );
      }
      appliedStrategy = strategy;
    }

    let org = await Organization.findOne({
      companyName: { $regex: `^${this.escapeRegex(trimmedName)}$`, $options: 'i' },
      createdBy: userId,
    });

    if (!org) {
      org = new Organization({
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
    } else if (appliedStrategy === 'replace') {
      org.contacts = [];
    }

    this.applyOrgFields(org, parsed.orgFields);

    const existingEmails = new Set<string>(
      appliedStrategy === 'replace'
        ? []
        : (org.contacts as any[])
            .map((c: any) => (c.email || '').toLowerCase())
            .filter(Boolean)
    );

    let contactsAdded = 0;
    let duplicatesSkipped = 0;
    const warnings: string[] = [...parsed.warnings];

    for (const raw of parsed.contacts) {
      const emailKey = raw.email?.toLowerCase();

      if (emailKey && existingEmails.has(emailKey)) {
        duplicatesSkipped++;
        warnings.push(`Duplicate email skipped: "${raw.email}"`);
        continue;
      }

      if (emailKey) existingEmails.add(emailKey);
      (org.contacts as any[]).push(this.buildContactDoc(raw));
      contactsAdded++;
    }

    org.organizationStatus = {
      ...org.organizationStatus,
      totalContacts: (org.contacts as any[]).length,
    };

    await org.save();

    const isNew = appliedStrategy === 'create';
    logger.info(
      `OrgImport: "${trimmedName}" — ${appliedStrategy}, +${contactsAdded} contacts, ${duplicatesSkipped} dupes skipped`
    );

    const importLog = await ImportLog.findById(importLogId);
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
        _id: (org._id as any).toString(),
        companyName: org.companyName,
        totalContacts: (org.contacts as any[]).length,
      },
      contactsAdded,
      duplicatesSkipped,
      invalidRows: parsed.invalidRows,
      strategy: appliedStrategy,
      warnings,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private applyOrgFields(org: any, orgFields: MappedOrgFields): void {
    if (orgFields.website && !org.website) org.website = orgFields.website;
    if (orgFields.industry && !org.industry) org.industry = orgFields.industry;
    if (orgFields.tags?.length && (!org.tags || org.tags.length === 0)) {
      org.tags = orgFields.tags;
    }
  }

  private buildContactDoc(raw: MappedContact) {
    const doc: Record<string, any> = {
      name: raw.name?.trim() || 'Unknown',
      email: raw.email?.toLowerCase().trim() || '',
      emailValidation: { status: EmailValidationStatus.UNKNOWN },
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

    if (raw.companyName) doc.companyName = raw.companyName.trim();
    if (raw.phone) doc.phone = raw.phone.trim();
    if (raw.position) doc.position = raw.position.trim();
    if (raw.department) doc.department = raw.department.trim();
    if (raw.linkedin) doc.linkedin = raw.linkedin.trim();
    if (raw.city) doc.city = raw.city.trim();
    if (raw.notes) doc.notes = raw.notes.trim();

    return doc;
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private deleteFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}

export default new OrgImportService();
