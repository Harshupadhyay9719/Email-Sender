/**
 * Custom Error Classes for consistent error handling
 */
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(statusCode: number, message: string, isOperational?: boolean);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class CampaignLaunchConflictError extends AppError {
    emailsQueued: number;
    emailsSent: number;
    campaignStatus: string;
    reasonForBlock: string;
    constructor(message: string, emailsQueued: number, emailsSent: number, campaignStatus: string, reasonForBlock: string);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message: string);
}
//# sourceMappingURL=errors.d.ts.map