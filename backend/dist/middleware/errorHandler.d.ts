/**
 * Error Handling Middleware
 * Centralized error handling for all requests
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
export interface ErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    errors?: string[];
    requestId: string;
    timestamp: Date;
}
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
/**
 * 404 Not Found handler
 */
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=errorHandler.d.ts.map