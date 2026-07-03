# ADR-001: JavaScript MERN Modular Monolith

## Status

Accepted

## Date

2026-06-28

## Decision owners

- Product owner: Vistaar Media project lead
- Technical owner: Solo MERN developer

## Context

WAM CRM AI is being built by one solo recent-graduate MERN developer.

The product needs:

- A React frontend
- A Node.js backend
- MongoDB persistence
- Realtime communication
- WhatsApp session handling
- Background jobs
- Future AI integration
- Clear security and privacy boundaries

The first version must remain simple enough for one developer to understand and maintain.

## Decision

The project will use:

- JavaScript only
- React with Vite
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO
- Redis
- BullMQ
- A modular monolith architecture

The first version will not require TypeScript.

The codebase will be split into clear modules such as:

- Authentication
- Users and roles
- WhatsApp accounts
- Conversations
- Messages
- CRM
- Audit
- AI
- Media
- Notifications

The WhatsApp session lifecycle and background workers must remain logically separated from normal API controllers, even if they initially run on the same server.

## Alternatives considered

### TypeScript

Rejected for the first version because it would add learning and maintenance overhead for the current solo builder.

It may be reconsidered later if the team grows.

### Microservices from the beginning

Rejected because it would add:

- More deployments
- More networking
- More monitoring
- More failure points
- More operational complexity

### Single unstructured Express application

Rejected because it would become difficult to test, secure and extend.

## Reasons

- Matches the developer's current MERN skills
- Keeps the first version understandable
- Supports gradual development
- Avoids premature infrastructure complexity
- Preserves clear module boundaries
- Allows later service separation where needed

## Positive consequences

- Faster initial development
- Easier debugging
- Simpler local setup
- Fewer deployments
- Easier testing
- Easier company-standard folder organization
- Lower operational cost

## Negative consequences and risks

- One deployment may contain several responsibilities.
- A failure may affect more than one module.
- Scaling one busy module independently may be harder.
- JavaScript provides less compile-time checking than TypeScript.

## Controls

- Use strict module boundaries.
- Keep controllers thin.
- Keep business logic in services.
- Keep provider-specific code behind adapters.
- Validate all inputs.
- Use automated tests.
- Use structured logging.
- Keep worker and WhatsApp lifecycle code separated.
- Review process separation before high account capacity.

## Review triggers

Review this ADR when:

- More developers join
- TypeScript becomes a team requirement
- One module needs independent scaling
- WhatsApp sessions exceed safe single-process capacity
- Deployment frequency or reliability requires service separation

## Related documents

- 00-project-charter.md
- 01-scope-and-feature-matrix.md
- 05-infrastructure-vendor-register.md
