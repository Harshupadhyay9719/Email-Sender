"use strict";
/**
 * Excel Parser Service
 * Handles parsing and validating Excel files for organization imports
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const XLSX = __importStar(require("xlsx"));
const fs_1 = __importDefault(require("fs"));
const index_1 = require("../../models/index");
const errors_1 = require("../../utils/errors");
const logger_1 = __importDefault(require("../../utils/logger"));
class ExcelParserService {
    constructor() {
        this.REQUIRED_COLUMNS = ['Company Name', 'Name1', 'Email1'];
        this.CONTACT_PATTERN = /^(Name|Email|Phone)(\d+)$/i;
    }
    /**
     * Parse Excel file and extract data
     */
    async parseExcelFile(filePath) {
        try {
            if (!fs_1.default.existsSync(filePath)) {
                throw new errors_1.ValidationError(`File not found: ${filePath}`);
            }
            // Read workbook
            const workbook = XLSX.readFile(filePath);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!worksheet) {
                throw new errors_1.ValidationError('Excel file has no sheets');
            }
            // Parse sheet to JSON
            const data = XLSX.utils.sheet_to_json(worksheet, {
                defval: '',
                blankrows: false,
            });
            if (data.length === 0) {
                throw new errors_1.ValidationError('Excel file is empty');
            }
            // Validate and process data
            const result = await this.validateAndProcessData(data);
            return result;
        }
        catch (error) {
            logger_1.default.error('Error parsing Excel file:', error);
            throw error;
        }
    }
    /**
     * Validate and process parsed Excel data
     */
    async validateAndProcessData(data) {
        const headers = Object.keys(data[0] || {});
        const rows = [];
        const duplicateOrganizations = new Set();
        const duplicateEmails = new Set();
        const validationErrors = [];
        // Get existing organizations and emails in database
        const existingOrgs = await index_1.Organization.find({}, { companyName: 1 });
        const existingOrgNames = new Set(existingOrgs.map((org) => org.companyName.toLowerCase()));
        const seenEmails = new Set();
        const seenOrgNames = new Set();
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2; // Account for header row
            try {
                // Validate company name
                const companyName = this.extractValue(row, 'Company Name');
                if (!companyName) {
                    validationErrors.push({
                        rowNumber,
                        message: 'Company Name is required',
                        rowData: row,
                    });
                    continue;
                }
                // Check for duplicates within file
                if (seenOrgNames.has(companyName.toLowerCase())) {
                    duplicateOrganizations.add(companyName);
                    validationErrors.push({
                        rowNumber,
                        message: `Duplicate organization: "${companyName}"`,
                        rowData: row,
                    });
                    continue;
                }
                // Check for duplicates in database
                if (existingOrgNames.has(companyName.toLowerCase())) {
                    duplicateOrganizations.add(companyName);
                    validationErrors.push({
                        rowNumber,
                        message: `Organization already exists: "${companyName}"`,
                        rowData: row,
                    });
                    continue;
                }
                seenOrgNames.add(companyName.toLowerCase());
                // Extract contacts
                const contacts = this.extractContacts(row);
                if (contacts.length === 0) {
                    validationErrors.push({
                        rowNumber,
                        message: 'At least one contact (Name1, Email1) is required',
                        rowData: row,
                    });
                    continue;
                }
                // Validate contacts
                let hasValidContact = false;
                const validatedContacts = [];
                for (const contact of contacts) {
                    // Validate email
                    if (!this.isValidEmail(contact.email)) {
                        validationErrors.push({
                            rowNumber,
                            message: `Invalid email format: "${contact.email}" for contact "${contact.name}"`,
                            rowData: row,
                        });
                        continue;
                    }
                    // Check for duplicate emails
                    if (seenEmails.has(contact.email.toLowerCase())) {
                        duplicateEmails.add(contact.email);
                        validationErrors.push({
                            rowNumber,
                            message: `Duplicate email: "${contact.email}"`,
                            rowData: row,
                        });
                        continue;
                    }
                    seenEmails.add(contact.email.toLowerCase());
                    validatedContacts.push(contact);
                    hasValidContact = true;
                }
                if (!hasValidContact) {
                    validationErrors.push({
                        rowNumber,
                        message: 'No valid contacts found in this row',
                        rowData: row,
                    });
                    continue;
                }
                // Add valid row
                rows.push({
                    companyName,
                    industry: this.extractValue(row, 'Industry'),
                    website: this.extractValue(row, 'Website'),
                    contacts: validatedContacts,
                });
            }
            catch (error) {
                validationErrors.push({
                    rowNumber,
                    message: error.message || 'Unknown error',
                    rowData: row,
                });
            }
        }
        return {
            headers,
            rows,
            duplicateOrganizations: Array.from(duplicateOrganizations),
            duplicateEmails: Array.from(duplicateEmails),
            validationErrors,
        };
    }
    /**
     * Extract contact information from a row
     */
    extractContacts(row) {
        const contacts = [];
        const contactGroups = new Map();
        // Group contacts by number
        Object.entries(row).forEach(([key, value]) => {
            const match = key.match(this.CONTACT_PATTERN);
            if (match && value) {
                const [_, fieldType, contactNum] = match;
                const num = parseInt(contactNum, 10);
                if (!contactGroups.has(num)) {
                    contactGroups.set(num, {});
                }
                const group = contactGroups.get(num);
                const fieldKey = fieldType.toLowerCase();
                if (fieldKey === 'name')
                    group.name = value.toString().trim();
                if (fieldKey === 'email')
                    group.email = value.toString().toLowerCase().trim();
                if (fieldKey === 'phone')
                    group.phone = value.toString().trim();
            }
        });
        // Build contacts array
        Array.from(contactGroups.entries())
            .sort(([numA], [numB]) => numA - numB)
            .forEach(([_, contact]) => {
            if (contact.name && contact.email) {
                contacts.push({
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                });
            }
        });
        return contacts;
    }
    /**
     * Extract value from row by column name (case-insensitive)
     */
    extractValue(row, columnName) {
        const key = Object.keys(row).find((k) => k.toLowerCase() === columnName.toLowerCase());
        return key ? row[key]?.toString().trim() : '';
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Create sample Excel template
     */
    createSampleTemplate() {
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Company Name', 'Industry', 'Website', 'Name1', 'Email1', 'Phone1', 'Name2', 'Email2', 'Phone2', 'Name3', 'Email3', 'Phone3'],
            [
                'ABC Logistics',
                'Logistics',
                'www.abc-logistics.com',
                'Rahul Sharma',
                'rahul@abc.com',
                '9999999999',
                'Amit Gupta',
                'amit@abc.com',
                '8888888888',
                'Priya Singh',
                'priya@abc.com',
                '7777777777',
            ],
            [
                'XYZ Warehousing',
                'Warehousing',
                'www.xyz-warehousing.com',
                'Mohit Jain',
                'mohit@xyz.com',
                '6666666666',
                '',
                '',
                '',
                '',
                '',
                '',
            ],
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Organizations');
        // Set column widths
        worksheet['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 20 },
            { wch: 12 },
            { wch: 15 },
            { wch: 20 },
            { wch: 12 },
            { wch: 15 },
            { wch: 20 },
            { wch: 12 },
        ];
        return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    }
}
exports.default = new ExcelParserService();
//# sourceMappingURL=ExcelParserService.js.map