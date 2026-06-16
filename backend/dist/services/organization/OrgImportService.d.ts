/**
 * OrgImportService
 * Imports an Excel file into a single named organization using dynamic column mappings.
 */
import { ColumnMapping, MappedParseResult, SuggestedMapping } from '../excel/ColumnMappingService';
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
declare class OrgImportService {
    extractColumns(filePath: string): string[];
    suggestMappings(columns: string[]): SuggestedMapping[];
    parseWithMappings(filePath: string, mappings: ColumnMapping[]): MappedParseResult;
    checkOrgExists(userId: string, orgName: string): Promise<OrgExistsResult>;
    confirmImport(userId: string, orgName: string, filePath: string, mappings: ColumnMapping[], strategy: DuplicateStrategy | null, importLogId: string): Promise<OrgImportConfirmResult>;
    private applyOrgFields;
    private buildContactDoc;
    private escapeRegex;
    private deleteFile;
}
declare const _default: OrgImportService;
export default _default;
//# sourceMappingURL=OrgImportService.d.ts.map