/**
 * Excel Parser Service
 * Handles parsing and validating Excel files for organization imports
 */
export interface ParsedExcelData {
    headers: string[];
    rows: Record<string, any>[];
    duplicateOrganizations: string[];
    duplicateEmails: string[];
    validationErrors: Array<{
        rowNumber: number;
        message: string;
        rowData: Record<string, any>;
    }>;
}
export interface ExcelContactData {
    name: string;
    email: string;
    phone?: string;
}
declare class ExcelParserService {
    private readonly REQUIRED_COLUMNS;
    private readonly CONTACT_PATTERN;
    /**
     * Parse Excel file and extract data
     */
    parseExcelFile(filePath: string): Promise<ParsedExcelData>;
    /**
     * Validate and process parsed Excel data
     */
    private validateAndProcessData;
    /**
     * Extract contact information from a row
     */
    private extractContacts;
    /**
     * Extract value from row by column name (case-insensitive)
     */
    private extractValue;
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Create sample Excel template
     */
    createSampleTemplate(): Buffer;
}
declare const _default: ExcelParserService;
export default _default;
//# sourceMappingURL=ExcelParserService.d.ts.map