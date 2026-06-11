"use strict";
/**
 * Import Controller
 * Handles Excel file imports for organizations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportController = exports.uploadMiddleware = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const ExcelParserService_1 = __importDefault(require("../services/excel/ExcelParserService"));
const OrganizationService_1 = __importDefault(require("../services/organization/OrganizationService"));
const index_1 = require("../models/index");
const responseHandler_1 = require("../utils/responseHandler");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `${timestamp}-${file.originalname}`);
    },
});
const fileFilter = (req, file, cb) => {
    // Only allow xlsx files
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
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
});
class ImportController {
    /**
     * POST /import/upload
     * Upload and parse Excel file
     */
    static async upload(req, res, next) {
        try {
            if (!req.file) {
                throw new errors_1.ValidationError('No file uploaded');
            }
            // Create import log
            const importLog = new index_1.ImportLog({
                importedBy: req.user.userId,
                fileName: req.file.filename,
                fileSize: req.file.size,
                importStatus: 'processing',
            });
            await importLog.save();
            // Parse Excel file
            const parsedData = await ExcelParserService_1.default.parseExcelFile(req.file.path);
            const response = {
                importId: importLog._id,
                status: 'processed',
                summary: {
                    totalRows: parsedData.rows.length,
                    validRows: parsedData.rows.length,
                    invalidRows: parsedData.validationErrors.length,
                    duplicateOrganizations: parsedData.duplicateOrganizations.length,
                    duplicateEmails: parsedData.duplicateEmails.length,
                },
                preview: {
                    totalRows: parsedData.rows.length,
                    sampleData: parsedData.rows.slice(0, 5),
                    detectedColumns: parsedData.headers,
                    warnings: [
                        ...parsedData.duplicateOrganizations.map((org) => `Duplicate organization: "${org}"`),
                        ...parsedData.duplicateEmails.map((email) => `Duplicate email: "${email}"`),
                    ],
                },
                validationErrors: parsedData.validationErrors.slice(0, 10), // First 10 errors
            };
            // Update import log with results
            importLog.results = {
                totalRows: parsedData.rows.length,
                successfulImports: 0,
                failedImports: parsedData.validationErrors.length,
                duplicateOrganizations: parsedData.duplicateOrganizations,
                duplicateEmails: parsedData.duplicateEmails,
                validationErrors: parsedData.validationErrors.map((error) => ({
                    rowNumber: error.rowNumber,
                    errorMessage: error.message,
                    rowData: error.rowData,
                })),
            };
            // Store parsed data in session for confirmation
            req.session = req.session || {};
            req.session.parsedExcelData = parsedData;
            req.session.importLogId = importLog._id;
            await importLog.save();
            responseHandler_1.ResponseHandler.accepted(res, response, 'File parsed successfully');
        }
        catch (error) {
            logger_1.default.error('Error uploading file:', error);
            // Clean up uploaded file
            if (req.file) {
                fs_1.default.unlink(req.file.path, (err) => {
                    if (err)
                        logger_1.default.error('Error deleting file:', err);
                });
            }
            next(error);
        }
    }
    /**
     * POST /import/:importId/confirm
     * Confirm and process import
     */
    static async confirm(req, res, next) {
        try {
            const { importId } = req.params;
            // Find import log
            const importLog = await index_1.ImportLog.findById(importId);
            if (!importLog) {
                throw new errors_1.ValidationError('Import not found');
            }
            // Verify import belongs to current user
            if (importLog.importedBy.toString() !== req.user.userId) {
                throw new errors_1.ValidationError('Unauthorized access to this import');
            }
            if (importLog.importStatus !== 'processing') {
                throw new errors_1.ValidationError(`Import cannot be confirmed with status: ${importLog.importStatus}`);
            }
            // Parse file again to get data
            const filePath = path_1.default.join(__dirname, '../../uploads', importLog.fileName);
            const parsedData = await ExcelParserService_1.default.parseExcelFile(filePath);
            let successCount = 0;
            const createdOrgIds = [];
            // Create organizations
            for (const row of parsedData.rows) {
                try {
                    const organization = await OrganizationService_1.default.createOrganization(req.user.userId, {
                        companyName: row.companyName,
                        industry: row.industry,
                        website: row.website,
                        contacts: row.contacts,
                    });
                    successCount++;
                    createdOrgIds.push(organization._id?.toString() || '');
                }
                catch (error) {
                    logger_1.default.error(`Error creating organization "${row.companyName}":`, error.message);
                }
            }
            // Update import log
            importLog.importStatus = 'completed';
            importLog.completedAt = new Date();
            importLog.results.successfulImports = successCount;
            importLog.results.failedImports = parsedData.rows.length - successCount;
            importLog.organizationsCreated = createdOrgIds;
            await importLog.save();
            logger_1.default.info(`Import completed: ${successCount} organizations created, ${parsedData.rows.length - successCount} failed`);
            // Clean up uploaded file
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlink(filePath, (err) => {
                    if (err)
                        logger_1.default.error('Error deleting file:', err);
                });
            }
            const response = {
                importId: importLog._id,
                status: 'completed',
                results: {
                    totalImported: successCount,
                    totalFailed: parsedData.rows.length - successCount,
                    organizationsCreated: createdOrgIds,
                },
            };
            responseHandler_1.ResponseHandler.success(res, 200, 'Import completed successfully', response);
        }
        catch (error) {
            logger_1.default.error('Error confirming import:', error);
            next(error);
        }
    }
    /**
     * GET /import/:importId
     * Get import log details
     */
    static async getStatus(req, res, next) {
        try {
            const { importId } = req.params;
            const importLog = await index_1.ImportLog.findById(importId);
            if (!importLog) {
                throw new errors_1.ValidationError('Import not found');
            }
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
     * GET /import/template
     * Download sample Excel template
     */
    static downloadTemplate(req, res) {
        try {
            const buffer = ExcelParserService_1.default.createSampleTemplate();
            res.setHeader('Content-Disposition', 'attachment; filename="email-import-template.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        }
        catch (error) {
            logger_1.default.error('Error downloading template:', error);
            res.status(500).json({
                success: false,
                message: 'Error downloading template',
            });
        }
    }
}
exports.ImportController = ImportController;
//# sourceMappingURL=ImportController.js.map