# Email Campaign Management Platform - Backend

Production-ready backend for email outreach & campaign management platform.

## Technology Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Queue**: BullMQ + Redis
- **Authentication**: JWT
- **Validation**: express-validator
- **File Upload**: Multer
- **Excel Processing**: XLSX

## Prerequisites

- Node.js 20+ and npm
- MongoDB 7.0+
- Redis 7+
- Docker & Docker Compose (for containerized setup)

## Quick Start (Docker)

### 1. Clone the repository

```bash
git clone <repository-url>
cd Email_Sender
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env.local
```

Edit `backend/.env.local` with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://root:password@mongodb:27017/email-campaign?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=password
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Google OAuth API Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
```

### 3. Start services with Docker Compose

```bash
docker-compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- Backend API (port 5000)

### 4. Verify setup

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-06-09T10:00:00.000Z",
  "version": "v1"
}
```

## Local Development Setup (Without Docker)

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local with your local MongoDB and Redis connections
```

### 3. Start development server

```bash
npm run dev
```

The server will start on `http://localhost:5000`.

### 4. Available scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Run production build
npm test             # Run tests
npm test:watch      # Run tests in watch mode
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
npm run db:seed     # Seed database with sample data
npm run db:migrate  # Run database migrations
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── env.ts       # Environment variables
│   │   ├── database.ts  # MongoDB connection
│   │   └── redis.ts     # Redis connection
│   ├── models/          # Mongoose schemas
│   ├── services/        # Business logic
│   │   ├── auth/
│   │   ├── organization/
│   │   ├── campaign/
│   │   ├── excel/
│   │   └── email/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── server.ts        # Express server setup
│   └── index.ts         # Entry point
├── tests/               # Test files
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env.example
```

## API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <access_token>
```

### Authentication Endpoints

#### Register

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Refresh Token

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### Organization Endpoints

#### Create Organization

```bash
POST /api/v1/organizations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "companyName": "ABC Logistics",
  "industry": "Logistics",
  "website": "www.abc-logistics.com",
  "contacts": [
    {
      "name": "John Smith",
      "email": "john@abc.com",
      "phone": "1234567890",
      "position": "Manager"
    }
  ]
}
```

#### List Organizations

```bash
GET /api/v1/organizations?page=1&limit=20&search=ABC
Authorization: Bearer <access_token>
```

#### Get Organization

```bash
GET /api/v1/organizations/:id
Authorization: Bearer <access_token>
```

#### Update Organization

```bash
PUT /api/v1/organizations/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "companyName": "ABC Logistics Inc.",
  "industry": "Logistics & Warehousing"
}
```

#### Delete Organization

```bash
DELETE /api/v1/organizations/:id
Authorization: Bearer <access_token>
```

#### Add Contact

```bash
POST /api/v1/organizations/:id/contacts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@abc.com",
  "phone": "0987654321",
  "position": "Director"
}
```

#### Update Contact

```bash
PUT /api/v1/organizations/:id/contacts/:contactId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "position": "Senior Director"
}
```

#### Delete Contact

```bash
DELETE /api/v1/organizations/:id/contacts/:contactId
Authorization: Bearer <access_token>
```

### Campaign Endpoints

#### Create Campaign

```bash
POST /api/v1/campaigns
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "campaignName": "Q2 Outreach 2026",
  "description": "Second quarter outreach campaign",
  "emailContent": {
    "subject": "Special Offer for {{company_name}}",
    "htmlBody": "<p>Hello {{contact_name}},</p><p>We have a special offer...</p>",
    "from": "noreply@emailoutreach.com",
    "replyTo": "support@emailoutreach.com"
  },
  "config": {
    "targetOrganizations": ["org_id_1", "org_id_2"],
    "sendingConfig": {
      "minimumDelaySeconds": 30,
      "maximumDelaySeconds": 90,
      "dailySendLimit": 500,
      "startDate": "2026-06-10T00:00:00Z",
      "timeZone": "UTC"
    }
  }
}
```

#### List Campaigns

```bash
GET /api/v1/campaigns?page=1&limit=20&status=Draft
Authorization: Bearer <access_token>
```

#### Get Campaign

```bash
GET /api/v1/campaigns/:id
Authorization: Bearer <access_token>
```

#### Update Campaign

```bash
PUT /api/v1/campaigns/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "campaignName": "Q2 Outreach 2026 - Updated",
  "emailContent": {
    "subject": "Updated: Special Offer for {{company_name}}"
  }
}
```

#### Duplicate Campaign

```bash
POST /api/v1/campaigns/:id/duplicate
Authorization: Bearer <access_token>
```

#### Pause Campaign

```bash
POST /api/v1/campaigns/:id/pause
Authorization: Bearer <access_token>
```

#### Resume Campaign

```bash
POST /api/v1/campaigns/:id/resume
Authorization: Bearer <access_token>
```

#### Cancel Campaign

```bash
POST /api/v1/campaigns/:id/cancel
Authorization: Bearer <access_token>
```

#### Validate Contact Selection

```bash
POST /api/v1/campaigns/:id/validate-contacts
Authorization: Bearer <access_token>
```

### Import Endpoints

#### Download Template

```bash
GET /api/v1/import/template
```

#### Upload Excel File

```bash
POST /api/v1/import/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

{
  "file": <excel_file>
}
```

#### Get Import Status

```bash
GET /api/v1/import/:importId
Authorization: Bearer <access_token>
```

#### Confirm Import

```bash
POST /api/v1/import/:importId/confirm
Authorization: Bearer <access_token>
```

## Error Handling

All errors follow a standardized response format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": ["Additional details"],
  "requestId": "uuid",
  "timestamp": "2026-06-09T10:00:00.000Z"
}
```

### Common Error Codes

- `400` - Bad Request / Validation Error
- `401` - Unauthorized / Authentication Required
- `403` - Forbidden / Permission Denied
- `404` - Not Found
- `409` - Conflict / Duplicate Resource
- `500` - Internal Server Error

## Database Seeding

To seed the database with sample data:

```bash
npm run db:seed
```

This will create:
- Sample admin user
- Sample organizations with contacts
- Sample campaigns
- Sample email logs

## Troubleshooting

### MongoDB Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Ensure MongoDB is running

```bash
docker-compose up -d mongodb
```

### Redis Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**: Ensure Redis is running

```bash
docker-compose up -d redis
```

### Port Already in Use

If port 5000 is already in use:

```bash
# Change port in .env.local
PORT=5001

# Or kill process using the port
lsof -ti:5000 | xargs kill -9
```

### Database Authentication Failed

Ensure MongoDB credentials in `.env.local` match your MongoDB setup:

```
MONGODB_URI=mongodb://root:password@localhost:27017/email-campaign?authSource=admin
```

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secrets**: Use strong, randomly generated secrets in production
3. **CORS**: Configure allowed origins
4. **Rate Limiting**: Enable rate limiting for production
5. **HTTPS**: Always use HTTPS in production
6. **Password Hashing**: Passwords are hashed with bcrypt (12 rounds)
7. **SQL Injection**: Mongoose prevents NoSQL injection
8. **XSS Protection**: Helmet middleware provides security headers

## Production Deployment

### Build for Production

```bash
npm run build
npm prune --production
```

### Environment Setup

Create `.env.production` with production values:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=<production_mongodb_uri>
REDIS_HOST=<production_redis_host>
JWT_SECRET=<strong_random_secret>
JWT_REFRESH_SECRET=<strong_random_refresh_secret>
AWS_ACCESS_KEY_ID=<aws_key>
AWS_SECRET_ACCESS_KEY=<aws_secret>
AWS_S3_BUCKET=<production_bucket>
CORS_ORIGIN=https://app.emailoutreach.com
```

### Run with PM2

```bash
npm install -g pm2

pm2 start dist/index.js \
  --name "email-campaign-api" \
  --env production \
  --instances max \
  --log /var/log/email-campaign/app.log \
  --error /var/log/email-campaign/error.log
```

### Docker Production Build

```bash
docker build -t email-campaign-api:latest -f backend/Dockerfile ./backend
docker run -d \
  --name email-campaign-api \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e MONGODB_URI=<production_uri> \
  -e REDIS_HOST=<redis_host> \
  -p 5000:5000 \
  email-campaign-api:latest
```

## Contributing

1. Follow TypeScript strict mode
2. Write meaningful commit messages
3. Add tests for new features
4. Run linter before committing: `npm run lint`
5. Format code: `npm run format`

## License

ISC

## Support

For issues and questions, please open an issue on the repository.
