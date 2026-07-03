# ADR-002: Baileys Provider and Manual Fallback

## Status

Accepted with risk controls

## Date

2026-06-28

## Decision owners

- Product owner: Vistaar Media project lead
- Technical owner: Solo MERN developer
- Risk owner: Project owner

## Context

WAM CRM AI requires multiple WhatsApp sessions for an internal team tool.

The project needs:

- QR-based linking
- Multiple named accounts
- Incoming and outgoing messages
- Session restoration
- Account status
- Reconnect and relink support

Baileys can support the controlled MVP, but it is an unofficial WhatsApp protocol client.

## Decision

Use WhiskeySockets Baileys for the controlled internal MVP.

Baileys must:

- Be isolated behind a WhatsApp provider interface
- Never be imported directly by controllers
- Use an exact pinned version
- Be tested first with disposable numbers
- Be upgraded only after staging tests
- Be used only for human-managed communication
- Not be used for bulk or unsolicited messaging

The business fallback is:

- Physical phone
- Official WhatsApp application

## Alternatives considered

### Official WhatsApp Business Platform

Not selected for the first MVP because the current product requires linked multi-account internal operation and a custom controlled workflow.

It remains the preferred future migration path if unofficial-provider risk becomes unacceptable.

### Embedding original WhatsApp Web

Rejected because it does not provide safe control over:

- Roles
- PII hiding
- CRM data
- Audits
- AI drafts
- Per-account permissions

### Building directly against Baileys throughout the application

Rejected because it would tightly couple business logic to an unstable external provider.

## Reasons

- Supports the required proof of concept
- Allows controlled multi-account engineering tests
- Provides a realistic path for the internal MVP
- Provider isolation limits future migration cost

## Positive consequences

- Faster MVP validation
- Supports QR-based linked accounts
- Supports account-specific session handling
- Can be abstracted behind a provider boundary
- Allows gradual testing from one to several accounts

## Negative consequences and risks

- WhatsApp may change its protocol.
- Baileys may break after upgrades.
- Sessions may log out.
- Accounts may require relinking.
- Numbers may face restrictions.
- Some WhatsApp features may be unsupported.

## Controls

- Disposable-number proof of concept
- Three-number engineering test
- No critical business number during development
- No client-owned test number
- No bulk messaging
- No cold outreach
- No purchased lists
- No automatic AI sending
- Exact dependency version pinning
- Provider abstraction
- Reconnect and relink runbooks
- Account isolation
- Monitoring
- Manual fallback
- Written approval before production

## Review triggers

Review this ADR when:

- A number receives a restriction warning
- Baileys becomes unstable
- Repeated relinks occur
- A major Baileys version is considered
- Official WhatsApp integration becomes necessary
- The system expands beyond the internal MVP
- High-volume or regulated messaging is requested

## Related documents

- 03-whatsapp-number-policy.md
- 07-risk-acceptance-register.md
- ADR-001
