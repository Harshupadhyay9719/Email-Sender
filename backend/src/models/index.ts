/**
 * MongoDB Models - Mongoose Schemas
 */

import mongoose, { Schema, Document } from 'mongoose';
import { UserInterface, ContactInterface, OrganizationInterface, CampaignInterface, EmailLogInterface, ImportLogInterface, ConnectedAccountInterface } from '../types/index';

// ====================== USER MODEL ======================
const userSchema = new Schema<any>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    hashedPassword: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Operator', 'Viewer'],
      default: 'Operator',
    },
    profilePicture: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    deletedAt: Date,
    preferences: {
      theme: {
        type: String,
        default: 'light',
        enum: ['light', 'dark'],
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      emailLanguage: {
        type: String,
        default: 'en',
      },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes
userSchema.index({ createdAt: -1 });

// ====================== ORGANIZATION MODEL ======================
const contactSchema = new Schema<any>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    phone: String,
    position: String,
    department: String,
    linkedin: String,
    city: String,
    notes: String,
    emailValidation: {
      status: {
        type: String,
        enum: ['VALID', 'INVALID', 'RISKY', 'UNKNOWN'],
        default: 'UNKNOWN',
      },
      validatedAt: Date,
      reason: String,
    },
    emailSendStatus: {
      selected: {
        type: Boolean,
        default: false,
      },
      campaignIds: [mongoose.Schema.Types.ObjectId],
      firstValidContactUsed: {
        type: Boolean,
        default: false,
      },
    },
    activity: {
      emailsSent: {
        type: Number,
        default: 0,
      },
      emailsDelivered: {
        type: Number,
        default: 0,
      },
      emailsOpened: {
        type: Number,
        default: 0,
      },
      emailsClicked: {
        type: Number,
        default: 0,
      },
      emailsFailed: {
        type: Number,
        default: 0,
      },
      lastEmailSentAt: Date,
      bounceCount: {
        type: Number,
        default: 0,
      },
      bounceReason: String,
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

const organizationSchema = new Schema<any>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    industry: String,
    website: String,
    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contacts: [contactSchema],
    organizationStatus: {
      totalContacts: {
        type: Number,
        default: 0,
      },
      validContacts: {
        type: Number,
        default: 0,
      },
      invalidContacts: {
        type: Number,
        default: 0,
      },
      allContactsInvalid: {
        type: Boolean,
        default: false,
      },
      lastProcessedAt: Date,
      processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
    },
  },
  {
    timestamps: true,
    collection: 'organizations',
  }
);

// Indexes
organizationSchema.index({ 'contacts.email': 1 });
organizationSchema.index({ createdBy: 1 });

// ====================== CAMPAIGN MODEL ======================
const campaignSchema = new Schema<any>(
  {
    campaignName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emailContent: {
      subject: {
        type: String,
        required: true,
      },
      htmlBody: {
        type: String,
        required: true,
      },
      textBody: String,
      from: {
        type: String,
        required: true,
      },
      replyTo: String,
      mergeFields: [String],
      signature: String,
    },
    attachments: [
      {
        fileName: String,
        fileType: String,
        s3Key: String,
        s3Url: String,
        fileSize: Number,
        uploadedAt: Date,
      },
    ],
    config: {
      status: {
        type: String,
        enum: ['Draft', 'Scheduled', 'Sending', 'Paused', 'Completed', 'Cancelled', 'Failed'],
        default: 'Draft',
        index: true,
      },
      targetOrganizations: [mongoose.Schema.Types.ObjectId],
      targetContacts: [mongoose.Schema.Types.ObjectId],
      sendingConfig: {
        minimumDelaySeconds: {
          type: Number,
          default: 30,
        },
        maximumDelaySeconds: {
          type: Number,
          default: 90,
        },
        dailySendLimit: {
          type: Number,
          default: 500,
        },
        startDate: Date,
        endDate: Date,
        timeZone: {
          type: String,
          default: 'UTC',
        },
        activeHoursStart: String,
        activeHoursEnd: String,
        activeOnWeekends: {
          type: Boolean,
          default: true,
        },
      },
      retryConfig: {
        type: new Schema({
          maxRetries: { type: Number, default: 3 },
          retryDelaySeconds: { type: Number, default: 3600 },
          exponentialBackoff: { type: Boolean, default: true },
        }, { _id: false }),
        default: { maxRetries: 3, retryDelaySeconds: 3600, exponentialBackoff: true },
      },
      excludeEmails: [String],
      excludeOrganizations: [mongoose.Schema.Types.ObjectId],
    },
    statistics: {
      totalOrganizationsTargeted: {
        type: Number,
        default: 0,
      },
      totalContactsSelected: {
        type: Number,
        default: 0,
      },
      emailsQueued: {
        type: Number,
        default: 0,
      },
      emailsSent: {
        type: Number,
        default: 0,
      },
      emailsDelivered: {
        type: Number,
        default: 0,
      },
      emailsFailed: {
        type: Number,
        default: 0,
      },
      emailsBounced: {
        type: Number,
        default: 0,
      },
      emailsOpened: {
        type: Number,
        default: 0,
      },
      emailsClicked: {
        type: Number,
        default: 0,
      },
      openRate: {
        type: Number,
        default: 0,
      },
      clickRate: {
        type: Number,
        default: 0,
      },
      bounceRate: {
        type: Number,
        default: 0,
      },
    },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    activityLog: [
      {
        action: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'campaigns',
  }
);

// Indexes
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ createdAt: -1 });

// ====================== EMAIL LOG MODEL ======================
const emailLogSchema = new Schema<any>(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    recipientName: String,
    personalizedContent: {
      subject: String,
      htmlBody: String,
      textBody: String,
    },
    mergeFieldsApplied: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'bounced', 'skipped'],
      default: 'queued',
      index: true,
    },
    bounceDetails: {
      bounceType: {
        type: String,
        enum: ['Undetermined', 'Permanent', 'Transient'],
      },
      bounceSubType: String,
      bounceReason: String,
    },
    tracking: {
      sentAt: Date,
      deliveredAt: Date,
      openedAt: Date,
      openCount: {
        type: Number,
        default: 0,
      },
      clickedAt: Date,
      clickCount: {
        type: Number,
        default: 0,
      },
      lastInteractionAt: Date,
      failureReason: String,
      failureCode: String,
      failureAttempts: {
        type: Number,
        default: 0,
      },
      nextRetryAt: Date,
    },
    sesMessageId: String,
    sesResponse: mongoose.Schema.Types.Mixed,
    gmailMessageId: String,
    threadId: String,
  },
  {
    timestamps: true,
    collection: 'emaillogs',
  }
);

// Indexes
emailLogSchema.index({ campaignId: 1, status: 1 });
emailLogSchema.index({ sentAt: -1 });

// ====================== IMPORT LOG MODEL ======================
const importLogSchema = new Schema<any>(
  {
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: Number,
    s3Key: String,
    organizationName: String,
    duplicateStrategy: {
      type: String,
      enum: ['merge', 'replace'],
    },
    columnMappings: [
      {
        excelColumn: String,
        field: String,
        confidence: Number,
      },
    ],
    results: {
      totalRows: {
        type: Number,
        default: 0,
      },
      successfulImports: {
        type: Number,
        default: 0,
      },
      failedImports: {
        type: Number,
        default: 0,
      },
      duplicateOrganizations: [String],
      duplicateEmails: [String],
      validationErrors: [
        {
          rowNumber: Number,
          errorMessage: String,
          rowData: mongoose.Schema.Types.Mixed,
        },
      ],
    },
    importStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    organizationsCreated: [mongoose.Schema.Types.ObjectId],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'importlogs',
  }
);

// ====================== CONNECTED ACCOUNT MODEL ======================
const connectedAccountSchema = new Schema<any>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'google',
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
    },
    expiryDate: {
      type: Number,
    },
  },
  {
    timestamps: true,
    collection: 'connectedaccounts',
  }
);

connectedAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

// ====================== EXPORTS ======================
export const User = mongoose.model<UserInterface & Document>('User', userSchema);
export const Organization = mongoose.model<OrganizationInterface & Document>('Organization', organizationSchema);
export const Campaign = mongoose.model<CampaignInterface & Document>('Campaign', campaignSchema);
export const EmailLog = mongoose.model<EmailLogInterface & Document>('EmailLog', emailLogSchema);
export const ImportLog = mongoose.model<ImportLogInterface & Document>('ImportLog', importLogSchema);
export const ConnectedAccount = mongoose.model<ConnectedAccountInterface & Document>('ConnectedAccount', connectedAccountSchema);
