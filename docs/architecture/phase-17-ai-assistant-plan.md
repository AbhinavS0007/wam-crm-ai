# Phase 17 (planning) — AI reply assistant, opportunity briefing, dashboard, and follow-ups calendar

Status: **planning only — no code**. This document exists to lock scope before implementation
starts. It is not phase-evidence (nothing here is built yet).

## Why this document, and where the reference came from

The user asked what to build for the "AI" half of WAM CRM AI, using
[LeadBuddie](https://leadbuddie.com) as a reference — an AI WhatsApp sales assistant product.
Their public marketing site (`/`, `/product`, `/how-it-works`, `/pricing`) was reviewed for the
concept; the user then shared screenshots of their own logged-in LeadBuddie dashboard (`Buddie`
home/briefing, ranked "opportunities" list, a Follow-ups calendar, and a Reports & Analytics
screen), which sharpened the concrete scope below.

**Binding constraint:** this project already has an accepted decision, **[ADR-005: Human-Reviewed
AI Assistance](../adr/ADR-005-human-reviewed-ai.md)**. Every feature proposed here is checked
against it. The one place LeadBuddie's product conflicts with it is called out explicitly (§5) —
not silently resolved.

## 1. AI reply assistant (the core feature — build first)

Matches ADR-005 exactly: draft → human review → optional edit → explicit human send.

- Admin/manager/staff can request an AI-drafted reply for the open conversation. The draft is
  grounded in the thread history and any approved knowledge (§2) so it doesn't invent
  prices/policies not on file.
- The draft appears in the composer, editable, never auto-sent. Approving it reuses the existing
  idempotent send path (`sendMessage` / outbound delivery queue) unchanged.
- **Already reusable, unbuilt until now:** the permission split for this exists in
  `backend/src/constants/permissions.js` since Phase 3 — `ai.generate` (admin, manager, staff)
  and `ai.knowledge.manage` (admin only) — matching "anyone can ask for a draft, only admin
  manages what it's trained on."
- Also covers, per ADR-005's allowed list: rewrite/shorten/simplify/tone/translate — all optional
  transforms on a draft already in the composer, not new send paths.

## 2. Knowledge base ("what you sell" / approved facts)

- Org-scoped FAQs, product/service info, and policy notes (price ranges, delivery timelines,
  things to never promise) that the reply assistant is grounded in.
- Admin-only to create/edit (`ai.knowledge.manage`), matching ADR-005's "use approved
  account-specific knowledge only."
- New module, same shape as the existing Tags/Stages catalogs (org-scoped CRUD, admin-managed).

## 3. "Train the AI" (plain-language rule editing)

- Admin types (or eventually speaks) a rule change — "warranty is now 2 years," "never promise
  same-day delivery" — the AI proposes the structured update to the knowledge base (§2), admin
  reviews and saves. Nothing changes until saved — same human-approval shape as everything else
  here.
- This is a UI/UX layer on top of §2, not a new data model.

## 4. Daily briefing + scored opportunities (the "Buddie" home screen)

What the screenshots show: a summary card ("I'm watching N leads, M need you today"),
hot/warm/re-engaged buckets, and a ranked list of conversations with a plain-language reason
("high buying intent," "asked price") and a suggested next action — plus one-tap status buttons
(Contacted / Demo set / Won / Lost / Snooze).

Mapped onto what we already have:

- **Signal scoring** is new: the AI reads each active conversation and produces a short reason +
  a rank/score. This is a read-only analysis job (batch or on new inbound message), not a message
  send — squarely inside ADR-005's "summarize conversations" / "suggest escalation."
  Falls under `ai.generate` — no new permission needed.
- **Hot/Warm/Re-engaged** = a derived bucket from the score + recency, not new stored state.
- **Opportunity list** = the existing conversation list, sorted by score instead of recency —
  reuses `listConversationsForActor`.
- **Status buttons (Contacted/Demo set/Won/Lost)** = these are literally our existing **custom
  Stage catalog** (Phase 16) — a human clicking one is a normal `PATCH /conversations/:id/stage`
  call, not the AI mutating CRM state. Confirms Phase 16 was the right foundation for this. Admin
  would define stages like "Demo set" in the Stages page we already built.
- **"Snooze"** = defer/reschedule the conversation's next follow-up — reuses the existing
  Follow-up Tasks feature (`crm.tasks.manage`), no new concept.
- **"Call" / "WhatsApp" / "Open" buttons** = "Call" needs the existing audited phone-reveal
  (`client_pii.reveal`) + a `tel:` link; "Open" is just selecting the conversation; "WhatsApp" is
  redundant with "Open" in our single-surface inbox (LeadBuddie's WhatsApp button exists because
  their signal comes from outside a single inbox — ours doesn't need it).
- **Not adopting as-is: "I handled 499 on my own · saved you 12.5h."** This framing describes
  autonomous handling, which ADR-005 forbids ("must not operate as a fully autonomous agent").
  If we want an analogous "AI saved you time" stat under our approval-only model, the honest
  version is **"N drafts approved with no edits"** — still human-sent, just measuring how often
  the draft needed no changes. Framed correctly, this is fine; framed like LeadBuddie's copy, it
  isn't. See §5.
- **"Listen to brief" (audio)** — nice-to-have, not required for v1. Flag as later/optional.

## 5. Open decision: does ADR-005 need revisiting?

LeadBuddie's Growth-tier "Auto mode" sends replies without a human tap, gated only by
admin-approved rules. That is the one piece of their product that **cannot** be built under the
current ADR-005 without formally revisiting it (the ADR's own "Review triggers" section already
names this exact case: _"Automatic sending is proposed"_).

Recommendation: **do not revisit it yet.** Ship the draft-and-approve version first (§1), get
real usage, and only reopen ADR-005 for a scoped, rule-limited auto-send later if the team
explicitly decides the risk is worth it. This mirrors ADR-005's own reasoning almost verbatim
("fully automatic AI replies... rejected because the risk is too high for the first production
version") — nothing here changes that conclusion, it just restates why to the user for a
conscious decision.

## 6. Dashboard (overall summary) — not primarily an AI feature

Confirmed in scope per the user. Largely aggregation over data we already store — no LLM needed
for the base version:

- Lead/conversation counts, stage distribution (funnel), response-time metrics, per-agent
  performance (assigned/handled/pending, using the existing assignment + stage + message data),
  and a sources breakdown (limited today, since we only have one channel — WhatsApp).
- An optional AI layer on top later: a short narrative summary of what changed ("14 leads moved
  to Qualified this week") — reuses the same `ai.generate` drafting capability, not a new system.
- New page (`DashboardPage.jsx`), gated the same way Accounts/Team/Stages are — likely visible to
  admin + manager (matches who already has `conversations.read_all`).

## 7. Follow-ups calendar — not an AI feature, pure UI on existing data

Confirmed in scope per the user. The backend `FollowUpTask` model and `crm.tasks.manage`
permission already exist (Phase 9) and are only ever shown today as a list inside a single lead's
panel, plus (per the routes) an org-wide "my tasks" list. This is a new **view**, not new data:

- Month / Week / Day / List toggle (matches the screenshot), a "Mine" filter, a due-count badge.
- Clicking a day/task opens the related conversation — no new backend endpoints needed beyond
  what `listMyFollowUpTasks` already returns (title/type/priority/dueAt/conversationId).
- An AI layer could later suggest a follow-up date/time when a conversation goes quiet — that's
  §4's "suggest follow-ups" allowance, layered on later, not required for v1.

## 8. Explicitly excluded (for now)

- **Campaigns / bulk broadcast** — excluded per the user's explicit instruction. Also flagged
  independently in this document because bulk outbound on our **Baileys** (unofficial WhatsApp)
  connection is exactly the kind of pattern that gets a number banned, unlike LeadBuddie which
  runs on the official, Meta-billed WhatsApp Business API. Revisit only if/when this project ever
  migrates off Baileys onto the official API.

## 9. Suggested build order

1. AI reply assistant (§1) + knowledge base (§2) — the core, and everything else optionally reads
   from the same drafting capability.
2. Follow-ups calendar (§7) — pure UI, no AI dependency, fastest to ship, immediately useful.
3. Dashboard (§6) — pure aggregation, no AI dependency.
4. Train-the-AI (§3) — depends on §2 existing first.
5. Daily briefing + scored opportunities (§4) — the most complex piece (needs real signal-scoring
   quality), and benefits from §1–§3 already existing and being trusted.

## 10. Reuse map (for whoever implements this later)

| New feature          | Existing thing it reuses                                          |
| -------------------- | ----------------------------------------------------------------- |
| Reply draft/approve  | `messages.send` flow, outbound queue, `ai.generate` permission    |
| Knowledge base CRUD  | Tags/Stages module pattern (org-scoped catalog, admin-managed)    |
| Opportunity list     | `listConversationsForActor`, just re-sorted                       |
| Status quick-actions | Custom Stage catalog (Phase 16), `PATCH /conversations/:id/stage` |
| Snooze               | Follow-up Tasks (`crm.tasks.manage`)                              |
| Call button          | Existing audited phone-reveal (`client_pii.reveal`)               |
| Calendar             | `FollowUpTask` model + `listMyFollowUpTasks` (Phase 9)            |
| Dashboard            | Conversation/Stage/Assignment/Message data, no new storage        |
