/**
 * Error Handling Middleware
 * Centralized error handling for all requests
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { v4 as uuid } from 'uuid';

export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  requestId: string;
  timestamp: Date;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || uuid();

  if (err instanceof AppError) {
    const statusCode = err.statusCode;
    const message = err.message;

    logger.error(`[${requestId}] ${statusCode} - ${message}`);

    const response: any = {
      success: false,
      statusCode,
      message,
      requestId,
      timestamp: new Date(),
    };

    // Include launch conflict properties if they exist
    if ('emailsQueued' in err) {
      response.emailsQueued = (err as any).emailsQueued;
      response.emailsSent = (err as any).emailsSent;
      response.campaignStatus = (err as any).campaignStatus;
      response.reasonForBlock = (err as any).reasonForBlock;
    }

    res.status(statusCode).json(response);
  } else {
    // Unexpected error
    logger.error(`[${requestId}] Unexpected error:`, err);

    const response: ErrorResponse = {
      success: false,
      statusCode: 500,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      requestId,
      timestamp: new Date(),
    };

    res.status(500).json(response);
  }
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string || uuid();

  const response: ErrorResponse = {
    success: false,
    statusCode: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    requestId,
    timestamp: new Date(),
  };

  res.status(404).json(response);
};
