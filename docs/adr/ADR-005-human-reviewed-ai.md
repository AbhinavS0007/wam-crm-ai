# ADR-005: Human-Reviewed AI Assistance

## Status

Accepted

## Date

2026-06-28

## Decision owners

- Product owner: Vistaar Media project lead
- AI owner: Project owner during development
- Technical owner: Solo MERN developer

## Context

AI can help staff draft faster and more consistent replies.

However, AI may:

- Hallucinate
- Misunderstand context
- Expose private information
- Invent pricing
- Invent delivery timelines
- Make unauthorized commitments
- Produce unsafe or unprofessional responses

## Decision

AI will be introduced only after the core messaging, authorization and privacy system is stable.

AI may:

- Generate reply drafts
- Rewrite text
- Shorten text
- Simplify English
- Apply professional tone
- Translate
- Summarize conversations
- Suggest tags
- Suggest follow-ups
- Suggest escalation
- Use approved account-specific knowledge

AI must not:

- Send WhatsApp messages automatically
- Reveal PII
- Export client data
- Make legal commitments
- Promise unapproved pricing
- Promise unapproved timelines
- Directly change sensitive CRM state
- Operate as a fully autonomous agent

Every AI-assisted customer reply requires:

1. Draft generation
2. Human review
3. Optional human editing
4. Explicit human send action

## Alternatives considered

### Fully automatic AI replies

Rejected because the risk is too high for the first production version.

### No AI features

Rejected because controlled draft assistance is a core product goal.

### Direct OpenAI SDK use throughout business logic

Rejected because it would create provider lock-in and inconsistent safety handling.

## Reasons

- Preserves human accountability
- Reduces hallucination impact
- Prevents autonomous commitments
- Supports gradual AI quality improvement
- Keeps AI optional
- Allows the core CRM to work without AI

## Positive consequences

- Staff gain drafting assistance.
- Human judgment remains in control.
- Unsafe outputs can be corrected before sending.
- AI can be disabled without disabling messaging.
- Provider changes remain possible through an adapter.

## Negative consequences and risks

- Staff must still review every draft.
- AI may produce poor suggestions.
- AI adds cost and latency.
- Privacy controls must sanitize inputs.
- Knowledge documents require approval and maintenance.

## Controls

- Provider adapter pattern
- Structured AI outputs
- Approved account-specific knowledge only
- Data minimization
- PII sanitization
- Human review
- Explicit manual send
- AI disable switch
- Cost and rate limits
- Output validation
- Audit and feedback metadata
- 30-day prompt/draft retention
- No automatic CRM mutation

## Review triggers

Review this ADR when:

- Automatic sending is proposed
- New AI providers are introduced
- AI exposes restricted information
- AI repeatedly invents commitments
- Regulated data is introduced
- The product becomes customer-facing
- Autonomous workflows are requested

## Related documents

- 01-scope-and-feature-matrix.md
- 04-data-retention-register.md
- 07-risk-acceptance-register.md
