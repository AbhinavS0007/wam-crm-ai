# ADR-004: Privacy-Safe DTOs and Realtime Events

## Status

Accepted

## Date

2026-06-28

## Decision owners

- Product owner: Vistaar Media project lead
- Technical owner: Solo MERN developer
- Privacy owner: Project owner during development

## Context

Ordinary staff must not see:

- Client phone numbers
- Client email addresses
- Raw WhatsApp JIDs
- Raw provider payloads
- Encrypted fields
- Authentication state
- Secrets

Hiding these values only in React or CSS is not secure because the data would still reach the browser.

## Decision

Privacy enforcement will happen in the backend.

Staff-facing APIs and Socket.IO events must use privacy-safe Data Transfer Objects.

Use internal opaque identifiers such as:

- `contactId`
- `conversationId`
- `accountId`
- `leadId`

The backend must maintain separate serializers or DTO builders for:

- Staff-safe responses
- Manager-safe responses
- Admin-safe responses
- Explicit PII reveal responses

Restricted identifiers must not appear in:

- Staff API responses
- Normal Socket.IO events
- URLs
- Realtime room names
- Browser logs
- Error messages
- Analytics events
- Queue names exposed to users

## Alternatives considered

### Return PII and hide it in React

Rejected because the data remains visible in network tools and browser state.

### Return masked phone numbers

Rejected for ordinary staff because even masked identifiers can create unnecessary exposure and correlation.

### Use phone numbers as public record IDs

Rejected because URLs, logs and browser history may expose them.

## Reasons

- Enforces privacy at the trusted server boundary
- Reduces accidental leakage
- Supports clear role-based visibility
- Makes privacy testable
- Prevents frontend mistakes from exposing PII

## Positive consequences

- Staff browsers never receive restricted fields.
- Socket.IO events remain privacy safe.
- Internal IDs can be used consistently.
- Admin PII reveal becomes explicit and auditable.
- Privacy controls can be tested automatically.

## Negative consequences and risks

- More serializers must be maintained.
- New endpoints may accidentally bypass the safe DTO layer.
- Debugging requires sanitized identifiers.
- Admin and staff responses require careful separation.

## Controls

- Centralize DTO construction.
- Prohibit direct model serialization.
- Use backend authorization before serialization.
- Add tests asserting restricted fields are absent.
- Sanitize realtime events.
- Use `Cache-Control: no-store` for reveal responses.
- Audit every PII reveal.
- Auto-hide revealed information in the UI.
- Apply default-deny authorization.

## Review triggers

Review this ADR when:

- New roles are introduced
- PII export is added
- New realtime channels are created
- New contact identifiers are stored
- A privacy test fails
- A new external integration requires restricted data

## Related documents

- 02-roles-permissions-privacy.md
- ADR-003
- 07-risk-acceptance-register.md
