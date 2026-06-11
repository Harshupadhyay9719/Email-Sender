/**
 * Response Handler Utility
 * Standardized response format for all API endpoints
 */

import { Response } from 'express';
import { v4 as uuid } from 'uuid';
import { ApiResponse } from '../types/index';

export class ResponseHandler {
  static success<T>(
    res: Response,
    statusCode: number = 200,
    message: string = 'Success',
    data?: T
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date(),
      requestId: res.getHeader('x-request-id') as string || uuid(),
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, 201, message, data);
  }

  static accepted<T>(
    res: Response,
    data?: T,
    message: string = 'Request accepted'
  ): Response {
    return this.success(res, 202, message, data);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
