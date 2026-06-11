/**
 * Import Controller
 * Dynamic column-mapping Excel import into a single named organization
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import OrgImportService, { DuplicateStrategy } from '../services/organization/OrgImportService';
import ColumnMappingService, { ColumnMapping } from '../services/excel/ColumnMappingService';
import { ImportLog } from '../models/index';
import { ResponseHandler } from '../utils/responseHandler';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: Function) => {
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.originalname.endsWith('.xlsx')
  ) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only Excel (.xlsx) files are allowed'), false);
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export class ImportController {
  /**
   * POST /import/preview-columns
   * Upload file, extract headers, suggest column mappings
   */
  static async previewColumns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const organizationName = (req.body.organizationName || '').trim();
      if (!organizationName) {
        fs.unlink(req.file.path, () => {});
        throw new ValidationError('organizationName is required');
      }

      const columns = OrgImportService.extractColumns(req.file.path);
      const suggestedMappings = OrgImportService.suggestMappings(columns);
      const orgCheck = await OrgImportService.checkOrgExists(req.user!.userId, organizationName);

      const importLog = new ImportLog({
        importedBy: req.user!.userId,
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

      ResponseHandler.accepted(
        res,
        {
          importId: importLog._id,
          organizationName,
          orgExists: orgCheck.exists,
          existingContactCount: orgCheck.existingContactCount,
          columns,
          suggestedMappings,
          fieldOptions: ColumnMappingService.fieldOptions,
        },
        'Columns extracted successfully'
      );
    } catch (error) {
      logger.error('Error previewing columns:', error);
      if (req.file) fs.unlink(req.file.path, () => {});
      next(error);
    }
  }

  /**
   * POST /import/preview-mapped
   * Apply user mappings and return contact preview
   */
  static async previewMapped(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { importId, mappings } = req.body as {
        importId: string;
        mappings: ColumnMapping[];
      };

      if (!importId) throw new ValidationError('importId is required');
      if (!mappings || !Array.isArray(mappings)) {
        throw new ValidationError('mappings array is required');
      }

      const importLog = await ImportLog.findById(importId);
      if (!importLog) throw new ValidationError('Import not found');

      if (importLog.importedBy.toString() !== req.user!.userId) {
        throw new ValidationError('Unauthorized access to this import');
      }

      if (importLog.importStatus !== 'processing') {
        throw new ValidationError(`Import cannot be previewed with status: ${importLog.importStatus}`);
      }

      const filePath = path.join(__dirname, '../../uploads', importLog.fileName);
      if (!fs.existsSync(filePath)) {
        throw new ValidationError('Uploaded file no longer exists. Please upload again.');
      }

      const parsed = OrgImportService.parseWithMappings(filePath, mappings);

      importLog.columnMappings = mappings;
      importLog.results.totalRows = parsed.totalRows;
      importLog.results.failedImports = parsed.invalidRows;
      await importLog.save();

      ResponseHandler.success(res, 200, 'Mapped preview generated', {
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
    } catch (error) {
      logger.error('Error previewing mapped import:', error);
      next(error);
    }
  }

  /**
   * POST /import/:importId/confirm
   * Confirm and import contacts using saved mappings
   */
  static async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { importId } = req.params;
      const duplicateStrategy = req.body.duplicateStrategy as DuplicateStrategy | undefined;
      const mappings = req.body.mappings as ColumnMapping[] | undefined;

      const importLog = await ImportLog.findById(importId);
      if (!importLog) throw new ValidationError('Import not found');

      if (importLog.importedBy.toString() !== req.user!.userId) {
        throw new ValidationError('Unauthorized access to this import');
      }

      if (importLog.importStatus !== 'processing') {
        throw new ValidationError(`Import cannot be confirmed with status: ${importLog.importStatus}`);
      }

      if (!importLog.organizationName) {
        throw new ValidationError('Import is missing organization name');
      }

      const columnMappings = mappings ?? importLog.columnMappings;
      if (!columnMappings || columnMappings.length === 0) {
        throw new ValidationError('Column mappings are required. Complete the mapping step first.');
      }

      const orgCheck = await OrgImportService.checkOrgExists(
        req.user!.userId,
        importLog.organizationName
      );

      if (orgCheck.exists && !duplicateStrategy) {
        throw new ValidationError(
          'duplicateStrategy is required when organization already exists (merge or replace)'
        );
      }

      if (duplicateStrategy && !['merge', 'replace'].includes(duplicateStrategy)) {
        throw new ValidationError('duplicateStrategy must be "merge" or "replace"');
      }

      const filePath = path.join(__dirname, '../../uploads', importLog.fileName);
      if (!fs.existsSync(filePath)) {
        throw new ValidationError('Uploaded file no longer exists. Please upload again.');
      }

      const result = await OrgImportService.confirmImport(
        req.user!.userId,
        importLog.organizationName,
        filePath,
        columnMappings,
        duplicateStrategy ?? null,
        importId
      );

      ResponseHandler.success(res, 200, 'Import completed successfully', result);
    } catch (error) {
      logger.error('Error confirming import:', error);
      next(error);
    }
  }

  /**
   * GET /import/:importId
   */
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const importLog = await ImportLog.findById(req.params.importId);
      if (!importLog) throw new ValidationError('Import not found');

      if (importLog.importedBy.toString() !== req.user!.userId) {
        throw new ValidationError('Unauthorized access to this import');
      }

      ResponseHandler.success(res, 200, 'Import details retrieved', importLog.toObject());
    } catch (error) {
      logger.error('Error fetching import status:', error);
      next(error);
    }
  }

  /**
   * GET /import/templates
   */
  static listTemplates(_req: Request, res: Response): void {
    ResponseHandler.success(res, 200, 'Templates retrieved', ColumnMappingService.listTemplates());
  }

  /**
   * GET /import/template/:type
   */
  static downloadTemplate(req: Request, res: Response): void {
    try {
      const type = (req.params.type || 'basic') as 'basic' | 'sales-lead' | 'b2b' | 'custom';
      const valid = ['basic', 'sales-lead', 'b2b', 'custom'];
      const templateType = valid.includes(type) ? type : 'basic';

      const buffer = ColumnMappingService.createTemplate(templateType);
      const filename = `${templateType}-contact-template.xlsx`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(buffer);
    } catch (error) {
      logger.error('Error downloading template:', error);
      res.status(500).json({ success: false, message: 'Error downloading template' });
    }
  }
}
