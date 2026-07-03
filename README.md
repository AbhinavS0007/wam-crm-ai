# WAM CRM AI

WhatsApp Multi-Account Manager, private team CRM and AI reply assistant.

## Current project status

- Phase 0: completed and approved
- Phase 1: implementation and local verification completed
- Phase 1 approved records: imported and verified
- GitHub repository: connected and synchronized
- GitHub Actions CI: passed
- Phase 2.0: formal Phase 1 closure evidence prepared; final confirmation pending

Actual WhatsApp, authentication, CRM and AI features have not been started yet.

## Technology used

### Backend

- Node.js
- Express
- JavaScript ES modules
- Zod
- dotenv
- Vitest
- Supertest
- ESLint

### Frontend

- React
- Vite
- Tailwind CSS
- Vitest
- React Testing Library
- ESLint

### Local infrastructure

- MongoDB 8
- Redis 8
- Docker Compose

## Requirements

Install these tools before starting:

- Node.js 24
- npm 11
- Git
- Docker Desktop
- VS Code or another code editor

Check the installed versions:

```bash
node -v
npm -v
git --version
docker --version
docker compose version
```

## Project structure

```text
wam-crm-ai/
├── backend/
├── frontend/
├── phase-0/
├── .github/
├── docker-compose.yml
├── package.json
└── README.md
```

## Local URLs

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:5001

Health endpoint:
http://localhost:5001/api/v1/health

MongoDB:
mongodb://localhost:27017

Redis:
redis://localhost:6379
```

## First-time setup

Open the project root in VS Code.

### 1. Install root tools

From the project root:

```bash
npm ci
```

### 2. Install backend dependencies

```bash
cd backend
npm ci
```

### 3. Create the backend environment file

Inside the `backend` folder:

```bash
cp .env.example .env
```

The local `.env` file is ignored by Git.

### 4. Install frontend dependencies

```bash
cd ../frontend
npm ci
```

### 5. Return to the project root

```bash
cd ..
```

## Start MongoDB and Redis

From the project root:

```bash
docker compose up -d
```

Check the services:

```bash
docker compose ps
```

Both services should show as healthy:

```text
wam-crm-ai-mongo
wam-crm-ai-redis
```

Stop the services normally with:

```bash
docker compose down
```

Do not use:

```bash
docker compose down -v
```

The `-v` option removes the project’s Docker volumes and local data.

## Start the backend

Open a terminal in VS Code:

```bash
cd backend
npm run dev
```

Expected output:

```text
WAM backend running at http://localhost:5001
```

Test the health endpoint:

```text
http://localhost:5001/api/v1/health
```

Expected response:

```json
{
  "data": {
    "status": "ok",
    "service": "wam-backend"
  },
  "meta": {
    "environment": "development"
  }
}
```

## Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

The page should show:

```text
WAM CRM AI
Frontend is running
```

## Run backend checks

```bash
cd backend
npm run lint
npm test
```

## Run frontend checks

```bash
cd frontend
npm run lint
npm test
npm run build
```

## Check project formatting

From the project root:

```bash
npm run format:check
```

## Run all required Phase 1 checks

From the project root:

```bash
cd backend
npm run lint
npm test

cd ../frontend
npm run lint
npm test
npm run build

cd ..
npm run format:check
```

All commands must complete without errors.

## Environment variables

The backend example file is:

```text
backend/.env.example
```

Current variables:

```env
NODE_ENV=development
PORT=5001
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/wam_crm_ai
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

Never commit the real:

```text
backend/.env
```

## Data-safety rules

Never commit:

- `.env` files
- Passwords
- API keys
- Encryption keys
- Production credentials
- Real WhatsApp session files
- Real client phone numbers
- Real client messages
- Real client personal information

Only synthetic test data should be used during development.

## Common problems

### Backend port is already in use

Check port `5001`:

```bash
lsof -nP -iTCP:5001 -sTCP:LISTEN
```

Stop the old development server with `Control + C`.

### Frontend port is already in use

Check port `5173`:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

### MongoDB or Redis port is already in use

Check the Docker services:

```bash
docker compose ps
docker ps
```

Expected local ports:

```text
MongoDB: 27017
Redis: 6379
```

### Docker services are unhealthy

Check their logs:

```bash
docker compose logs mongo
docker compose logs redis
```

Restart them:

```bash
docker compose restart
docker compose ps
```

### Environment configuration error

Confirm this file exists:

```text
backend/.env
```

Create it again from the example:

```bash
cd backend
cp .env.example .env
```

## Current phase boundaries

Phase 1 contains only the project foundation.

Do not connect a WhatsApp number or use real client data during Phase 1.

The following features will be built in later phases:

- Authentication
- Users and permissions
- Database models
- Encryption
- WhatsApp connection
- Messaging
- CRM
- AI reply assistance
- Media handling
- Production deployment
