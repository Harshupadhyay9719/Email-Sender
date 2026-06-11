/**
 * Core Type Definitions and Interfaces
 */

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: string[];
  timestamp: Date;
  requestId: string;
}

export type UserRole = 'Admin' | 'Operator' | 'Viewer';

export enum EmailValidationStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  RISKY = 'RISKY',
  UNKNOWN = 'UNKNOWN',
}

export enum CampaignStatus {
  DRAFT = 'Draft',
  SCHEDULED = 'Scheduled',
  SENDING = 'Sending',
  PAUSED = 'Paused',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  FAILED = 'Failed',
}

export enum EmailStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  SKIPPED = 'skipped',
}

export interface ContactInterface {
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  linkedin?: string;
  city?: string;
  notes?: string;
  emailValidation: {
    status: EmailValidationStatus;
    validatedAt?: Date;
    reason?: string;
  };
  emailSendStatus: {
    selected: boolean;
    campaignIds: string[];
    firstValidContactUsed: boolean;
  };
  activity: {
    emailsSent: number;
    emailsDelivered: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsFailed: number;
    lastEmailSentAt?: Date;
    bounceCount: number;
    bounceReason?: string;
  };
}

export interface OrganizationInterface {
  _id?: string;
  companyName: string;
  industry?: string;
  website?: string;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  contacts: ContactInterface[];
  organizationStatus: {
    totalContacts: number;
    validContacts: number;
    invalidContacts: number;
    allContactsInvalid: boolean;
    lastProcessedAt?: Date;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

export interface UserInterface {
  _id?: string;
  email: string;
  hashedPassword: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profilePicture?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  preferences: {
    theme: string;
    emailNotifications: boolean;
    emailLanguage: string;
  };
}

export interface CampaignInterface {
  _id?: string;
  campaignName: string;
  description?: string;
  createdBy: string;
  emailContent: {
    subject: string;
    htmlBody: string;
    textBody?: string;
    from: string;
    replyTo: string;
    mergeFields: string[];
    signature?: string;
  };
  attachments: Array<{
    _id?: string;
    fileName: string;
    fileType: string;
    s3Key: string;
    s3Url: string;
    fileSize: number;
    uploadedAt: Date;
  }>;
  config: {
    status: CampaignStatus;
    targetOrganizations: string[];
    targetContacts?: string[];
    sendingConfig: {
      minimumDelaySeconds: number;
      maximumDelaySeconds: number;
      dailySendLimit: number;
      startDate: Date;
      endDate?: Date;
      timeZone: string;
      activeHoursStart?: string;
      activeHoursEnd?: string;
      activeOnWeekends: boolean;
    };
    retryConfig: {
      maxRetries: number;
      retryDelaySeconds: number;
      exponentialBackoff: boolean;
    };
    excludeEmails: string[];
    excludeOrganizations: string[];
  };
  statistics: {
    totalOrganizationsTargeted: number;
    totalContactsSelected: number;
    emailsQueued: number;
    emailsSent: number;
    emailsDelivered: number;
    emailsFailed: number;
    emailsBounced: number;
    emailsOpened: number;
    emailsClicked: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  activityLog: Array<{
    action: string;
    timestamp: Date;
    details?: string;
  }>;
}

export interface EmailLogInterface {
  _id?: string;
  campaignId: string;
  organizationId: string;
  contactId: string;
  recipientEmail: string;
  recipientName?: string;
  personalizedContent: {
    subject: string;
    htmlBody: string;
    textBody?: string;
  };
  mergeFieldsApplied: Record<string, string>;
  status: EmailStatus;
  bounceDetails?: {
    bounceType: 'Undetermined' | 'Permanent' | 'Transient';
    bounceSubType?: string;
    bounceReason?: string;
  };
  tracking: {
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    openCount: number;
    clickedAt?: Date;
    clickCount: number;
    lastInteractionAt?: Date;
    failureReason?: string;
    failureCode?: string;
    failureAttempts: number;
    nextRetryAt?: Date;
  };
  sesMessageId?: string;
  sesResponse?: Record<string, any>;
  gmailMessageId?: string;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportLogInterface {
  _id?: string;
  importedBy: string;
  fileName: string;
  fileSize: number;
  s3Key?: string;
  organizationName?: string;
  duplicateStrategy?: 'merge' | 'replace';
  columnMappings?: Array<{
    excelColumn: string;
    field: string;
    confidence?: number;
  }>;
  results: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    duplicateOrganizations: string[];
    duplicateEmails: string[];
    validationErrors: Array<{
      rowNumber: number;
      errorMessage: string;
      rowData?: Record<string, any>;
    }>;
  };
  importStatus: 'pending' | 'processing' | 'completed' | 'failed';
  organizationsCreated: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface ConnectedAccountInterface {
  _id?: string;
  userId: string;
  provider: 'google';
  email: string;
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
