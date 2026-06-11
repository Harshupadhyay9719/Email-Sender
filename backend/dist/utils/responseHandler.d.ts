/**
 * Response Handler Utility
 * Standardized response format for all API endpoints
 */
import { Response } from 'express';
export declare class ResponseHandler {
    static success<T>(res: Response, statusCode?: number, message?: string, data?: T): Response;
    static created<T>(res: Response, data: T, message?: string): Response;
    static accepted<T>(res: Response, data?: T, message?: string): Response;
    static noContent(res: Response): Response;
}
//# sourceMappingURL=responseHandler.d.ts.map