/**
 * Application Constants
 */

export const API_CONSTANTS = {
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // Email
  DEFAULT_SEND_DELAY_MIN: 30, // seconds
  DEFAULT_SEND_DELAY_MAX: 90, // seconds
  DEFAULT_DAILY_LIMIT: 500,

  // Retry
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_RETRY_DELAY: 3600, // seconds (1 hour)

  // File Upload
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg', '.jpeg'],

  // Token expiry
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',

  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
};

export const EMAIL_VALIDATION_STATUS = {
  VALID: 'VALID',
  INVALID: 'INVALID',
  RISKY: 'RISKY',
  UNKNOWN: 'UNKNOWN',
};

export const CAMPAIGN_STATUS = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  SENDING: 'Sending',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

export const EMAIL_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
  SKIPPED: 'skipped',
};

export const USER_ROLES = {
  ADMIN: 'Admin',
  OPERATOR: 'Operator',
  VIEWER: 'Viewer',
};

export const ACTIVITY_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  STARTED: 'started',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You do not have permission to access this resource',
  NOT_FOUND: 'Resource not found',
  INVALID_INPUT: 'Invalid input provided',
  SERVER_ERROR: 'An error occurred. Please try again later',
  DUPLICATE: 'This resource already exists',
};

export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  IMPORTED: 'Data imported successfully',
};

export const DEFAULT_BLACKLIST_EMAILS = [
  '^.*@noreply\\..*',
  '^info@.*',
  '^support@.*',
  '^admin@.*',
  '^contact@.*',
  '^hello@.*',
  '^noreply@.*',
];
