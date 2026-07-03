# ADR-006: Infrastructure Direction

## Status

Accepted as provisional direction

## Date

2026-06-28

## Decision owners

- Technical owner: Solo MERN developer
- Operations owner: Project owner

## Context

The application requires:

- Long-running Node.js processes
- Persistent WebSockets
- WhatsApp sessions
- Redis-backed workers
- MongoDB
- Private media storage
- Monitoring
- Backups
- Environment separation

The infrastructure must remain manageable for one developer.

## Decision

### Local

Use Docker Compose with:

- Node.js application
- MongoDB
- Redis
- BullMQ worker
- Fake data
- Disposable WhatsApp numbers

### Staging and production

Provisional provider direction:

- Hostinger VPS for application hosting
- MongoDB Atlas for managed MongoDB
- Redis Cloud for managed Redis
- Cloudflare R2 for private media
- OpenAI through a provider adapter
- Nginx with HTTPS
- Docker Compose deployment

Ordinary shared cPanel hosting is not approved for the WhatsApp session service.

Staging and production must use separate:

- Databases
- Redis resources
- Buckets
- Credentials
- Encryption keys
- WhatsApp auth state
- API keys

## Alternatives considered

### Ordinary shared hosting

Rejected because long-running Node.js, workers and WebSockets may be restricted or unreliable.

### Kubernetes from the beginning

Rejected because it is unnecessary and too complex for the first MVP.

### Self-hosting MongoDB and Redis in production

Not selected initially because managed services reduce maintenance and recovery burden.

### Fully serverless backend

Rejected because persistent WhatsApp sessions and long-running workers do not fit the simplest serverless model.

## Reasons

- Suitable for persistent services
- Understandable for one developer
- Supports Docker-based deployment
- Managed database and Redis reduce operational work
- Preserves a path to later scaling

## Positive consequences

- Reproducible local environment
- Simple initial deployment
- Clear environment separation
- Managed backup options
- Suitable for WebSockets and workers
- Can scale vertically before introducing distributed infrastructure

## Negative consequences and risks

- One VPS may become a bottleneck.
- Provider pricing may change.
- Managed services add monthly cost.
- Manual Docker Compose deployment needs discipline.
- 25 busy accounts may require architecture changes.

## Controls

- No provider purchase during Phase 0
- Review current pricing before purchase
- Use monitoring
- Use backups and restore testing
- Keep secrets separate
- Measure CPU, memory, Redis and reconnect load
- Review capacity before 20–25 busy accounts
- Keep modules separable for future multi-process deployment

## Review triggers

Review this ADR when:

- Pilot usage exceeds safe VPS capacity
- 20–25 busy accounts are planned
- A provider no longer meets requirements
- Deployment reliability becomes inadequate
- Multiple server nodes are required
- Data-region requirements change
- Operational cost becomes excessive

## Related documents

- 05-infrastructure-vendor-register.md
- ADR-001
- 07-risk-acceptance-register.md
