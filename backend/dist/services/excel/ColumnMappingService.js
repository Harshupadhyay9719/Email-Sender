"use strict";
/**
 * ColumnMappingService
 * Dynamic Excel column detection, auto-mapping, and row parsing.
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
const errors_1 = require("../../utils/errors");
const FIELD_LABELS = {
    'contact.name': 'Contact Name',
    'contact.companyName': 'Company Name',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.position': 'Position',
    'contact.department': 'Department',
    'contact.linkedin': 'LinkedIn',
    'contact.city': 'City',
    'contact.notes': 'Notes',
    'org.website': 'Website',
    'org.industry': 'Industry',
    'org.tags': 'Tags',
    ignore: 'Ignore',
};
const AUTO_MAP_RULES = [
    { field: 'contact.name', patterns: ['name', 'full name', 'contact name', 'person name', 'person', 'contact', 'full_name', 'contact_name'] },
    { field: 'contact.companyName', patterns: ['company', 'company name', 'organisation', 'organization', 'employer', 'org', 'firm', 'business'] },
    { field: 'contact.email', patterns: ['email', 'e-mail', 'email address', 'work email', 'mail', 'e mail', 'email_address', 'work_email'] },
    { field: 'contact.phone', patterns: ['phone', 'mobile', 'cell', 'phone number', 'mobile number', 'contact number', 'telephone', 'phone_number', 'mobile_number'] },
    { field: 'contact.position', patterns: ['position', 'designation', 'role', 'job title', 'title', 'job_title'] },
    { field: 'contact.department', patterns: ['department', 'dept', 'division', 'team'] },
    { field: 'contact.linkedin', patterns: ['linkedin', 'linkedin url', 'linked in', 'linkedin profile', 'linkedin_url'] },
    { field: 'contact.city', patterns: ['city', 'location', 'town', 'region'] },
    { field: 'contact.notes', patterns: ['notes', 'note', 'comments', 'comment', 'remark', 'remarks'] },
    { field: 'org.website', patterns: ['website', 'web', 'url', 'site', 'web site', 'company website'] },
    { field: 'org.industry', patterns: ['industry', 'sector', 'vertical'] },
    { field: 'org.tags', patterns: ['tags', 'tag', 'labels', 'label', 'categories'] },
];
class ColumnMappingService {
    fieldOptions = Object.entries(FIELD_LABELS).map(([value, label]) => ({
        value: value,
        label,
    }));
    extractColumns(filePath) {
        const sheet = this.readFirstSheet(filePath);
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', blankrows: false, header: 1 });
        if (rows.length === 0)
            throw new errors_1.ValidationError('Excel file is empty');
        const headerRow = rows[0];
        const columns = headerRow
            .map((cell) => String(cell ?? '').trim())
            .filter((col) => col.length > 0);
        if (columns.length === 0)
            throw new errors_1.ValidationError('Excel file has no column headers');
        return columns;
    }
    getSampleValues(filePath) {
        const sheet = this.readFirstSheet(filePath);
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', blankrows: false });
        const samples = {};
        if (rows.length === 0)
            return samples;
        const firstThree = rows.slice(0, 3);
        const headers = Object.keys(rows[0]);
        for (const header of headers) {
            const trimmedHeader = header.trim();
            samples[trimmedHeader] = firstThree.map(row => String(row[header] ?? '').trim()).filter(Boolean);
        }
        return samples;
    }
    suggestMappings(columns) {
        const usedFields = new Set();
        const suggestions = [];
        for (const excelColumn of columns) {
            const best = this.scoreColumn(excelColumn, usedFields);
            suggestions.push(best);
            if (best.field !== 'ignore') {
                usedFields.add(best.field);
            }
        }
        return suggestions;
    }
    validateMappings(mappings) {
        if (!mappings || mappings.length === 0) {
            throw new errors_1.ValidationError('At least one column mapping is required');
        }
        const mappedFields = mappings.filter((m) => m.field !== 'ignore').map((m) => m.field);
        const hasName = mappedFields.includes('contact.name');
        const hasEmail = mappedFields.includes('contact.email');
        if (!hasName && !hasEmail) {
            throw new errors_1.ValidationError('Map at least one column to Contact Name or Email');
        }
        const seen = new Set();
        for (const m of mappings) {
            if (m.field === 'ignore')
                continue;
            if (seen.has(m.field)) {
                throw new errors_1.ValidationError(`Field "${FIELD_LABELS[m.field]}" is mapped more than once`);
            }
            seen.add(m.field);
        }
    }
    parseWithMappings(filePath, mappings) {
        this.validateMappings(mappings);
        const sheet = this.readFirstSheet(filePath);
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', blankrows: false });
        if (rows.length === 0)
            throw new errors_1.ValidationError('Excel file has no data rows');
        const mappingByColumn = new Map();
        for (const m of mappings) {
            mappingByColumn.set(m.excelColumn, m.field);
        }
        const mappedFields = [...new Set(mappings.filter((m) => m.field !== 'ignore').map((m) => m.field))];
        const ignoredColumns = mappings.filter((m) => m.field === 'ignore').map((m) => m.excelColumn);
        const warnings = [];
        const contacts = [];
        const orgFields = {};
        const seenEmails = new Set();
        let invalidRows = 0;
        let duplicateEmailsInFile = 0;
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const contact = {};
            let rowHasData = false;
            for (const [excelCol, field] of mappingByColumn.entries()) {
                const rawValue = this.getCellValue(row, excelCol);
                if (!rawValue)
                    continue;
                rowHasData = true;
                if (field === 'ignore')
                    continue;
                if (field.startsWith('org.')) {
                    this.applyOrgField(orgFields, field, rawValue);
                    continue;
                }
                this.applyContactField(contact, field, rawValue);
            }
            if (!rowHasData) {
                invalidRows++;
                warnings.push(`Row ${rowNum}: empty row — skipped`);
                continue;
            }
            if (contact.email) {
                contact.email = contact.email.toLowerCase().trim();
                if (!emailRe.test(contact.email)) {
                    invalidRows++;
                    warnings.push(`Row ${rowNum}: invalid email "${contact.email}" — skipped`);
                    continue;
                }
            }
            if (!contact.name && !contact.email) {
                invalidRows++;
                warnings.push(`Row ${rowNum}: missing both name and email — skipped`);
                continue;
            }
            if (!contact.name && contact.email) {
                contact.name = contact.email.split('@')[0];
            }
            if (contact.email) {
                if (seenEmails.has(contact.email)) {
                    duplicateEmailsInFile++;
                    warnings.push(`Row ${rowNum}: duplicate email "${contact.email}" — skipped`);
                    continue;
                }
                seenEmails.add(contact.email);
            }
            contacts.push(contact);
        }
        return {
            contacts,
            orgFields,
            warnings,
            totalRows: rows.length,
            validContacts: contacts.length,
            invalidRows,
            duplicateEmailsInFile,
            sampleContacts: contacts.slice(0, 5),
            mappedFields,
            ignoredColumns,
        };
    }
    createTemplate(type) {
        const templates = {
            basic: [
                ['Name', 'Email', 'Phone', 'Position'],
                ['John Doe', 'john@example.com', '9999999999', 'Manager'],
                ['Jane Smith', 'jane@example.com', '8888888888', 'Director'],
            ],
            'sales-lead': [
                ['Full Name', 'Work Email', 'Mobile', 'Designation', 'City', 'Notes'],
                ['Rahul Sharma', 'rahul@abc.com', '9999999999', 'Sales Manager', 'Mumbai', 'Met at conference'],
                ['Priya Singh', 'priya@xyz.com', '7777777777', 'Account Executive', 'Delhi', 'Follow up Q2'],
            ],
            b2b: [
                ['Company', 'Person Name', 'Work Email', 'Mobile', 'Department', 'LinkedIn'],
                ['ABC Logistics', 'Rahul Sharma', 'rahul@abc.com', '9999999999', 'Operations', 'linkedin.com/in/rahul'],
                ['XYZ Warehousing', 'Mohit Jain', 'mohit@xyz.com', '7777777777', 'Sales', 'linkedin.com/in/mohit'],
            ],
            custom: [
                ['Organization', 'Contact', 'Email Address', 'Phone Number', 'Designation', 'Industry', 'Tags'],
                ['Acme Corp', 'John Doe', 'john@example.com', '6666666666', 'CEO', 'Technology', 'vip,enterprise'],
                ['Beta Inc', 'Jane Roe', 'jane@example.com', '5555555555', 'CTO', 'SaaS', 'prospect'],
            ],
        };
        const data = templates[type] ?? templates.basic;
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = data[0].map(() => ({ wch: 22 }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
        return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    }
    listTemplates() {
        return [
            { id: 'basic', name: 'Basic Contact Template', description: 'Name, Email, Phone, Position' },
            { id: 'sales-lead', name: 'Sales Lead Template', description: 'Full Name, Work Email, Mobile, Designation, City, Notes' },
            { id: 'b2b', name: 'B2B Contact Template', description: 'Company, Person Name, Work Email, Mobile, Department, LinkedIn' },
            { id: 'custom', name: 'Custom Mapping Example', description: 'Arbitrary columns — map on import' },
        ];
    }
    // ─── Private ───────────────────────────────────────────────────────────────
    readFirstSheet(filePath) {
        if (!fs_1.default.existsSync(filePath)) {
            throw new errors_1.ValidationError(`Uploaded file not found: ${filePath}`);
        }
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet)
            throw new errors_1.ValidationError('Excel file has no sheets');
        return sheet;
    }
    scoreColumn(excelColumn, usedFields) {
        const normalized = this.normalize(excelColumn);
        let best = { excelColumn, field: 'ignore', confidence: 0 };
        for (const rule of AUTO_MAP_RULES) {
            if (usedFields.has(rule.field))
                continue;
            if (rule.field === 'contact.name') {
                const isCompanyTerm = /\b(company|org|organization|firm|business|vendor|client)\b/i.test(normalized);
                if (isCompanyTerm)
                    continue;
            }
            for (const pattern of rule.patterns) {
                const score = this.matchScore(normalized, pattern);
                if (score > best.confidence) {
                    best = { excelColumn, field: rule.field, confidence: score };
                }
            }
        }
        if (best.confidence < 60) {
            return { excelColumn, field: 'ignore', confidence: 0 };
        }
        return best;
    }
    matchScore(normalized, pattern) {
        const p = this.normalize(pattern);
        if (normalized === p)
            return 100;
        if (normalized.includes(p) || p.includes(normalized))
            return 92;
        const normTokens = normalized.split(' ');
        const patTokens = p.split(' ');
        const overlap = patTokens.filter((t) => normTokens.includes(t)).length;
        if (overlap > 0 && patTokens.length > 0) {
            return Math.min(90, 60 + Math.round((overlap / patTokens.length) * 30));
        }
        return 0;
    }
    normalize(value) {
        return value.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
    getCellValue(row, excelColumn) {
        const key = Object.keys(row).find((k) => k.trim() === excelColumn.trim());
        if (!key)
            return '';
        const v = row[key];
        if (v === null || v === undefined)
            return '';
        return String(v).trim();
    }
    applyContactField(contact, field, value) {
        switch (field) {
            case 'contact.name':
                contact.name = value;
                break;
            case 'contact.companyName':
                contact.companyName = value;
                break;
            case 'contact.email':
                contact.email = value.replace(/\s+/g, '').toLowerCase();
                break;
            case 'contact.phone':
                contact.phone = value;
                break;
            case 'contact.position':
                contact.position = value;
                break;
            case 'contact.department':
                contact.department = value;
                break;
            case 'contact.linkedin':
                contact.linkedin = value;
                break;
            case 'contact.city':
                contact.city = value;
                break;
            case 'contact.notes':
                contact.notes = value;
                break;
        }
    }
    applyOrgField(orgFields, field, value) {
        switch (field) {
            case 'org.website':
                if (!orgFields.website)
                    orgFields.website = value;
                break;
            case 'org.industry':
                if (!orgFields.industry)
                    orgFields.industry = value;
                break;
            case 'org.tags':
                if (!orgFields.tags) {
                    orgFields.tags = value.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
                }
                break;
        }
    }
}
exports.default = new ColumnMappingService();
