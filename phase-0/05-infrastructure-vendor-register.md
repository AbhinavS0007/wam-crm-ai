# WAM CRM AI — Infrastructure and Vendor Register

## Document control

| Field | Value |
|---|---|
| Project | WAM CRM AI |
| Document | Infrastructure and Vendor Register |
| Version | 1.0 |
| Status | Approved provisional MVP baseline |
| Approval date | 2026-06-28 |
| Phase | Phase 0.6 |
| Related documents | 00-project-charter.md, 01-scope-and-feature-matrix.md, 02-roles-permissions-privacy.md, 03-whatsapp-number-policy.md, 04-data-retention-register.md |

---

## 1. Purpose

This document records the provisional infrastructure direction for local development, staging and production.

The goal is to keep the first version simple enough for one solo developer while still supporting:

- Long-running Node.js services
- Socket.IO connections
- Multiple WhatsApp sessions
- Redis-backed jobs and locks
- MongoDB persistence
- Private media storage
- Backups
- Monitoring
- Environment separation
- Future AI integration

No provider purchase is required during Phase 0.

Final provider pricing, region and plan selection must be reviewed again before purchase.

---

## 2. Architecture direction

The project will begin as a modular monolith.

Initial components:

- React frontend
- Express REST API
- Socket.IO realtime gateway
- WhatsApp session-service module
- BullMQ worker
- MongoDB
- Redis
- Private object storage
- AI provider adapter

The API and WhatsApp session service may initially run on the same server, but their code and lifecycle must remain separated.

This allows later process separation without redesigning the entire application.

---

## 3. Environment strategy

The project will use three environments:

1. Local
2. Staging
3. Production

Each environment must use separate:

- Databases
- Redis instances or databases
- WhatsApp authentication state
- Object-storage namespaces or buckets
- Encryption keys
- API keys
- Environment variables
- Test or production phone numbers

Staging and production must never share credentials.

---

## 4. Local development environment

### Approved direction

Use Docker Compose.

Local services:

- Node.js application
- MongoDB container
- Redis container
- BullMQ worker
- Socket.IO
- Fake test data
- Disposable WhatsApp number
- Local-only secrets
- Local temporary storage during text-only development

### Local development rules

- Do not use real client data.
- Do not connect a business-critical WhatsApp number.
- Do not require paid cloud services for the first coding steps.
- Keep the setup reproducible through Docker Compose.
- Keep environment variables in a local `.env` file that is excluded from Git.
- Use separate containers for MongoDB and Redis.
- Add private object storage only when media support begins.

### Local environment summary

```text
Frontend:
React + Vite

Backend:
Node.js + Express

Database:
Local MongoDB container

Redis:
Local Redis container

Queue:
BullMQ

Realtime:
Socket.IO

WhatsApp:
One disposable number during POC

Data:
Fake test data only
```

---

## 5. Staging environment

Staging will be introduced only after the local proof of concept is stable.

### Purpose

Staging is used for:

- Release-candidate testing
- Multi-account testing
- Reconnect and relink testing
- Backup and restore testing
- Network-failure testing
- Baileys upgrade testing
- Privacy testing
- Pilot preparation

### Provisional staging direction

| Component | Provisional direction |
|---|---|
| Application hosting | Hostinger VPS |
| Database | MongoDB Atlas |
| Redis and BullMQ | Redis Cloud |
| Private media storage | Cloudflare R2 |
| AI provider | OpenAI |
| Reverse proxy | Nginx |
| TLS | HTTPS certificate |
| Deployment | Docker Compose |
| Domain | Separate staging subdomain |
| WhatsApp accounts | Disposable or low-risk staging numbers |
| Data | Fake or sanitized test data |

### Staging rules

- Staging must not use production credentials.
- Staging must not use the production database.
- Staging must not use production Redis.
- Staging must not use production encryption keys.
- Staging must not use production WhatsApp authentication state.
- Staging must not contain unrestricted real client data.
- Baileys upgrades must be tested in staging before production.

---

## 6. Production environment

Production will be created only after local and staging gates pass.

### Provisional production direction

| Component | Provisional direction |
|---|---|
| Backend and WhatsApp session service | Hostinger VPS |
| Initial server size | Start around 2 vCPU and 8 GB RAM, then measure |
| Database | Paid MongoDB Atlas cluster |
| Redis and BullMQ | Paid Redis Cloud database |
| Private media storage | Private Cloudflare R2 bucket |
| AI | OpenAI through a provider adapter |
| Reverse proxy | Nginx |
| TLS | HTTPS |
| Deployment | Docker Compose |
| Monitoring | Error, uptime and resource monitoring |
| Backups | Managed database backups plus documented restore testing |
| WhatsApp accounts | Approved production numbers only |

### Capacity warning

The initial server size is only a starting estimate.

It is not proof that one server can safely operate 25 busy WhatsApp sessions.

Before operating 20–25 busy accounts, the project must review:

- CPU usage
- Memory usage
- WebSocket connections
- Reconnect load
- Redis load
- Queue performance
- MongoDB performance
- Network reliability
- Restart behaviour
- Session isolation
- Operational support capacity

The server may need to be resized or the WhatsApp session service may need to be distributed across multiple processes or machines.

---

## 7. Provisional vendor register

### 7.1 Application and WhatsApp hosting

**Provisional provider:** Hostinger VPS

**Purpose:**

- Run the Express API
- Run Socket.IO
- Run the WhatsApp session service
- Run BullMQ workers
- Run Nginx
- Support Docker Compose
- Provide a long-running process environment

**Why this direction:**

- VPS-level control
- Persistent Node.js processes
- WebSocket support
- Environment-variable control
- Process restart control
- Docker deployment support
- Suitable for a solo developer who already uses Hostinger

**Not approved:**

- Ordinary shared cPanel hosting for the WhatsApp session service

**Review before purchase:**

- Current pricing
- Region
- Available RAM and CPU
- Storage
- Backup options
- Network limits
- Root access
- Firewall controls
- Upgrade path
- Support quality

---

### 7.2 Database

**Provisional provider:** MongoDB Atlas

**Purpose:**

- Store application users
- Store account records
- Store conversations and messages
- Store CRM data
- Store audit records
- Store encrypted private fields
- Support managed backup and restore

**Why this direction:**

- Managed MongoDB
- Easier production operation for a solo developer
- Backup and restore support on suitable paid plans
- Monitoring and scaling options

**Local alternative:**

- MongoDB Docker container

**Review before purchase:**

- Current pricing
- Region
- Backup support
- Storage
- Connection limits
- Network access controls
- Encryption options
- Restore process
- Migration path

---

### 7.3 Redis and queues

**Provisional provider:** Redis Cloud

**Purpose:**

- BullMQ queues
- Distributed locks
- WhatsApp session ownership coordination
- Reconnect coordination
- Temporary caching
- Rate control
- Short-lived application state

**Why this direction:**

- Managed Redis
- Reduces maintenance work
- Suitable for BullMQ
- Supports future scaling

**Local alternative:**

- Redis Docker container

**Review before purchase:**

- Current pricing
- Persistence options
- Backup or recovery options
- Memory limits
- Connection limits
- Region
- TLS
- Eviction policy
- BullMQ compatibility
- Migration path

---

### 7.4 Private media storage

**Provisional provider:** Cloudflare R2

**Purpose:**

- Store approved WhatsApp media
- Keep large media outside MongoDB
- Generate short-lived signed URLs
- Support S3-compatible application code

**Why this direction:**

- S3-compatible storage model
- Private bucket support
- Suitable for media outside the database
- Allows provider abstraction

**Local alternative:**

- Local temporary storage only during early development

**Review before purchase or activation:**

- Current pricing
- Storage region and data handling
- Signed URL support
- Lifecycle rules
- Access control
- Object deletion
- Malware-scanning integration
- Migration path

---

### 7.5 AI provider

**Provisional provider:** OpenAI

**Integration direction:**

- Official JavaScript SDK
- Responses API
- Provider adapter pattern
- Structured output validation
- Human-reviewed drafts only
- No automatic WhatsApp sending

**Purpose:**

- Reply drafts
- Rewriting
- Shortening
- Simpler English
- Professional tone
- Translation
- Summaries
- Tag and follow-up suggestions
- Knowledge-assisted replies

**Review before activation:**

- Current API pricing
- Supported models
- Data handling
- Retention controls
- Region or contractual needs
- Rate limits
- Failure behaviour
- Provider fallback
- Cost limits

AI does not need to be purchased or enabled during initial core development.

---

### 7.6 Reverse proxy and TLS

**Approved direction:** Nginx with HTTPS

**Purpose:**

- Serve the frontend or route to static hosting
- Route API traffic
- Support WebSocket upgrades
- Terminate TLS
- Apply basic security headers
- Control upload limits
- Provide one public entry point

The exact certificate process will be selected during deployment.

---

### 7.7 Monitoring

**Provider:** Not selected during Phase 0

Monitoring categories required before pilot or production:

- Application error monitoring
- Uptime monitoring
- CPU and memory monitoring
- Disk monitoring
- MongoDB health
- Redis health
- Queue depth and failures
- WhatsApp account state
- Reconnect frequency
- Failed outbound messages

Final tools will be selected later based on simplicity, pricing and data handling.

---

### 7.8 Malware scanning

**Provider:** Not selected during Phase 0

Malware scanning is not required during text-only development.

It must be reviewed before accepting general media uploads or downloads.

Possible directions may include:

- ClamAV in the application environment
- A managed scanning provider
- Object-storage-triggered scanning

The choice will be made only when the supported media scope is approved.

---

### 7.9 Future notifications

Email or push providers are not required for the first local proof of concept.

They may be selected later for:

- Security notifications
- Account-disconnection alerts
- Follow-up reminders
- Incident alerts

---

## 8. Hosting requirements

The WhatsApp session service requires:

- A long-running Node.js process
- Persistent outbound internet connectivity
- WebSocket support
- Independent restart control
- Secure environment variables
- Access to MongoDB and Redis
- Sufficient RAM
- Sufficient CPU
- Disk monitoring
- Process monitoring
- Network monitoring
- No shared-hosting process-sleep restrictions

Because of these requirements, ordinary shared cPanel hosting is not approved for the WhatsApp session service.

---

## 9. Deployment direction

### Local

Use Docker Compose for:

- Backend
- MongoDB
- Redis
- Worker

The frontend may run through Vite during development.

### Staging and production

Use Docker Compose initially for:

- API
- WhatsApp session service
- BullMQ worker
- Nginx

Managed MongoDB and Redis remain outside the VPS.

This keeps deployment understandable for one developer while preserving a path to future separation.

---

## 10. Secret management

Each environment must have separate secrets.

Secrets include:

- JWT signing secrets
- Refresh-session secrets
- MongoDB credentials
- Redis credentials
- Object-storage credentials
- OpenAI API keys
- Encryption keys
- Baileys auth-state encryption keys

Rules:

- Never commit `.env` files to Git.
- Never place secrets in frontend code.
- Never log secrets.
- Never share production secrets with staging.
- Keep encryption keys separate from encrypted database values.
- Back up critical encryption keys securely and separately.
- Rotate compromised credentials.

A more advanced secret-management service may be introduced later.

---

## 11. Backup direction

### Local

Backups are optional during early development because only fake data is used.

### Staging

Test:

- Database backup
- Database restore
- Encryption-key recovery
- Application restart
- Account-session recovery

### Production

Require:

- Daily database backups
- Approximately 30-day rolling retention
- Encrypted backup storage
- Separate encryption-key backup
- Restore testing
- Restricted backup access

A backup is not trusted until restoration succeeds.

---

## 12. Environment naming

Recommended environment identifiers:

```text
local
staging
production
```

Recommended resource naming examples:

```text
wam-crm-ai-local
wam-crm-ai-staging
wam-crm-ai-production
```

Recommended subdomains may later include:

```text
staging.example.com
app.example.com
```

The final domain will be selected during deployment.

---

## 13. Services not required during Phase 0

Do not purchase or configure the following merely to complete Phase 0:

- VPS
- Paid MongoDB Atlas cluster
- Paid Redis Cloud plan
- Cloudflare R2 production bucket
- OpenAI API credits
- Error-monitoring subscription
- Uptime-monitoring subscription
- Malware-scanning service
- Production domain
- Production TLS certificate

They will be introduced only when their implementation phase begins.

---

## 14. Final vendor-selection criteria

Before any paid provider is selected, compare:

- Current pricing
- Region
- Data handling
- Backup support
- WebSocket support
- Persistent-process support
- Resource limits
- Network restrictions
- Security controls
- Monitoring
- Migration and exit path
- Operational complexity
- Support quality
- Solo-developer manageability

A cheaper provider should not be selected if it cannot reliably support the required process model.

---

## 15. Approved provisional decisions

The following are approved:

- Local development uses Docker Compose.
- Local MongoDB and Redis run in containers.
- Only fake data and disposable numbers are used locally.
- Staging is introduced after the local proof of concept is stable.
- Hostinger VPS is the provisional staging and production host.
- MongoDB Atlas is the provisional managed database.
- Redis Cloud is the provisional managed Redis service.
- Cloudflare R2 is the provisional private media store.
- OpenAI is the provisional AI provider through an adapter.
- Nginx and HTTPS are used in deployment.
- Docker Compose is the initial production deployment method.
- Ordinary shared cPanel hosting is not approved for the WhatsApp session service.
- Staging and production use completely separate credentials and data.
- No provider purchase is required during Phase 0.
- Final pricing and plan review is required before purchase.
- Capacity review is mandatory before 20–25 busy WhatsApp sessions.

---

## 16. Future improvements

Possible later improvements include:

- Separate API and WhatsApp servers
- Multiple WhatsApp session-service nodes
- Managed container hosting
- Kubernetes only if scale justifies it
- Dedicated secret-management service
- Automated deployment pipeline
- Infrastructure as code
- Multi-region backup
- Advanced observability
- Dedicated media-processing worker
- Separate AI worker
- Provider failover

These improvements are not required for the first MVP.

---

## 17. Phase 0.6 completion condition

Phase 0.6 is complete when:

- Local, staging and production boundaries are approved.
- Provisional provider categories are selected.
- Shared hosting is rejected for the WhatsApp session service.
- Environment separation is required.
- Backup direction is recorded.
- Secret separation is recorded.
- No unnecessary Phase 0 purchase is required.
- Final vendor review criteria are documented.
- The user accepts this document.
