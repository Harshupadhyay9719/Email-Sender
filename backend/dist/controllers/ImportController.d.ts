/**
 * Import Controller
 * Handles Excel file imports for organizations
 */
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const uploadMiddleware: multer.Multer;
export declare class ImportController {
    /**
     * POST /import/upload
     * Upload and parse Excel file
     */
    static upload(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /import/:importId/confirm
     * Confirm and process import
     */
    static confirm(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /import/:importId
     * Get import log details
     */
    static getStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /import/template
     * Download sample Excel template
     */
    static downloadTemplate(req: Request, res: Response): void;
}
//# sourceMappingURL=ImportController.d.ts.map