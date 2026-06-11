/**
 * Application Constants
 */
export declare const API_CONSTANTS: {
    DEFAULT_PAGE: number;
    DEFAULT_LIMIT: number;
    MAX_LIMIT: number;
    DEFAULT_SEND_DELAY_MIN: number;
    DEFAULT_SEND_DELAY_MAX: number;
    DEFAULT_DAILY_LIMIT: number;
    DEFAULT_MAX_RETRIES: number;
    DEFAULT_RETRY_DELAY: number;
    MAX_FILE_SIZE: number;
    ALLOWED_EXTENSIONS: string[];
    ACCESS_TOKEN_EXPIRY: string;
    REFRESH_TOKEN_EXPIRY: string;
    RATE_LIMIT_WINDOW: number;
    RATE_LIMIT_MAX_REQUESTS: number;
};
export declare const EMAIL_VALIDATION_STATUS: {
    VALID: string;
    INVALID: string;
    RISKY: string;
    UNKNOWN: string;
};
export declare const CAMPAIGN_STATUS: {
    DRAFT: string;
    SCHEDULED: string;
    SENDING: string;
    PAUSED: string;
    COMPLETED: string;
    CANCELLED: string;
    FAILED: string;
};
export declare const EMAIL_STATUS: {
    QUEUED: string;
    SENT: string;
    DELIVERED: string;
    FAILED: string;
    BOUNCED: string;
    SKIPPED: string;
};
export declare const USER_ROLES: {
    ADMIN: string;
    OPERATOR: string;
    VIEWER: string;
};
export declare const ACTIVITY_ACTIONS: {
    CREATED: string;
    UPDATED: string;
    DELETED: string;
    STARTED: string;
    PAUSED: string;
    RESUMED: string;
    COMPLETED: string;
    CANCELLED: string;
    FAILED: string;
};
export declare const ERROR_MESSAGES: {
    UNAUTHORIZED: string;
    NOT_FOUND: string;
    INVALID_INPUT: string;
    SERVER_ERROR: string;
    DUPLICATE: string;
};
export declare const SUCCESS_MESSAGES: {
    CREATED: string;
    UPDATED: string;
    DELETED: string;
    IMPORTED: string;
};
export declare const DEFAULT_BLACKLIST_EMAILS: string[];
//# sourceMappingURL=constants.d.ts.map