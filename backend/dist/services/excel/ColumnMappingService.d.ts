/**
 * ColumnMappingService
 * Dynamic Excel column detection, auto-mapping, and row parsing.
 */
export type MappableField = 'contact.name' | 'contact.companyName' | 'contact.email' | 'contact.phone' | 'contact.position' | 'contact.department' | 'contact.linkedin' | 'contact.city' | 'contact.notes' | 'org.website' | 'org.industry' | 'org.tags' | 'ignore';
export interface ColumnMapping {
    excelColumn: string;
    field: MappableField;
    confidence?: number;
}
export interface SuggestedMapping {
    excelColumn: string;
    field: MappableField;
    confidence: number;
}
export interface MappedContact {
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    position?: string;
    department?: string;
    linkedin?: string;
    city?: string;
    notes?: string;
}
export interface MappedOrgFields {
    website?: string;
    industry?: string;
    tags?: string[];
}
export interface MappedParseResult {
    contacts: MappedContact[];
    orgFields: MappedOrgFields;
    warnings: string[];
    totalRows: number;
    validContacts: number;
    invalidRows: number;
    duplicateEmailsInFile: number;
    sampleContacts: MappedContact[];
    mappedFields: string[];
    ignoredColumns: string[];
}
declare class ColumnMappingService {
    readonly fieldOptions: {
        value: MappableField;
        label: string;
    }[];
    extractColumns(filePath: string): string[];
    suggestMappings(columns: string[]): SuggestedMapping[];
    validateMappings(mappings: ColumnMapping[]): void;
    parseWithMappings(filePath: string, mappings: ColumnMapping[]): MappedParseResult;
    createTemplate(type: 'basic' | 'sales-lead' | 'b2b' | 'custom'): Buffer;
    listTemplates(): {
        id: string;
        name: string;
        description: string;
    }[];
    private readFirstSheet;
    private scoreColumn;
    private matchScore;
    private normalize;
    private getCellValue;
    private applyContactField;
    private applyOrgField;
}
declare const _default: ColumnMappingService;
export default _default;
//# sourceMappingURL=ColumnMappingService.d.ts.map