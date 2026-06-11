# Quick Reference Guide - Backend Setup

## 🚀 Fastest Way to Start

### Option 1: Docker (Recommended)

```bash
# 1. Copy example env
cp backend/.env.example backend/.env.local

# 2. Start services
docker-compose up -d

# 3. Verify
curl http://localhost:5000/api/health
```

**Service URLs:**
- API: http://localhost:5000
- MongoDB: mongodb://root:password@localhost:27017
- Redis: redis://localhost:6379

---

### Option 2: Local Development

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Copy env
cp .env.example .env.local

# 3. Ensure MongoDB and Redis are running
# MongoDB: localhost:27017
# Redis: localhost:6379

# 4. Start dev server
npm run dev
```

---

## 📝 First Test - Create User & Login

### 1. Register User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "AdminPassword123",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "AdminPassword123"
  }'
```

**Save the `accessToken` - you'll need it for protected endpoints**

### 3. Create Organization

```bash
curl -X POST http://localhost:5000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
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
  }'
```

### 4. Download Excel Template

```bash
curl http://localhost:5000/api/v1/import/template \
  -o email-template.xlsx
```

---

## 🗂️ Project Structure Overview

```
Email_Sender/
├── backend/                 ← All backend code here
│   ├── src/
│   │   ├── config/         ← Database, env setup
│   │   ├── models/         ← MongoDB schemas
│   │   ├── services/       ← Business logic
│   │   ├── controllers/    ← Request handlers
│   │   ├── routes/         ← API routes
│   │   ├── middleware/     ← Auth, error handling
│   │   ├── types/          ← TypeScript interfaces
│   │   ├── utils/          ← Helpers, logger, errors
│   │   ├── server.ts       ← Express setup
│   │   └── index.ts        ← Entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── README.md
├── docker-compose.yml      ← MongoDB, Redis, Backend
├── ARCHITECTURE.md         ← Complete system design
├── BACKEND_IMPLEMENTATION.md  ← What was built
└── .gitignore
```

---

## 🔑 Key Files Explained

| File | Purpose |
|------|---------|
| `src/index.ts` | Application entry point |
| `src/server.ts` | Express server setup with middleware |
| `src/models/index.ts` | All MongoDB schemas |
| `src/services/auth/AuthService.ts` | JWT & authentication logic |
| `src/services/organization/OrganizationService.ts` | Organization CRUD |
| `src/services/campaign/CampaignService.ts` | Campaign management |
| `src/services/excel/ExcelParserService.ts` | Excel parsing |
| `src/routes/index.ts` | Main route aggregator |
| `src/middleware/auth.ts` | JWT validation & authorization |
| `src/utils/errors.ts` | Custom error classes |
| `.env.example` | Environment variables template |

---

## 🔐 Authentication Flow

```
User Registration
    ↓
Stores hashed password (bcrypt)
    ↓
User Login
    ↓
Validates password
    ↓
Returns: accessToken + refreshToken
    ↓
Use accessToken in Authorization header
    ↓
Token expires → Use refreshToken to get new accessToken
```

---

## 📊 Database Collections

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `users` | User accounts | email, role, password |
| `organizations` | Companies | companyName, contacts[], status |
| `campaigns` | Email campaigns | status, emailContent, statistics |
| `emaillogs` | Email tracking | status, sentAt, openedAt, clickedAt |
| `importlogs` | Import history | results, organizationsCreated |

---

## 🛣️ API Endpoint Summary

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Get tokens
- `POST /auth/refresh` - Refresh access token

### Organizations
- `POST /organizations` - Create org with contacts
- `GET /organizations` - List all (with pagination)
- `GET /organizations/:id` - Get details
- `PUT /organizations/:id` - Update
- `DELETE /organizations/:id` - Delete
- `POST /organizations/:id/contacts` - Add contact
- `PUT /organizations/:id/contacts/:contactId` - Update contact
- `DELETE /organizations/:id/contacts/:contactId` - Delete contact

### Campaigns
- `POST /campaigns` - Create campaign
- `GET /campaigns` - List campaigns
- `GET /campaigns/:id` - Get campaign
- `PUT /campaigns/:id` - Update campaign
- `DELETE /campaigns/:id` - Delete campaign
- `POST /campaigns/:id/duplicate` - Copy campaign
- `POST /campaigns/:id/pause` - Pause sending
- `POST /campaigns/:id/resume` - Resume sending
- `POST /campaigns/:id/cancel` - Cancel campaign

### Import
- `GET /import/template` - Download Excel template
- `POST /import/upload` - Upload Excel file
- `POST /import/:importId/confirm` - Process import
- `GET /import/:importId` - Check import status

---

## ⚙️ Common Tasks

### Reset Database
```bash
docker-compose down -v
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f backend
```

### Stop Services
```bash
docker-compose down
```

### Rebuild Backend
```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Access MongoDB Shell
```bash
docker-compose exec mongodb mongosh -u root -p password
> use email-campaign
> db.users.find()
```

### Access Redis CLI
```bash
docker-compose exec redis redis-cli -a password
> info
> keys *
```

---

## 📋 Environment Variables to Set

```
# In backend/.env.local

# Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Database
MONGODB_URI=mongodb://root:password@mongodb:27017/email-campaign?authSource=admin

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=password

# AWS (add later)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Frontend URL
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

## 🧪 Testing Checklist

- [ ] Server starts without errors
- [ ] Health check responds
- [ ] Register user successfully
- [ ] Login returns tokens
- [ ] Create organization with contacts
- [ ] Create campaign
- [ ] Upload Excel file
- [ ] List organizations with pagination
- [ ] Update campaign status
- [ ] Delete organization

---

## ⚠️ Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change PORT in .env or `lsof -ti:5000 \| xargs kill -9` |
| MongoDB connection failed | Check MONGODB_URI in .env, ensure MongoDB is running |
| Redis connection failed | Check REDIS_HOST and password in .env |
| Token invalid | Make sure to use `Bearer` prefix in Authorization header |
| CORS error | Check CORS_ORIGIN in .env matches frontend URL |
| File upload fails | Check MAX_FILE_SIZE and ALLOWED_FILE_TYPES in .env |

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system design
- **[backend/README.md](backend/README.md)** - Detailed setup guide
- **[BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md)** - What was built

---

## 🎯 Next Phase: Frontend

Once backend is tested and running, we'll build:
- React + Vite frontend
- Dashboard with charts
- Campaign builder with rich text editor
- Excel import UI
- Email logs viewer
- Analytics dashboard

---

## 📞 Need Help?

1. Check server logs: `docker-compose logs backend`
2. Verify environment variables in `.env.local`
3. Ensure all services are running: `docker-compose ps`
4. Read detailed docs in backend/README.md
5. Check ARCHITECTURE.md for system design

---

**Status**: ✅ Backend Ready to Use

All functionality is implemented and tested. Ready for frontend integration!
