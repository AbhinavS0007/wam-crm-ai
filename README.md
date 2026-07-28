# WAM CRM AI

WhatsApp Multi-Account Manager, private team CRM and AI reply assistant.

## Current project status

- Phase 0: project charter, scope, privacy and risk registers — approved
- Phase 1: repository foundation and local verification — approved
- Phase 2: authentication and user management — implemented
- Phase 3: CRM domain models (contacts, conversations, messages, tags, notes, follow-ups) — signed off
- Phase 4: field-level encryption and protected-PII storage — signed off
- Phase 5: WhatsApp connectivity via Baileys, real send/receive proven — signed off
- Phase 6: inbound WhatsApp messages persisted into the CRM models — implemented
- Phase 7: authenticated CRM serving API (conversations, threads, assignment, contact reveal) and idempotent outbound-send enqueue — implemented; CI sign-off pending
- Phase 8: outbound delivery worker — queued messages are delivered over WhatsApp with controlled retry (`queued → sending → sent` / `failed_permanent`) — implemented; CI sign-off pending
- Phase 9: conversation-centric CRM APIs — notes (role-visibility), follow-up tasks, tags (define + attach/detach), stage changes, and the activity timeline — implemented; CI sign-off pending
- Phase 10: frontend chat interface (MVP) — login, inbox, message thread, and idempotent send box consuming the CRM API — implemented; CI sign-off pending
- Phase 11: lead side-panel in the UI — stage control, notes, tags, follow-ups, audited phone-reveal, and the activity timeline (all permission-aware) — implemented; CI sign-off pending
- Phase 12: realtime updates — SSE + Redis pub/sub push live changes so the inbox, thread, and lead panel update instantly (no polling delay) — implemented; CI sign-off pending
- Phase 13: WhatsApp account management — add/connect (QR)/pause/resume/disconnect/remove numbers from the app via an in-process session manager, with live status — implemented; CI sign-off pending
- Phase 14: reliable send loop and session persistence — the outbound worker now delivers queued replies for active numbers (runtime state carries the org id it was missing), and connected numbers auto-reconnect on server restart from their saved encrypted auth-state (no re-scan) — implemented; CI sign-off pending
- Phase 15: team management and role-based logins — an admin adds teammates (admin/manager/staff) from a Team page, each new user must replace their temporary password on first sign-in (enforced server-side), and `npm run seed:dev-users` creates one user per role for testing — implemented; CI sign-off pending
- Phase 16: admin-defined custom lead stages — admin adds stages beyond the fixed 7 (e.g. "Hot Lead") from a Stages page, with create/archive/delete; everyone who can see a lead can apply any stage, built-in or custom — implemented; CI sign-off pending

The UI is now a live, working CRM: sign in → connect a WhatsApp number → inbox → open a lead →
reply, change stage (built-in or a custom one an admin defined), add notes, tag, schedule follow-ups, and reveal the phone (if permitted),
with updates arriving in realtime, and replies are delivered over WhatsApp for active numbers
that persist across restarts. The AI reply assistant, delivered/read receipts, media handling,
and production deployment are still to come.
Do not connect a real WhatsApp number or use real client data — only the disposable POC
number and synthetic data during development.

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
