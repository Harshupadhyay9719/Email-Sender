/**
 * Custom Error Classes for consistent error handling
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class CampaignLaunchConflictError extends AppError {
  constructor(
    message: string,
    public emailsQueued: number,
    public emailsSent: number,
    public campaignStatus: string,
    public reasonForBlock: string
  ) {
    super(409, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, false);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(503, `${service} service error: ${message}`, false);
  }
}
