# Email Outreach & Campaign Management Platform - Architecture Document

**Project**: Professional Email Campaign Management Platform  
**Version**: 1.0  
**Date**: June 2026  
**Status**: Architecture Planning Phase

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Database Schema](#database-schema)
3. [API Design](#api-design)
4. [Folder Structure](#folder-structure)
5. [Technology Stack Decisions](#technology-stack-decisions)
6. [Development Roadmap](#development-roadmap)

---

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │   Vite       │  │  TypeScript  │      │
│  │  (Tailwind + │  │   (Dev)      │  │  (Type Safe) │      │
│  │  ShadCN UI)  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/REST
                            │
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY & AUTHENTICATION LAYER              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Express.js + TypeScript Middleware             │ │
│  │  [JWT Validation] [Rate Limiting] [CORS] [Helmet]     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────────┐  ┌─────▼──────┐  ┌──────▼────────────┐
│  REST API Layer  │  │  Queue     │  │  External         │
│                  │  │  System    │  │  Services         │
│  [Controllers]   │  │            │  │                   │
│  [Services]      │  │ BullMQ +   │  │ [AWS SES]         │
│  [Middleware]    │  │ Redis      │  │ [AWS S3]          │
└───────┬──────────┘  └─────┬──────┘  │ [Email Validator] │
        │                   │         └──────┬────────────┘
        │                   │                │
        └───────────────────┼────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Campaign Manager  │  Excel Parser  │  Email Engine │  │
│  │  Contact Validator │  Analytics     │  Auth Service │  │
│  │  Queue Processor   │  Notification  │  File Handler │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │    Mongoose Models & Repository Pattern               │ │
│  │  [User] [Organization] [Contact] [Campaign]           │ │
│  │  [EmailLog] [Template] [Settings]                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────────┐  ┌─────▼──────┐  ┌──────▼────────────┐
│   MongoDB        │  │   Redis    │  │  AWS S3           │
│                  │  │  Cache &   │  │  File Storage     │
│  Persistent Data │  │  Queues    │  │                   │
└──────────────────┘  └────────────┘  └───────────────────┘
```

### Core Components

#### 1. **Authentication & Authorization Layer**
- JWT-based authentication
- Role-based access control (Admin, Operator, Viewer)
- Token refresh mechanism
- Session management
- Audit logging for sensitive operations

#### 2. **Excel Import Engine**
- Dynamic column detection
- Validation of file structure
- Contact grouping logic
- Duplicate detection (organizations & emails)
- Import summary generation
- Error reporting with line-by-line feedback

#### 3. **Email Validation Service**
- Format validation (regex)
- Domain existence check
- MX record verification
- Disposable email detection
- Caching of validation results
- Status tracking (VALID, INVALID, RISKY, UNKNOWN)

#### 4. **Campaign Management System**
- Campaign CRUD operations
- Template management
- Merge field personalization
- Attachment handling
- Campaign lifecycle (Draft → Scheduled → Sending → Completed/Paused)

#### 5. **Email Sending Engine**
- BullMQ-based queue system
- Worker processes
- Randomized delay implementation (30-90 seconds)
- Retry mechanism with exponential backoff
- Bounce/failure tracking
- Rate limiting & daily caps

#### 6. **Contact Selection Algorithm**
- Per-organization contact validation
- Fallback logic for invalid contacts
- Marking of organizations with all-invalid contacts
- Tracking of which contact was selected per organization

#### 7. **Analytics & Reporting System**
- Real-time dashboard metrics
- Charts and visualizations
- Export functionality (CSV, Excel, PDF)
- Filtering and search capabilities
- Custom report builder

#### 8. **File Management System**
- AWS S3 integration
- Signed URL generation for secure downloads
- Attachment validation
- Virus scanning (optional enhancement)
- Storage optimization

---

## Database Schema

### 1. **User Collection**

```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  hashedPassword: String,
  firstName: String,
  lastName: String,
  role: Enum ['Admin', 'Operator', 'Viewer'],
  profilePicture: String (S3 URL),
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date (soft delete),
  
  // Settings
  preferences: {
    theme: String,
    emailNotifications: Boolean,
    emailLanguage: String
  }
}
```

### 2. **Organization Collection**

```javascript
{
  _id: ObjectId,
  companyName: String (indexed),
  industry: String,
  website: String,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date,
  
  // Embedded contacts array
  contacts: [
    {
      _id: ObjectId,
      name: String,
      email: String (indexed),
      phone: String,
      position: String,
      department: String,
      
      // Validation & Status tracking
      emailValidation: {
        status: Enum ['VALID', 'INVALID', 'RISKY', 'UNKNOWN'],
        validatedAt: Date,
        reason: String (error details)
      },
      
      emailSendStatus: {
        selected: Boolean, // Marks if this contact was selected for sending
        campaignIds: [ObjectId], // Which campaigns sent to this contact
        firstValidContactUsed: Boolean // True if this was the first valid contact
      },
      
      // Activity tracking
      activity: {
        emailsSent: Number,
        emailsDelivered: Number,
        emailsOpened: Number,
        emailsClicked: Number,
        emailsFailed: Number,
        lastEmailSentAt: Date,
        bounceCount: Number,
        bounceReason: String
      }
    }
  ],
  
  // Organization-level tracking
  organizationStatus: {
    totalContacts: Number,
    validContacts: Number,
    invalidContacts: Number,
    allContactsInvalid: Boolean,
    lastProcessedAt: Date,
    processingStatus: Enum ['pending', 'processing', 'completed', 'failed']
  }
}
```

### 3. **Campaign Collection**

```javascript
{
  _id: ObjectId,
  campaignName: String (indexed),
  description: String,
  createdBy: ObjectId (ref: User),
  
  // Email Content
  emailContent: {
    subject: String,
    htmlBody: String (Rich Text),
    textBody: String,
    from: String,
    replyTo: String,
    
    // Merge fields used in this campaign
    mergeFiels: [String], // ['{{company_name}}', '{{contact_name}}']
    
    // Signature
    signature: String
  },
  
  // Attachments
  attachments: [
    {
      _id: ObjectId,
      fileName: String,
      fileType: String,
      s3Key: String,
      s3Url: String,
      fileSize: Number,
      uploadedAt: Date
    }
  ],
  
  // Campaign Configuration
  config: {
    status: Enum ['Draft', 'Scheduled', 'Sending', 'Paused', 'Completed', 'Cancelled', 'Failed'],
    targetOrganizations: [ObjectId], // Ref: Organization
    targetContacts: [ObjectId], // Specific contacts, if applicable
    
    // Sending configuration
    sendingConfig: {
      minimumDelaySeconds: Number, // e.g., 30
      maximumDelaySeconds: Number, // e.g., 90
      dailySendLimit: Number, // e.g., 500
      startDate: Date,
      endDate: Date,
      timeZone: String,
      
      // Active hours (optional)
      activeHoursStart: String, // "09:00"
      activeHoursEnd: String,   // "18:00"
      activeOnWeekends: Boolean
    },
    
    // Retry configuration
    retryConfig: {
      maxRetries: Number, // e.g., 3
      retryDelaySeconds: Number, // e.g., 3600 (1 hour)
      exponentialBackoff: Boolean
    },
    
    // Blacklist to exclude
    excludeEmails: [String],
    excludeOrganizations: [ObjectId]
  },
  
  // Campaign Statistics
  statistics: {
    totalOrganizationsTargeted: Number,
    totalContactsSelected: Number,
    emailsQueued: Number,
    emailsSent: Number,
    emailsDelivered: Number,
    emailsFailed: Number,
    emailsBounced: Number,
    emailsOpened: Number,
    emailsClicked: Number,
    openRate: Number,
    clickRate: Number,
    bounceRate: Number
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  
  // Activity Log
  activityLog: [
    {
      action: String, // 'started', 'paused', 'resumed', 'completed', 'failed'
      timestamp: Date,
      details: String
    }
  ]
}
```

### 4. **EmailLog Collection**

```javascript
{
  _id: ObjectId,
  campaignId: ObjectId (ref: Campaign, indexed),
  organizationId: ObjectId (ref: Organization, indexed),
  contactId: ObjectId (indexed),
  
  // Recipient Information
  recipientEmail: String (indexed),
  recipientName: String,
  
  // Personalization
  personalizedContent: {
    subject: String,
    htmlBody: String,
    textBody: String
  },
  
  // Merge Fields Used
  mergeFieldsApplied: {
    'company_name': String,
    'contact_name': String,
    'email': String,
    'phone': String
  },
  
  // Email Status
  status: Enum [
    'queued', 
    'sent', 
    'delivered', 
    'failed', 
    'bounced', 
    'skipped'
  ],
  
  // Bounce Information
  bounceDetails: {
    bounceType: Enum ['Undetermined', 'Permanent', 'Transient'],
    bounceSubType: String,
    bounceReason: String
  },
  
  // Tracking
  tracking: {
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    openCount: Number,
    clickedAt: Date,
    clickCount: Number,
    lastInteractionAt: Date,
    
    // If failed
    failureReason: String,
    failureCode: String,
    failureAttempts: Number,
    nextRetryAt: Date
  },
  
  // AWS SES Response
  sesMessageId: String,
  sesResponse: Object, // Store full SES response
  
  createdAt: Date,
  updatedAt: Date
}
```

### 5. **EmailTemplate Collection**

```javascript
{
  _id: ObjectId,
  templateName: String,
  description: String,
  createdBy: ObjectId (ref: User),
  
  content: {
    subject: String,
    htmlBody: String,
    textBody: String
  },
  
  mergeFiels: [String],
  
  isPublic: Boolean, // Admin templates available to all
  category: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 6. **ImportLog Collection**

```javascript
{
  _id: ObjectId,
  importedBy: ObjectId (ref: User),
  fileName: String,
  fileSize: Number,
  s3Key: String,
  
  // Import Results
  results: {
    totalRows: Number,
    successfulImports: Number,
    failedImports: Number,
    duplicateOrganizations: [String],
    duplicateEmails: [String],
    validationErrors: [
      {
        rowNumber: Number,
        errorMessage: String,
        rowData: Object
      }
    ]
  },
  
  importStatus: Enum ['pending', 'processing', 'completed', 'failed'],
  organizationsCreated: [ObjectId], // Ref: Organization
  
  startedAt: Date,
  completedAt: Date
}
```

### 7. **BlacklistedEmail Collection**

```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  emailPattern: String (regex pattern for domains), // e.g., "^.*@noreply\..*"
  reason: Enum ['bounce', 'spam_complaint', 'invalid', 'user_added'],
  addedBy: ObjectId (ref: User),
  addedAt: Date,
  
  // For domain-level blacklisting
  isDomainLevel: Boolean,
  domain: String (indexed)
}
```

### 8. **AuditLog Collection**

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  action: String,
  entityType: String, // 'Campaign', 'Organization', 'User', etc.
  entityId: ObjectId,
  
  changes: {
    before: Object,
    after: Object
  },
  
  ipAddress: String,
  userAgent: String,
  
  createdAt: Date
}
```

### 9. **SystemSettings Collection**

```javascript
{
  _id: ObjectId,
  
  // Sending Configuration
  sendingDefaults: {
    minDelaySeconds: Number,
    maxDelaySeconds: Number,
    dailySendLimit: Number
  },
  
  // Email Validation
  emailValidationSettings: {
    enableMXCheck: Boolean,
    enableDisposableCheck: Boolean,
    cacheDurationDays: Number
  },
  
  // AWS Configuration
  awsConfig: {
    sesRegion: String,
    s3Bucket: String,
    s3Region: String
  },
  
  // Default Blacklist Patterns
  defaultBlacklistPatterns: [String], // ['info@', 'support@', 'admin@']
  
  updatedBy: ObjectId (ref: User),
  updatedAt: Date
}
```

### Database Indexes

```javascript
// Users
db.users.createIndex({ email: 1 })
db.users.createIndex({ createdAt: -1 })

// Organizations
db.organizations.createIndex({ companyName: 1 })
db.organizations.createIndex({ 'contacts.email': 1 })
db.organizations.createIndex({ createdBy: 1 })

// Campaigns
db.campaigns.createIndex({ campaignName: 1 })
db.campaigns.createIndex({ createdBy: 1 })
db.campaigns.createIndex({ 'config.status': 1 })
db.campaigns.createIndex({ createdAt: -1 })

// EmailLog
db.emaillogs.createIndex({ campaignId: 1 })
db.emaillogs.createIndex({ organizationId: 1 })
db.emaillogs.createIndex({ recipientEmail: 1 })
db.emaillogs.createIndex({ status: 1 })
db.emaillogs.createIndex({ sentAt: -1 })
db.emaillogs.createIndex({ campaignId: 1, status: 1 })

// BlacklistedEmail
db.blacklistedemails.createIndex({ email: 1 })
db.blacklistedemails.createIndex({ domain: 1 })

// AuditLog
db.auditlogs.createIndex({ userId: 1, createdAt: -1 })
db.auditlogs.createIndex({ entityType: 1, entityId: 1 })
```

---

## API Design

### Base URL
```
http://localhost:5000/api/v1
https://api.emailoutreach.com/api/v1
```

### Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
```

### Response Format
```javascript
{
  success: Boolean,
  statusCode: Number,
  message: String,
  data: Object | Array | null,
  errors: [String] | null,
  timestamp: Date,
  requestId: String // For debugging
}
```

### 1. Authentication Endpoints

#### POST /auth/register
```
Request:
{
  email: String,
  password: String,
  firstName: String,
  lastName: String
}

Response: 201 Created
{
  user: { id, email, firstName, lastName, role },
  accessToken: String,
  refreshToken: String
}
```

#### POST /auth/login
```
Request:
{
  email: String,
  password: String
}

Response: 200 OK
{
  user: { id, email, firstName, lastName, role },
  accessToken: String,
  refreshToken: String
}
```

#### POST /auth/refresh
```
Request:
{
  refreshToken: String
}

Response: 200 OK
{
  accessToken: String
}
```

#### POST /auth/logout
```
Response: 200 OK
{
  message: "Logged out successfully"
}
```

### 2. Organization & Contact Endpoints

#### GET /organizations
```
Query Parameters:
- page: Number (default: 1)
- limit: Number (default: 20)
- search: String (search company name)
- sortBy: String (default: 'createdAt')
- order: 'asc' | 'desc'

Response: 200 OK
{
  organizations: [Organization],
  pagination: { page, limit, total, pages }
}
```

#### GET /organizations/:id
```
Response: 200 OK
{
  organization: Organization
}
```

#### POST /organizations
```
Request:
{
  companyName: String,
  industry: String,
  website: String,
  contacts: [Contact]
}

Response: 201 Created
{
  organization: Organization
}
```

#### PUT /organizations/:id
```
Request: Partial Organization Object
Response: 200 OK
```

#### DELETE /organizations/:id
```
Response: 200 OK
{
  message: "Organization deleted"
}
```

#### POST /organizations/:id/contacts
```
Request:
{
  name: String,
  email: String,
  phone: String,
  position: String
}

Response: 201 Created
{
  organization: Organization (updated)
}
```

#### DELETE /organizations/:id/contacts/:contactId
```
Response: 200 OK
{
  organization: Organization (updated)
}
```

### 3. Excel Import Endpoints

#### POST /import/upload
```
Request: FormData
- file: File (xlsx)

Response: 202 Accepted
{
  importId: String,
  status: "processing"
}
```

#### GET /import/:importId
```
Response: 200 OK
{
  importLog: ImportLog
}
```

#### GET /import/:importId/preview
```
Response: 200 OK
{
  preview: {
    totalRows: Number,
    sampleData: [Object],
    detectedColumns: [String],
    warnings: [String]
  }
}
```

#### POST /import/:importId/confirm
```
Response: 202 Accepted
{
  message: "Import started",
  organizationsCreated: Number
}
```

### 4. Campaign Endpoints

#### GET /campaigns
```
Query Parameters:
- page: Number
- limit: Number
- status: String
- createdBy: String
- sortBy: String
- order: 'asc' | 'desc'

Response: 200 OK
{
  campaigns: [Campaign],
  pagination: { page, limit, total, pages }
}
```

#### POST /campaigns
```
Request:
{
  campaignName: String,
  description: String,
  emailContent: { subject, htmlBody, textBody },
  config: { /* campaign config */ }
}

Response: 201 Created
{
  campaign: Campaign
}
```

#### GET /campaigns/:id
```
Response: 200 OK
{
  campaign: Campaign
}
```

#### PUT /campaigns/:id
```
Request: Partial Campaign Object
Response: 200 OK
{
  campaign: Campaign
}
```

#### DELETE /campaigns/:id
```
Response: 200 OK
{
  message: "Campaign deleted"
}
```

#### POST /campaigns/:id/attachments
```
Request: FormData
- file: File

Response: 201 Created
{
  attachment: {
    id, fileName, fileType, s3Url
  }
}
```

#### DELETE /campaigns/:id/attachments/:attachmentId
```
Response: 200 OK
```

#### POST /campaigns/:id/send
```
Request:
{
  targetOrganizationIds: [String],
  dryRun: Boolean (optional, for testing)
}

Response: 202 Accepted
{
  message: "Campaign sending started",
  queuedCount: Number
}
```

#### POST /campaigns/:id/pause
```
Response: 200 OK
{
  campaign: Campaign (status: 'Paused')
}
```

#### POST /campaigns/:id/resume
```
Response: 200 OK
{
  campaign: Campaign (status: 'Sending')
}
```

#### POST /campaigns/:id/cancel
```
Response: 200 OK
{
  campaign: Campaign (status: 'Cancelled')
}
```

#### POST /campaigns/:id/duplicate
```
Response: 201 Created
{
  campaign: Campaign (new copy)
}
```

#### POST /campaigns/:id/retry-failed
```
Response: 202 Accepted
{
  message: "Retry job queued",
  retriedCount: Number
}
```

### 5. Email Log & Tracking Endpoints

#### GET /campaigns/:campaignId/email-logs
```
Query Parameters:
- page: Number
- limit: Number
- status: String
- recipientEmail: String
- sortBy: String

Response: 200 OK
{
  logs: [EmailLog],
  pagination: { page, limit, total, pages }
}
```

#### GET /campaigns/:campaignId/email-logs/:logId
```
Response: 200 OK
{
  log: EmailLog
}
```

#### GET /campaigns/:campaignId/email-logs/organization/:organizationId
```
Response: 200 OK
{
  logs: [EmailLog]
}
```

### 6. Email Validation Endpoints

#### POST /validate/email
```
Request:
{
  email: String
}

Response: 200 OK
{
  email: String,
  status: 'VALID' | 'INVALID' | 'RISKY' | 'UNKNOWN',
  reason: String
}
```

#### POST /validate/emails-batch
```
Request:
{
  emails: [String]
}

Response: 200 OK
{
  results: [
    {
      email: String,
      status: String,
      reason: String
    }
  ]
}
```

#### POST /validate/organization/:id
```
Request: (empty body)
Response: 202 Accepted
{
  message: "Validation started",
  contactsToValidate: Number
}
```

### 7. Dashboard & Analytics Endpoints

#### GET /analytics/dashboard
```
Response: 200 OK
{
  metrics: {
    totalOrganizations: Number,
    totalContacts: Number,
    validContacts: Number,
    invalidContacts: Number,
    emailsSent: Number,
    emailsDelivered: Number,
    emailsOpened: Number,
    emailsClicked: Number,
    emailsFailed: Number,
    bounceRate: Number,
    openRate: Number,
    clickRate: Number,
    campaignsActive: Number,
    companiesContacted: Number,
    companiesRemaining: Number,
    companiesNoValidContact: Number
  },
  recentActivities: [Object],
  topPerformingCampaigns: [Campaign]
}
```

#### GET /analytics/campaigns/:campaignId
```
Response: 200 OK
{
  campaignStats: {
    campaign: Campaign,
    timeline: [
      {
        date: String,
        sent: Number,
        delivered: Number,
        opened: Number,
        clicked: Number,
        failed: Number
      }
    ],
    organizationStats: [
      {
        organizationId: String,
        companyName: String,
        contactSelected: String,
        emailStatus: String,
        openedAt: Date
      }
    ]
  }
}
```

#### GET /analytics/validation-status
```
Response: 200 OK
{
  validationStats: {
    valid: Number,
    invalid: Number,
    risky: Number,
    unknown: Number,
    byOrganization: [Object]
  }
}
```

### 8. Reports & Export Endpoints

#### GET /reports/export
```
Query Parameters:
- campaignId: String
- format: 'csv' | 'excel' | 'pdf'
- filters: JSON (optional)

Response: 200 OK (File Download)
```

#### POST /reports/custom
```
Request:
{
  reportName: String,
  filters: Object,
  format: String,
  columns: [String]
}

Response: 200 OK (File Download)
```

### 9. Template Endpoints

#### GET /templates
```
Query Parameters:
- isPublic: Boolean
- category: String

Response: 200 OK
{
  templates: [Template]
}
```

#### POST /templates
```
Request:
{
  templateName: String,
  description: String,
  content: { subject, htmlBody, textBody },
  isPublic: Boolean,
  category: String
}

Response: 201 Created
{
  template: Template
}
```

#### GET /templates/:id
```
Response: 200 OK
{
  template: Template
}
```

#### PUT /templates/:id
```
Response: 200 OK
{
  template: Template
}
```

#### DELETE /templates/:id
```
Response: 200 OK
```

### 10. User Management Endpoints

#### GET /users
```
(Admin only)
Query Parameters:
- page: Number
- limit: Number
- role: String

Response: 200 OK
{
  users: [User],
  pagination: Object
}
```

#### POST /users
```
(Admin only)
Request:
{
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: 'Admin' | 'Operator' | 'Viewer'
}

Response: 201 Created
{
  user: User
}
```

#### PUT /users/:id
```
Response: 200 OK
{
  user: User
}
```

#### DELETE /users/:id
```
Response: 200 OK
```

### 11. Settings Endpoints

#### GET /settings
```
Response: 200 OK
{
  settings: SystemSettings
}
```

#### PUT /settings
```
(Admin only)
Request: Partial SystemSettings

Response: 200 OK
{
  settings: SystemSettings
}
```

#### GET /settings/blacklist
```
Response: 200 OK
{
  blacklist: [BlacklistedEmail]
}
```

#### POST /settings/blacklist
```
Request:
{
  email: String,
  reason: String
}

Response: 201 Created
{
  blacklistedEmail: BlacklistedEmail
}
```

#### DELETE /settings/blacklist/:id
```
Response: 200 OK
```

### 12. Notification Endpoints

#### GET /notifications
```
Query Parameters:
- page: Number
- limit: Number
- unreadOnly: Boolean

Response: 200 OK
{
  notifications: [Notification]
}
```

#### PATCH /notifications/:id/read
```
Response: 200 OK
```

---

## Folder Structure

```
email-campaign-platform/
│
├── .env.example                  # Environment variables template
├── .env.local                    # Local environment (git ignored)
├── .env.production               # Production environment
├── .gitignore
├── docker-compose.yml            # Docker setup for MongoDB, Redis
├── Dockerfile                    # Backend Docker image
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
├── ARCHITECTURE.md               # This file
│
├── frontend/                     # React + Vite Frontend
│  ├── index.html
│  ├── package.json
│  ├── vite.config.ts
│  ├── tsconfig.json
│  ├── tailwind.config.js
│  ├── postcss.config.js
│  │
│  ├── public/                    # Static assets
│  │  ├── logo.svg
│  │  ├── favicon.ico
│  │  └── ...
│  │
│  ├── src/
│  │  ├── main.tsx               # React entry point
│  │  ├── App.tsx                # Root component
│  │  ├── index.css
│  │  │
│  │  ├── components/            # Reusable components
│  │  │  ├── common/
│  │  │  │  ├── Navbar.tsx
│  │  │  │  ├── Sidebar.tsx
│  │  │  │  ├── Header.tsx
│  │  │  │  └── Footer.tsx
│  │  │  │
│  │  │  ├── forms/
│  │  │  │  ├── LoginForm.tsx
│  │  │  │  ├── CampaignForm.tsx
│  │  │  │  ├── EmailComposer.tsx
│  │  │  │  ├── ExcelUploadForm.tsx
│  │  │  │  └── ...
│  │  │  │
│  │  │  ├── tables/
│  │  │  │  ├── OrganizationsTable.tsx
│  │  │  │  ├── CampaignsTable.tsx
│  │  │  │  ├── EmailLogsTable.tsx
│  │  │  │  ├── ContactsTable.tsx
│  │  │  │  └── ...
│  │  │  │
│  │  │  ├── charts/
│  │  │  │  ├── SentVsFailedChart.tsx
│  │  │  │  ├── OpenRateTrendChart.tsx
│  │  │  │  ├── ClickRateTrendChart.tsx
│  │  │  │  ├── ValidationStatusChart.tsx
│  │  │  │  ├── CampaignPerformanceChart.tsx
│  │  │  │  └── DailyActivityChart.tsx
│  │  │  │
│  │  │  ├── dialogs/
│  │  │  │  ├── ConfirmDialog.tsx
│  │  │  │  ├── ErrorDialog.tsx
│  │  │  │  ├── CampaignDetailsModal.tsx
│  │  │  │  └── ...
│  │  │  │
│  │  │  └── shared/
│  │  │     ├── Toast.tsx
│  │  │     ├── Spinner.tsx
│  │  │     ├── Badge.tsx
│  │  │     └── ...
│  │  │
│  │  ├── pages/                 # Page components (one per route)
│  │  │  ├── auth/
│  │  │  │  ├── Login.tsx
│  │  │  │  ├── Register.tsx
│  │  │  │  └── ForgotPassword.tsx
│  │  │  │
│  │  │  ├── dashboard/
│  │  │  │  ├── Dashboard.tsx
│  │  │  │  └── Analytics.tsx
│  │  │  │
│  │  │  ├── organizations/
│  │  │  │  ├── Organizations.tsx
│  │  │  │  ├── OrganizationDetail.tsx
│  │  │  │  └── ImportExcel.tsx
│  │  │  │
│  │  │  ├── campaigns/
│  │  │  │  ├── Campaigns.tsx
│  │  │  │  ├── CampaignDetail.tsx
│  │  │  │  ├── CampaignBuilder.tsx
│  │  │  │  └── CampaignResults.tsx
│  │  │  │
│  │  │  ├── reports/
│  │  │  │  ├── Reports.tsx
│  │  │  │  └── ReportBuilder.tsx
│  │  │  │
│  │  │  ├── settings/
│  │  │  │  ├── Settings.tsx
│  │  │  │  ├── UserManagement.tsx
│  │  │  │  └── SystemSettings.tsx
│  │  │  │
│  │  │  └── NotFound.tsx
│  │  │
│  │  ├── hooks/                 # Custom React hooks
│  │  │  ├── useAuth.ts
│  │  │  ├── useCampaigns.ts
│  │  │  ├── useOrganizations.ts
│  │  │  ├── usePagination.ts
│  │  │  ├── useLocalStorage.ts
│  │  │  └── ...
│  │  │
│  │  ├── services/              # API communication
│  │  │  ├── api.ts              # Axios instance with interceptors
│  │  │  ├── authService.ts
│  │  │  ├── campaignService.ts
│  │  │  ├── organizationService.ts
│  │  │  ├── emailService.ts
│  │  │  ├── importService.ts
│  │  │  ├── analyticsService.ts
│  │  │  ├── reportService.ts
│  │  │  └── ...
│  │  │
│  │  ├── store/                 # State management (React Query)
│  │  │  ├── queryClient.ts
│  │  │  └── queries/            # React Query custom hooks
│  │  │     ├── useAuthQueries.ts
│  │  │     ├── useCampaignQueries.ts
│  │  │     ├── useOrganizationQueries.ts
│  │  │     └── ...
│  │  │
│  │  ├── types/                 # TypeScript types & interfaces
│  │  │  ├── index.ts
│  │  │  ├── auth.ts
│  │  │  ├── campaign.ts
│  │  │  ├── organization.ts
│  │  │  ├── emailLog.ts
│  │  │  ├── api.ts
│  │  │  └── ...
│  │  │
│  │  ├── utils/                 # Utility functions
│  │  │  ├── constants.ts
│  │  │  ├── helpers.ts
│  │  │  ├── validation.ts
│  │  │  ├── formatting.ts
│  │  │  ├── dateUtils.ts
│  │  │  └── ...
│  │  │
│  │  ├── styles/                # Global styles
│  │  │  ├── globals.css
│  │  │  ├── variables.css
│  │  │  └── animations.css
│  │  │
│  │  ├── config/
│  │  │  ├── routes.ts           # Route definitions
│  │  │  └── settings.ts
│  │  │
│  │  └── middleware/
│  │     ├── auth.tsx            # Auth guard component
│  │     └── roleGuard.tsx       # Role-based access control
│  │
│  └── tests/
│     ├── unit/
│     ├── integration/
│     └── e2e/
│
├── backend/                      # Node.js + Express Backend
│  ├── src/
│  │  ├── index.ts               # Application entry point
│  │  ├── server.ts              # Express server setup
│  │  ├── config/
│  │  │  ├── database.ts         # MongoDB connection
│  │  │  ├── redis.ts            # Redis connection
│  │  │  ├── aws.ts              # AWS SES & S3 config
│  │  │  ├── env.ts              # Environment variables validation
│  │  │  ├── emailValidator.ts   # Email validation service config
│  │  │  └── constants.ts
│  │  │
│  │  ├── middleware/
│  │  │  ├── auth.ts             # JWT authentication
│  │  │  ├── errorHandler.ts     # Error handling middleware
│  │  │  ├── validation.ts       # Request validation
│  │  │  ├── cors.ts             # CORS configuration
│  │  │  ├── rateLimit.ts        # Rate limiting
│  │  │  ├── logging.ts          # Request logging
│  │  │  └── audit.ts            # Audit logging
│  │  │
│  │  ├── models/                # Mongoose schemas
│  │  │  ├── User.ts
│  │  │  ├── Organization.ts
│  │  │  ├── Campaign.ts
│  │  │  ├── EmailLog.ts
│  │  │  ├── EmailTemplate.ts
│  │  │  ├── ImportLog.ts
│  │  │  ├── BlacklistedEmail.ts
│  │  │  ├── AuditLog.ts
│  │  │  ├── SystemSettings.ts
│  │  │  └── Notification.ts
│  │  │
│  │  ├── repositories/          # Data access layer (Repository pattern)
│  │  │  ├── BaseRepository.ts   # Abstract base class
│  │  │  ├── UserRepository.ts
│  │  │  ├── OrganizationRepository.ts
│  │  │  ├── CampaignRepository.ts
│  │  │  ├── EmailLogRepository.ts
│  │  │  ├── TemplateRepository.ts
│  │  │  ├── ImportLogRepository.ts
│  │  │  └── ...
│  │  │
│  │  ├── services/              # Business logic layer
│  │  │  ├── auth/
│  │  │  │  ├── AuthService.ts
│  │  │  │  ├── JwtService.ts
│  │  │  │  └── PasswordService.ts
│  │  │  │
│  │  │  ├── campaign/
│  │  │  │  ├── CampaignService.ts
│  │  │  │  ├── CampaignBuilder.ts
│  │  │  │  └── CampaignValidator.ts
│  │  │  │
│  │  │  ├── organization/
│  │  │  │  ├── OrganizationService.ts
│  │  │  │  └── ContactValidator.ts
│  │  │  │
│  │  │  ├── excel/
│  │  │  │  ├── ExcelParserService.ts
│  │  │  │  ├── ExcelValidator.ts
│  │  │  │  └── DuplicateDetector.ts
│  │  │  │
│  │  │  ├── email/
│  │  │  │  ├── EmailService.ts      # AWS SES integration
│  │  │  │  ├── EmailValidator.ts    # Email validation logic
│  │  │  │  ├── EmailPersonalizer.ts # Merge field replacement
│  │  │  │  ├── EmailTemplate.ts     # Email content building
│  │  │  │  └── ContactSelector.ts   # Contact selection algorithm
│  │  │  │
│  │  │  ├── queue/
│  │  │  │  ├── QueueService.ts      # BullMQ wrapper
│  │  │  │  ├── QueueProcessor.ts    # Worker logic
│  │  │  │  └── QueueScheduler.ts    # Job scheduling
│  │  │  │
│  │  │  ├── storage/
│  │  │  │  ├── S3Service.ts         # AWS S3 integration
│  │  │  │  ├── FileValidator.ts
│  │  │  │  └── FileHandler.ts
│  │  │  │
│  │  │  ├── analytics/
│  │  │  │  ├── AnalyticsService.ts
│  │  │  │  ├── MetricsCalculator.ts
│  │  │  │  └── ReportGenerator.ts
│  │  │  │
│  │  │  ├── user/
│  │  │  │  ├── UserService.ts
│  │  │  │  └── RoleService.ts
│  │  │  │
│  │  │  └── notification/
│  │  │     └── NotificationService.ts
│  │  │
│  │  ├── routes/                # API route handlers
│  │  │  ├── index.ts            # Route aggregator
│  │  │  ├── auth.ts
│  │  │  ├── organizations.ts
│  │  │  ├── campaigns.ts
│  │  │  ├── emailLogs.ts
│  │  │  ├── import.ts
│  │  │  ├── analytics.ts
│  │  │  ├── templates.ts
│  │  │  ├── users.ts
│  │  │  ├── settings.ts
│  │  │  ├── reports.ts
│  │  │  └── notifications.ts
│  │  │
│  │  ├── controllers/           # Request handlers
│  │  │  ├── AuthController.ts
│  │  │  ├── OrganizationController.ts
│  │  │  ├── CampaignController.ts
│  │  │  ├── EmailLogController.ts
│  │  │  ├── ImportController.ts
│  │  │  ├── AnalyticsController.ts
│  │  │  ├── TemplateController.ts
│  │  │  ├── UserController.ts
│  │  │  ├── SettingsController.ts
│  │  │  ├── ReportController.ts
│  │  │  └── NotificationController.ts
│  │  │
│  │  ├── validators/            # Input validation schemas
│  │  │  ├── auth.ts
│  │  │  ├── campaign.ts
│  │  │  ├── organization.ts
│  │  │  ├── email.ts
│  │  │  └── ...
│  │  │
│  │  ├── types/                 # TypeScript interfaces
│  │  │  ├── index.ts
│  │  │  ├── models.ts
│  │  │  ├── api.ts
│  │  │  ├── services.ts
│  │  │  └── ...
│  │  │
│  │  ├── utils/                 # Utility functions
│  │  │  ├── logger.ts           # Logging utility
│  │  │  ├── errors.ts           # Custom error classes
│  │  │  ├── helpers.ts
│  │  │  ├── validators.ts
│  │  │  ├── formatters.ts
│  │  │  ├── constants.ts
│  │  │  └── ...
│  │  │
│  │  ├── queue/                 # BullMQ job configuration
│  │  │  ├── jobs/
│  │  │  │  ├── sendEmailJob.ts
│  │  │  │  ├── validateContactsJob.ts
│  │  │  │  ├── importExcelJob.ts
│  │  │  │  └── ...
│  │  │  │
│  │  │  └── workers/
│  │  │     ├── emailWorker.ts
│  │  │     ├── validationWorker.ts
│  │  │     └── importWorker.ts
│  │  │
│  │  └── scripts/               # Utility scripts
│  │     ├── seedDatabase.ts
│  │     ├── migrate.ts
│  │     ├── setupIndexes.ts
│  │     └── ...
│  │
│  ├── tests/
│  │  ├── unit/
│  │  │  ├── services/
│  │  │  ├── repositories/
│  │  │  └── utils/
│  │  │
│  │  ├── integration/
│  │  │  ├── routes/
│  │  │  ├── services/
│  │  │  └── queue/
│  │  │
│  │  └── fixtures/
│  │     ├── mockData.ts
│  │     └── testHelpers.ts
│  │
│  ├── .env.example
│  ├── .env.local
│  ├── .env.production
│  ├── package.json
│  ├── tsconfig.json
│  ├── jest.config.js
│  ├── nodemon.json               # Development watch config
│  └── Dockerfile
│
└── docs/                         # Documentation
   ├── API.md                     # API documentation
   ├── DEPLOYMENT.md              # Deployment guide
   ├── SETUP.md                   # Local setup guide
   ├── DATABASE.md                # Database setup
   ├── ARCHITECTURE.md            # System design
   ├── EMAIL_VALIDATION.md        # Email validation logic
   ├── QUEUE_SYSTEM.md            # Queue system documentation
   ├── AWS_SETUP.md               # AWS configuration
   ├── TROUBLESHOOTING.md         # Common issues
   ├── SECURITY.md                # Security best practices
   └── TESTING.md                 # Testing strategy
```

---

## Technology Stack Decisions

### Frontend Choices

| Technology | Rationale |
|------------|-----------|
| **React** | Industry standard for SPA development, large ecosystem, excellent tooling |
| **Vite** | Lightning-fast build tool, excellent dev experience, instant HMR |
| **TypeScript** | Type safety reduces bugs, better IDE support, self-documenting code |
| **Tailwind CSS** | Utility-first approach for rapid UI development, customizable, minimal bundle size |
| **ShadCN UI** | Pre-built accessible components built on Radix UI, fully customizable |
| **React Query** | Powerful data fetching, caching, synchronization library for API calls |
| **React Hook Form** | Lightweight form management, minimal re-renders, excellent validation support |
| **TipTap** | Headless, highly customizable rich text editor perfect for email composition |
| **Recharts** | Composable charting library built on React, responsive by default |
| **Axios** | Promise-based HTTP client with interceptor support for auth tokens |

### Backend Choices

| Technology | Rationale |
|------------|-----------|
| **Node.js** | JavaScript runtime, non-blocking I/O perfect for I/O-heavy operations like email sending |
| **Express.js** | Minimal, unopinionated framework giving full control over architecture |
| **TypeScript** | Ensures type safety, better maintainability for scalable backend |
| **MongoDB** | Flexible schema perfect for nested documents (Organizations with Contacts) |
| **Mongoose** | ODM with schema validation, relationships support, hooks |
| **BullMQ** | Modern job queue library built on Redis, handles delayed jobs, retries, priorities |
| **Redis** | In-memory data store for caching, session storage, queue management |
| **AWS SES** | Cost-effective, scalable email service with bounce tracking |
| **AWS S3** | Reliable object storage for file attachments, signed URLs for secure downloads |
| **JWT** | Stateless authentication, perfect for distributed systems |
| **deep-email-validator** | Comprehensive email validation including MX checks, disposable detection |

### Database Design Principles

1. **Embedded Documents**: Organizations contain contacts as nested arrays (avoiding excessive joins)
2. **Denormalization for Performance**: Campaign statistics stored at document level to avoid aggregations
3. **Comprehensive Indexing**: Strategic indexes on frequently queried fields
4. **Audit Trail**: Separate collection for tracking changes to critical entities
5. **Soft Deletes**: Support for data recovery, maintains referential integrity
6. **Timestamps**: Created/Updated/Deleted timestamps for all documents

### Queue System Architecture

**Why BullMQ?**
- Built on Redis for reliability and persistence
- Job priorities support
- Delayed jobs for staggered sending (30-90 second intervals)
- Automatic retry with exponential backoff
- Job completion events for real-time tracking
- Scalable worker processes

**Queue Jobs:**
1. `sendEmailJob` - Processes individual email sending
2. `validateContactsJob` - Validates organization contacts
3. `importExcelJob` - Parses and imports Excel file
4. `syncDeliveryStatusJob` - Polls AWS SES for delivery status

### Email Validation Strategy

**Multi-Step Validation Pipeline:**
1. **Format Validation** - Basic regex check
2. **Domain Validation** - Verify domain exists via DNS
3. **MX Record Check** - Confirm mail server records
4. **Disposable Email Detection** - Block temporary email services
5. **SMTP Validation** (optional) - Connect to mail server
6. **Cache Results** - Store validation results (configurable TTL)

**Status Values:**
- `VALID` - Passed all checks
- `INVALID` - Failed format, domain, or MX check
- `RISKY` - Valid but suspicious (disposable, many complaints)
- `UNKNOWN` - Unable to determine (network issues, etc.)

### Contact Selection Algorithm

```
For each organization:
  1. Filter contacts with valid email validation status
  2. If valid contacts exist:
     - Select first valid contact
     - Mark organization as processed
     - Mark contact as selected for campaign
  3. Else:
     - Mark organization as ALL_CONTACTS_INVALID
     - Store for reporting
     - Alert admin

Result: Each organization has at most 1 email sent per campaign
```

### Security Considerations

1. **JWT Tokens**
   - Access tokens: 15 minutes
   - Refresh tokens: 7 days
   - Stored in HttpOnly cookies

2. **Password Security**
   - Bcrypt hashing with salt rounds = 12
   - Minimum 8 characters, complexity requirements
   - No password reuse (last 5 passwords)

3. **Role-Based Access Control**
   - Admin: Full access
   - Operator: Create/manage campaigns
   - Viewer: Read-only dashboard

4. **Input Validation**
   - All inputs validated server-side
   - File uploads scanned for viruses
   - Size limits enforced

5. **Rate Limiting**
   - API endpoints rate limited
   - File upload limits (max 50MB per file)
   - Email sending rate capped

6. **Data Privacy**
   - S3 files encrypted at rest
   - Database credentials encrypted
   - API keys stored in environment variables only
   - GDPR compliance for user data

### AWS Integration Strategy

**AWS SES Configuration:**
- Production verified sender email
- DKIM/SPF/DMARC configuration
- Bounce and complaint SNS notifications
- Configuration set for event publishing

**AWS S3 Configuration:**
- Separate bucket for attachments
- Versioning enabled for recovery
- Server-side encryption (SSE-S3)
- Lifecycle policies (auto-delete after 90 days)
- CloudFront CDN for faster downloads

---

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Backend Setup**
- [ ] Initialize Node.js project with TypeScript
- [ ] Set up Express.js with middleware stack
- [ ] Configure MongoDB connection and Mongoose schemas
- [ ] Implement JWT authentication
- [ ] Set up error handling and logging
- [ ] Configure environment variables

**Frontend Setup**
- [ ] Initialize Vite + React + TypeScript project
- [ ] Set up Tailwind CSS and ShadCN UI
- [ ] Configure React Query and Axios
- [ ] Create base layout components (Navbar, Sidebar)
- [ ] Set up routing structure
- [ ] Implement auth guards

**Deliverables:**
- Basic login/register functionality
- Dashboard stub
- CI/CD pipeline basics

### Phase 2: Core Features - Part 1 (Weeks 3-4)

**Organization & Contact Management**
- [ ] Create Organization CRUD APIs
- [ ] Implement Contact management within organizations
- [ ] Build Organizations list UI with filtering
- [ ] Build Contact management UI
- [ ] Implement organization search functionality

**User Management & Settings**
- [ ] Admin user management endpoints
- [ ] Role-based access control middleware
- [ ] Settings UI for system configuration
- [ ] Audit logging implementation

**Deliverables:**
- Working organization management
- User management interface
- Settings configuration page

### Phase 3: Core Features - Part 2 (Weeks 5-6)

**Excel Import System**
- [ ] Implement Excel parser with XLSX library
- [ ] Dynamic column detection algorithm
- [ ] Duplicate detection (organizations & emails)
- [ ] Import validation and error reporting
- [ ] Progress tracking for large imports
- [ ] Build import UI with preview functionality
- [ ] Implement import summary display

**Email Validation Engine**
- [ ] Integrate deep-email-validator
- [ ] Build email validation APIs
- [ ] Implement caching strategy
- [ ] Batch validation endpoint
- [ ] Background job for organization-wide validation
- [ ] Validation status UI component

**Deliverables:**
- Excel import working end-to-end
- Email validation system fully functional
- Import history and logs

### Phase 4: Campaign Management (Weeks 7-8)

**Campaign CRUD & Builder**
- [ ] Campaign creation/editing APIs
- [ ] Campaign status management
- [ ] Campaign duplication functionality
- [ ] Template system (create, save, reuse)
- [ ] Build campaign builder UI with TipTap editor
- [ ] Rich text editor with formatting options
- [ ] Merge field support with preview

**Campaign Configuration**
- [ ] Sending schedule configuration
- [ ] Retry policy setup
- [ ] Blacklist configuration
- [ ] Campaign validation before sending

**Deliverables:**
- Full campaign builder interface
- Campaign management dashboard
- Template management system

### Phase 5: Email Sending Engine (Weeks 9-10)

**Queue System Setup**
- [ ] Redis and BullMQ configuration
- [ ] Queue job definitions
- [ ] Worker process setup
- [ ] Job persistence and recovery

**AWS Integration**
- [ ] AWS SES configuration
- [ ] Bounce/complaint tracking via SNS
- [ ] S3 integration for attachments
- [ ] Signed URL generation

**Email Sending Logic**
- [ ] Contact selection algorithm implementation
- [ ] Email personalization with merge fields
- [ ] Batch email processing with delays
- [ ] Campaign status management (pause/resume/cancel)
- [ ] Retry mechanism for failed emails

**Deliverables:**
- Emails sending through AWS SES
- Queue system handling concurrent jobs
- Bounce and delivery tracking working

### Phase 6: Analytics & Reporting (Weeks 11-12)

**Dashboard Development**
- [ ] Real-time metrics calculation
- [ ] Dashboard metric cards
- [ ] Charts implementation (Recharts)
  - [ ] Sent vs Failed
  - [ ] Open Rate Trend
  - [ ] Click Rate Trend
  - [ ] Validation Status Distribution
  - [ ] Campaign Performance Comparison
  - [ ] Daily Activity Chart

**Email Logs & Tracking**
- [ ] Email log CRUD endpoints
- [ ] Email log UI with filtering/search
- [ ] Status tracking and visualization
- [ ] Open and click tracking

**Reporting System**
- [ ] Report builder API
- [ ] Export to CSV, Excel, PDF
- [ ] Custom report generation
- [ ] Historical report storage

**Deliverables:**
- Complete analytics dashboard
- Working email tracking
- Export functionality for reports

### Phase 7: Polish & Testing (Weeks 13-14)

**Testing**
- [ ] Unit tests for services (target: 80% coverage)
- [ ] Integration tests for APIs
- [ ] E2E tests for critical flows
- [ ] Load testing for queue system

**Performance Optimization**
- [ ] Frontend bundle optimization
- [ ] Database query optimization
- [ ] Caching strategies
- [ ] CDN configuration for S3 files

**UI/UX Polish**
- [ ] Responsive design refinement
- [ ] Animation and transitions
- [ ] Loading states and skeleton screens
- [ ] Error message improvements
- [ ] User feedback notifications

**Documentation**
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment guide
- [ ] Setup instructions
- [ ] Troubleshooting guide
- [ ] Code comments and JSDoc

**Deliverables:**
- Production-ready application
- Comprehensive documentation
- Test coverage > 80%

### Phase 8: Deployment & Launch (Week 15)

**Infrastructure Setup**
- [ ] Docker containerization
- [ ] Docker Compose for local development
- [ ] Production database setup
- [ ] Redis cluster setup (if needed)
- [ ] AWS resources provisioning

**CI/CD Pipeline**
- [ ] GitHub Actions workflow
- [ ] Automated testing on push
- [ ] Automated deployment on release
- [ ] Monitoring and logging setup

**Security Audit**
- [ ] Security headers validation
- [ ] HTTPS/SSL configuration
- [ ] Data encryption verification
- [ ] Access control audit

**Deliverables:**
- Application deployed to production
- Monitoring and alerting active
- Disaster recovery plan in place

### Phase 9: Post-Launch (Week 16+)

**Monitoring & Maintenance**
- [ ] Production monitoring setup
- [ ] Performance tracking
- [ ] Bug fixes and patches
- [ ] User feedback implementation

**Planned Enhancements**
- [ ] A/B testing functionality
- [ ] Advanced scheduling options
- [ ] Webhook support for custom integrations
- [ ] API rate limit per user
- [ ] Two-factor authentication
- [ ] SAML/SSO support
- [ ] Campaign templates library
- [ ] AI-powered subject line suggestions
- [ ] Spam score detection

---

## Key Metrics & Success Criteria

### Performance Targets
- API response time: < 200ms (p95)
- Dashboard load time: < 2 seconds
- Email validation: < 5 seconds for batch of 1000
- File upload: Support up to 50MB files
- Queue processing: 100+ emails/minute per worker

### Reliability Targets
- System uptime: 99.9%
- Email delivery rate: > 95%
- Queue job success rate: > 98%
- Bounce handling: Automatic retry with exponential backoff

### Scalability Targets
- Support 10M+ contacts
- Handle 1000+ concurrent users
- Process 100K+ emails per day
- Support unlimited organizations

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Email delivery to spam | High | SPF/DKIM/DMARC setup, send rate limiting, warm-up period |
| Queue job failures | High | Retry mechanism, dead-letter queue, monitoring alerts |
| Database performance | High | Proper indexing, connection pooling, read replicas |
| S3 file upload failures | Medium | Client-side retry, multipart upload support |
| Excel parsing errors | Medium | Comprehensive validation, detailed error reporting |
| Authentication breaches | High | JWT best practices, rate limiting, audit logging |

---

## Next Steps

1. **Review Architecture** - Get stakeholder approval
2. **Set Up Development Environment** - Docker, MongoDB, Redis
3. **Begin Phase 1** - Backend and frontend foundation
4. **Establish CI/CD** - Automated testing and deployment
5. **Create Detailed API Specs** - Swagger/OpenAPI documentation

