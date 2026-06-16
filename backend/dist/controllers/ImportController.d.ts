/**
 * Import Controller
 * Dynamic column-mapping Excel import into a single named organization
 */
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const uploadMiddleware: multer.Multer;
export declare class ImportController {
    /**
     * POST /import/preview-columns
     * Upload file, extract headers, suggest column mappings
     */
    static previewColumns(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /import/preview-mapped
     * Apply user mappings and return contact preview
     */
    static previewMapped(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /import/:importId/confirm
     * Confirm and import contacts using saved mappings
     */
    static confirm(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /import/:importId
     */
    static getStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /import/templates
     */
    static listTemplates(_req: Request, res: Response): void;
    /**
     * GET /import/template/:type
     */
    static downloadTemplate(req: Request, res: Response): void;
}
//# sourceMappingURL=ImportController.d.ts.map