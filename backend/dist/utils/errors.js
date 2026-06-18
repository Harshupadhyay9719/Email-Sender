"use strict";
/**
 * Custom Error Classes for consistent error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServiceError = exports.InternalServerError = exports.CampaignLaunchConflictError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(400, message);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(401, message);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'You do not have permission to access this resource') {
        super(403, message);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource) {
        super(404, `${resource} not found`);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
class CampaignLaunchConflictError extends AppError {
    emailsQueued;
    emailsSent;
    campaignStatus;
    reasonForBlock;
    constructor(message, emailsQueued, emailsSent, campaignStatus, reasonForBlock) {
        super(409, message);
        this.emailsQueued = emailsQueued;
        this.emailsSent = emailsSent;
        this.campaignStatus = campaignStatus;
        this.reasonForBlock = reasonForBlock;
    }
}
exports.CampaignLaunchConflictError = CampaignLaunchConflictError;
class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(500, message, false);
    }
}
exports.InternalServerError = InternalServerError;
class ExternalServiceError extends AppError {
    constructor(service, message) {
        super(503, `${service} service error: ${message}`, false);
    }
}
exports.ExternalServiceError = ExternalServiceError;
