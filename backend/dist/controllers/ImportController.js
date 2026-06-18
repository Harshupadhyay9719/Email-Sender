"use strict";
/**
 * Import Controller
 * Dynamic column-mapping Excel import into a single named organization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportController = exports.uploadMiddleware = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const OrgImportService_1 = __importDefault(require("../services/organization/OrgImportService"));
const ColumnMappingService_1 = __importDefault(require("../services/excel/ColumnMappingService"));
const index_1 = require("../models/index");
const responseHandler_1 = require("../utils/responseHandler");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const fileFilter = (_req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
        cb(null, true);
    }
    else {
        cb(new errors_1.ValidationError('Only Excel (.xlsx) files are allowed'), false);
    }
};
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 },
});
class ImportController {
    /**
     * POST /import/preview-columns
     * Upload file, extract headers, suggest column mappings
     */
    static async previewColumns(req, res, next) {
        try {
            if (!req.file) {
                throw new errors_1.ValidationError('No file uploaded');
            }
            const organizationName = (req.body.organizationName || '').trim();
            if (!organizationName) {
                fs_1.default.unlink(req.file.path, () => { });
                throw new errors_1.ValidationError('organizationName is required');
            }
            const columns = OrgImportService_1.default.extractColumns(req.file.path);
            const suggestedMappings = OrgImportService_1.default.suggestMappings(columns);
            const orgCheck = await OrgImportService_1.default.checkOrgExists(req.user.userId, organizationName);
            const importLog = new index_1.ImportLog({
                importedBy: req.user.userId,
                fileName: req.file.filename,
                fileSize: req.file.size,
                organizationName,
                importStatus: 'processing',
                results: {
                    totalRows: 0,
                    successfulImports: 0,
                    failedImports: 0,
                    duplicateOrganizations: orgCheck.exists ? [organizationName] : [],
                    duplicateEmails: [],
                    validationErrors: [],
                },
            });
            await importLog.save();
            const sampleValues = OrgImportService_1.default.getSampleValues(req.file.path);
            responseHandler_1.ResponseHandler.accepted(res, {
                importId: importLog._id,
                organizationName,
                orgExists: orgCheck.exists,
                existingContactCount: orgCheck.existingContactCount,
                columns,
                suggestedMappings,
                fieldOptions: ColumnMappingService_1.default.fieldOptions,
                sampleValues,
            }, 'Columns extracted successfully');
        }
        catch (error) {
            logger_1.default.error('Error previewing columns:', error);
            if (req.file)
                fs_1.default.unlink(req.file.path, () => { });
            next(error);
        }
    }
    /**
     * POST /import/preview-mapped
     * Apply user mappings and return contact preview
     */
    static async previewMapped(req, res, next) {
        try {
            const { importId, mappings } = req.body;
            if (!importId)
                throw new errors_1.ValidationError('importId is required');
            if (!mappings || !Array.isArray(mappings)) {
                throw new errors_1.ValidationError('mappings array is required');
            }
            const importLog = await index_1.ImportLog.findById(importId);
            if (!importLog)
                throw new errors_1.ValidationError('Import not found');
            if (importLog.importedBy.toString() !== req.user.userId) {
                throw new errors_1.ValidationError('Unauthorized access to this import');
            }
            if (importLog.importStatus !== 'processing') {
                throw new errors_1.ValidationError(`Import cannot be previewed with status: ${importLog.importStatus}`);
            }
            const filePath = path_1.default.join(__dirname, '../../uploads', importLog.fileName);
            if (!fs_1.default.existsSync(filePath)) {
                throw new errors_1.ValidationError('Uploaded file no longer exists. Please upload again.');
            }
            const parsed = OrgImportService_1.default.parseWithMappings(filePath, mappings);
            importLog.columnMappings = mappings;
            importLog.results.totalRows = parsed.totalRows;
            importLog.results.failedImports = parsed.invalidRows;
            await importLog.save();
            responseHandler_1.ResponseHandler.success(res, 200, 'Mapped preview generated', {
                importId,
                organizationName: importLog.organizationName,
                orgExists: (importLog.results.duplicateOrganizations?.length ?? 0) > 0,
                totalRows: parsed.totalRows,
                validContacts: parsed.validContacts,
                invalidRows: parsed.invalidRows,
                duplicates: parsed.duplicateEmailsInFile,
                sampleContacts: parsed.sampleContacts,
                mappedFields: parsed.mappedFields,
                ignoredColumns: parsed.ignoredColumns,
                warnings: parsed.warnings,
            });
        }
        catch (error) {
            logger_1.default.error('Error previewing mapped import:', error);
            next(error);
        }
    }
    /**
     * POST /import/:importId/confirm
     * Confirm and import contacts using saved mappings
     */
    static async confirm(req, res, next) {
        try {
            const { importId } = req.params;
            const duplicateStrategy = req.body.duplicateStrategy;
            const mappings = req.body.mappings;
            const importLog = await index_1.ImportLog.findById(importId);
            if (!importLog)
                throw new errors_1.ValidationError('Import not found');
            if (importLog.importedBy.toString() !== req.user.userId) {
                throw new errors_1.ValidationError('Unauthorized access to this import');
            }
            if (importLog.importStatus !== 'processing') {
                throw new errors_1.ValidationError(`Import cannot be confirmed with status: ${importLog.importStatus}`);
            }
            if (!importLog.organizationName) {
                throw new errors_1.ValidationError('Import is missing organization name');
            }
            const columnMappings = mappings ?? importLog.columnMappings;
            if (!columnMappings || columnMappings.length === 0) {
                throw new errors_1.ValidationError('Column mappings are required. Complete the mapping step first.');
            }
            const orgCheck = await OrgImportService_1.default.checkOrgExists(req.user.userId, importLog.organizationName);
            if (orgCheck.exists && !duplicateStrategy) {
                throw new errors_1.ValidationError('duplicateStrategy is required when organization already exists (merge or replace)');
            }
            if (duplicateStrategy && !['merge', 'replace'].includes(duplicateStrategy)) {
                throw new errors_1.ValidationError('duplicateStrategy must be "merge" or "replace"');
            }
            const filePath = path_1.default.join(__dirname, '../../uploads', importLog.fileName);
            if (!fs_1.default.existsSync(filePath)) {
                throw new errors_1.ValidationError('Uploaded file no longer exists. Please upload again.');
            }
            const result = await OrgImportService_1.default.confirmImport(req.user.userId, importLog.organizationName, filePath, columnMappings, duplicateStrategy ?? null, importId);
            responseHandler_1.ResponseHandler.success(res, 200, 'Import completed successfully', result);
        }
        catch (error) {
            logger_1.default.error('Error confirming import:', error);
            next(error);
        }
    }
    /**
     * GET /import/:importId
     */
    static async getStatus(req, res, next) {
        try {
            const importLog = await index_1.ImportLog.findById(req.params.importId);
            if (!importLog)
                throw new errors_1.ValidationError('Import not found');
            if (importLog.importedBy.toString() !== req.user.userId) {
                throw new errors_1.ValidationError('Unauthorized access to this import');
            }
            responseHandler_1.ResponseHandler.success(res, 200, 'Import details retrieved', importLog.toObject());
        }
        catch (error) {
            logger_1.default.error('Error fetching import status:', error);
            next(error);
        }
    }
    /**
     * GET /import/templates
     */
    static listTemplates(_req, res) {
        responseHandler_1.ResponseHandler.success(res, 200, 'Templates retrieved', ColumnMappingService_1.default.listTemplates());
    }
    /**
     * GET /import/template/:type
     */
    static downloadTemplate(req, res) {
        try {
            const type = (req.params.type || 'basic');
            const valid = ['basic', 'sales-lead', 'b2b', 'custom'];
            const templateType = valid.includes(type) ? type : 'basic';
            const buffer = ColumnMappingService_1.default.createTemplate(templateType);
            const filename = `${templateType}-contact-template.xlsx`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        }
        catch (error) {
            logger_1.default.error('Error downloading template:', error);
            res.status(500).json({ success: false, message: 'Error downloading template' });
        }
    }
}
exports.ImportController = ImportController;
