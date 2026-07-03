# WAM CRM AI — Project Charter

## Document control

| Field | Value |
|---|---|
| Document | Project Charter |
| Project | WAM CRM AI |
| Full product name | WhatsApp Multi-Account Manager + Private Team CRM + AI Reply Assistant |
| Organization | Vistaar Media |
| Document version | 1.0 |
| Status | Approved for Phase 0.1 |
| Approval date | 2026-06-24 |
| Engineering baseline | WhatsApp_Multi_Account_CRM_AI_MERN_Risk_Controlled_Engineering_Documentation_v3.1.pdf |
| Project phase | Phase 0 — Confirm Decisions and Create ADRs |
| Current subphase | Phase 0.1 — Project Charter and MVP Boundaries |

---

## 1. Purpose of this document

This charter defines the identity, purpose, ownership, intended users, operating boundaries and high-level success conditions for WAM CRM AI.

It prevents the project from expanding without control and gives future development work one approved reference point.

This document does not authorize coding, production deployment, connection of a real business-critical WhatsApp number, or use of real client data.

---

## 2. Project identity

### 2.1 Project name

**WAM CRM AI**

### 2.2 Full product name

**WhatsApp Multi-Account Manager + Private Team CRM + AI Reply Assistant**

### 2.3 Organization

**Vistaar Media**

### 2.4 Product type

WAM CRM AI is a controlled internal business application.

It is not a public SaaS product in version 1.

### 2.5 Development model

The application will initially be designed and developed by one solo MERN developer who is a recent graduate.

The project must therefore remain:

- Understandable
- Incremental
- Testable
- Documented
- Secure by default
- Realistic for one developer to operate
- Structured so additional developers can join later

---

## 3. Product vision

WAM CRM AI will provide Vistaar Media with one private internal workspace for managing permitted WhatsApp conversations, team responsibilities, lead information, follow-up work and human-reviewed AI reply assistance.

The product should reduce confusion caused by multiple WhatsApp accounts while protecting client information from unnecessary internal exposure.

---

## 4. Business problem

Vistaar Media may need to manage several WhatsApp accounts and conversations across multiple team members.

Without a controlled internal system, the business may face problems such as:

- Team members accessing accounts they should not use
- No clear record of who last handled a conversation
- Missed follow-ups
- Duplicate or conflicting replies
- Customer phone numbers being unnecessarily visible
- Important context being stored only in personal memory
- Inconsistent reply quality
- No reliable audit trail for sensitive actions
- Difficulty measuring account health and operational workload
- Increased risk when multiple linked WhatsApp sessions are used informally

WAM CRM AI is intended to address these problems through access control, privacy-safe APIs, CRM tools, audit records and human-reviewed AI drafts.

---

## 5. Product objectives

The approved objectives are:

1. Allow authorized staff to log in using individual accounts.
2. Allow users to access only the WhatsApp accounts assigned to them.
3. Allow permitted users to read and reply to approved conversations.
4. Hide client phone numbers, WhatsApp JIDs and other restricted identifiers from ordinary staff.
5. Enforce privacy through the backend rather than only through frontend display rules.
6. Support conversation assignment, lead stages, tags, notes and follow-up tasks.
7. Record important user and system activity.
8. Show the operational state of each connected WhatsApp account.
9. Introduce AI as a draft assistant only after the secure core system is stable.
10. Require a human to review and explicitly send every AI-assisted reply.
11. Build in small, testable phases with evidence and sign-off.
12. Prepare the architecture for a planned maximum of approximately 25 accounts while increasing capacity gradually.

---

## 6. Intended users

### 6.1 Included users

The application is intended for authorized internal Vistaar Media users, including:

- Super administrators
- Administrators
- Managers
- Staff agents
- Approved operations or engineering users

The detailed permissions for these roles will be finalized in Phase 0.2.

### 6.2 Excluded users

Version 1 will not support:

- Public users
- External customers signing up
- Other businesses registering themselves
- Customers connecting their own WhatsApp accounts
- Public self-service account creation
- Public tenant administration

All users must be created, invited or approved by an authorized administrator.

---

## 7. Approved product boundaries

### 7.1 Internal-only use

The product is for internal Vistaar Media operations only.

It will not be marketed or operated as a customer-facing SaaS platform in version 1.

### 7.2 Application format

The approved product is:

- A responsive web application
- Desktop-first
- Usable on supported mobile browsers for basic operations
- Built with a custom chat and CRM interface

The project will not include native Android or iOS applications in version 1.

### 7.3 Interface decision

The application will use a custom WhatsApp-style chat interface.

It will not embed, reproduce or depend on the original `web.whatsapp.com` interface.

This decision is necessary because the system requires direct control over:

- Roles
- Per-account access
- Privacy-safe data transfer
- Conversation assignment
- CRM fields
- Restricted notes
- Audit logs
- AI drafts
- Account health indicators

Changing this interface decision later will require a separate Architecture Decision Record.

---

## 8. Approved capacity stages

The system will be designed and tested in controlled stages.

| Stage | Approved target | Number type | Purpose |
|---|---:|---|---|
| Proof of concept | 1 account | Disposable development number | Prove basic connection and controlled message flow |
| Multi-account engineering test | 3 accounts | Disposable development numbers | Test independent sessions and account isolation |
| Internal pilot | 3–5 accounts | Low-risk pilot numbers | Validate real internal workflow with limited exposure |
| Initial production | 5–10 accounts | Approved production numbers | Begin controlled business use |
| Planned business capacity | Up to 25 accounts | Approved accounts | Long-term target after measurement |
| Capacity review gate | Before 20–25 busy sessions | Not applicable | Review RAM, CPU, reconnect load, queues and operational risk |

The planned maximum of 25 accounts is a product target, not a promise that one server will safely operate 25 busy accounts without measurement.

---

## 9. WhatsApp number direction

The project may eventually support both personal WhatsApp numbers and WhatsApp Business numbers.

However:

- The first proof of concept must use a disposable secondary number.
- A founder's or owner's critical personal number must not be used during development.
- The primary business number must not be used during the proof of concept.
- Client-owned numbers must not be used as test numbers.
- Business-critical numbers may be introduced only after required risk-control gates pass.
- Number eligibility and phone custody will be finalized in Phase 0.3.

---

## 10. AI position

AI is included in the planned MVP only as a controlled assistant.

AI will be introduced after the secure messaging, authorization and privacy foundation is stable.

Approved AI behavior includes:

- Generating reply drafts
- Rewriting text
- Shortening text
- Simplifying English
- Applying an approved professional tone
- Translating text
- Summarizing conversations
- Suggesting tags
- Suggesting follow-ups
- Suggesting escalation
- Using approved account-specific knowledge

AI must not:

- Send messages automatically
- Reveal restricted private information
- Make unauthorized pricing promises
- Make unauthorized timeline promises
- Make legal commitments
- Export client data autonomously
- Change sensitive CRM state without a human-controlled action
- Operate as a fully autonomous customer-service agent

Every AI-assisted message must be reviewed and explicitly sent by an authorized human.

---

## 11. Messaging-use restrictions

The system is intended for human-managed customer communication and CRM operations.

The following uses are prohibited in version 1:

- Bulk messaging
- Broadcast campaigns
- Purchased contact lists
- Cold outreach automation
- Spam
- Unsolicited messaging
- Automated drip campaigns
- Automatic AI sending
- High-volume promotional messaging

These restrictions are part of the product boundary and the risk-control strategy.

---

## 12. High-level version 1 capabilities

Version 1 is planned to include the following capability groups after their respective phases are approved and implemented.

### 12.1 Identity and access

- Individual user login
- Roles and permissions
- Per-account access
- Backend-enforced authorization
- Restricted PII access
- Audited privileged actions

### 12.2 WhatsApp account management

- Named internal account records
- QR connection
- Connection state
- Reconnect
- Relink
- Pause
- Remove
- Account health
- Encrypted session restoration

### 12.3 Messaging

- Conversation list
- Message thread
- Incoming text messages
- Outgoing text messages
- Outbound queue
- Controlled retries
- Message deduplication
- Realtime updates
- Available message status information

### 12.4 CRM

- Conversation assignment
- Tags
- Lead stages
- Shared notes
- Restricted notes
- Last handled by
- Activity timeline
- Follow-up tasks
- In-app reminders

### 12.5 AI assistance

- Human-reviewed reply drafts
- Rewrite tools
- Summaries
- Suggestions
- Approved knowledge-assisted responses

The detailed feature classification is maintained in `01-scope-and-feature-matrix.md`.

---

## 13. Explicit version 1 exclusions

Version 1 will not include:

- Public registration
- Public SaaS operation
- Customer-managed tenants
- Customer billing
- Customers connecting their own WhatsApp accounts
- Native Android application
- Native iOS application
- Embedded original WhatsApp Web
- Bulk sending
- Broadcast campaigns
- Purchased-list messaging
- Cold outreach automation
- Drip campaigns
- Automatic AI replies
- Fully autonomous AI agents
- Voice calls
- Video calls
- WhatsApp Status management
- Group administration
- Autonomous PII reveal
- Autonomous client-data export
- High-volume regulated messaging
- Replacement of the official WhatsApp Business Platform

---

## 14. Delivery principles

The project must follow these working rules:

1. Build in the documented phase order.
2. Work on one subpart at a time.
3. Explain decisions in beginner-friendly language.
4. Use JavaScript only.
5. Maintain company-standard architecture and security.
6. Provide exact commands and file paths when implementation begins.
7. Test every meaningful subpart.
8. Record expected and actual results.
9. Require evidence for privacy, security and reliability controls.
10. Do not move forward only because the interface appears to work.
11. Do not use real client data before the relevant approvals.
12. Do not connect a business-critical number before the relevant gates pass.
13. Record major changes through ADRs.
14. Require user confirmation before starting the next part.

---

## 15. High-level success criteria

The project will be considered successful when the approved phases produce a system that:

- Reliably manages approved WhatsApp accounts within measured capacity
- Prevents unauthorized account access
- Keeps restricted identifiers out of ordinary staff APIs and realtime events
- Supports clear team ownership of conversations
- Reduces missed follow-ups
- Records sensitive actions
- Restores approved account sessions securely
- Handles expected service failures safely
- Provides useful AI drafts without automatic sending
- Can be operated and maintained by a small internal team
- Has documented fallback, recovery and privacy procedures

These are high-level goals. Detailed technical acceptance criteria will be defined in later phases.

---

## 16. Assumptions

The current charter assumes:

- Vistaar Media remains the only organization using version 1.
- One person may hold several ownership roles during development.
- Independent security or privacy review will be added before production.
- The WhatsApp integration remains an unofficial provider approach unless a future ADR changes it.
- Initial usage will be low-volume and human-operated.
- Text messaging will be stabilized before media support expands.
- Capacity will be increased only after testing and monitoring evidence.
- Production infrastructure will support long-running Node.js processes and WebSockets.

---

## 17. Constraints

The project is constrained by:

- Solo-developer capacity
- JavaScript-only implementation
- Unofficial WhatsApp provider risk
- Need for strict internal privacy
- Need for account-level isolation
- Need for gradual rollout
- Need to avoid business-critical numbers during early testing
- Need for manageable infrastructure and operations
- Need for human review of AI output

---

## 18. Ownership

| Responsibility | Approved owner for Phase 0.1 |
|---|---|
| Product owner | Vistaar Media Project Lead / current user |
| Technical owner | Solo MERN Developer / current user |
| Final scope approval | Product owner |
| Technical interpretation | Technical owner |

The detailed owner and escalation register will be completed in Phase 0.7.

---

## 19. Approval statement

The product identity, internal-only model, custom-interface decision, account-capacity stages, AI boundary, messaging restrictions and version 1 boundaries in this charter were approved during Phase 0.1 on 2026-06-24.

No later document may silently contradict this charter.

Any material change must be:

1. Identified clearly
2. Explained
3. Evaluated for risk and project impact
4. Recorded in the relevant planning document
5. Recorded through an ADR when architectural
6. Approved by the product owner

---

## 20. Related documents

- `01-scope-and-feature-matrix.md`
- Phase 0 handoff
- Engineering documentation v3.1
- Future Phase 0 role, privacy, number-policy, retention, infrastructure, ownership and risk documents
- Future ADR set
