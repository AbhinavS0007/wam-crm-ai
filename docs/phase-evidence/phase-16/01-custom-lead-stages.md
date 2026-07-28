# Phase 16 — Admin-defined custom lead stages

Lets an admin add stages beyond the fixed 7 (e.g. "Hot Lead"), with everyone who can see a lead
able to pick from the full list — reverting the admin-only lock on _applying_ a stage added a
few minutes earlier in the same session, while keeping stage _definition_ admin-only.

## Context

"Stage" was a hardcoded 7-value enum (`New, Contacted, Qualified, Proposal, Won, Lost, Closed`),
duplicated across the backend enum, `StageControl`, and `StageBadge`. The request had two parts
that pull in opposite directions on the same field:

1. Admin should be able to **define** new stages on the fly.
2. Once defined, **everyone** (not just admin) should be able to **apply** them to a lead —
   reverting the admin-only restriction on stage-changing that had just been built.

This closely mirrors the existing **Tags** feature (an org-scoped, admin-managed catalog attached
to conversations), with one structural difference: a conversation has exactly one stage, not a
multi-attach list, so there's no attach/detach step — the existing
`PATCH /conversations/:id/stage` endpoint remains "apply a stage," just reopened and extended to
accept custom values.

## Design

- The 7 built-ins are **permanent** — never deletable, unaffected by this feature.
- `conversation.stage` stays a plain string (no foreign key) — either a built-in value or a
  custom stage's `key`. The Mongoose `enum` constraint on `stage` was removed (backward
  compatible — relaxing a constraint doesn't touch existing data); validity is now checked in
  `conversation.service.js` via `resolveUsableStageValue`, the same pattern Tags uses to check a
  `tagId` exists before attaching.
- `PERMISSIONS.CRM_STAGE_MANAGE` (already existed, already admin-only) was **repurposed**: it no
  longer gates _applying_ a stage — it gates the _stage catalog_ (create/archive/delete). No new
  permission was needed.
- Applying a stage reverted to `requireConversationsRead` — the same gate every other role-scoped
  read already uses, matching how stage-changing worked before the interim admin-only change.

## What was built

### Backend — new module `modules/stages/*` (mirrors `modules/tags/*`)

`stage.model.js` (org-scoped, unique `{organizationId, key}`), `stage.repository.js`
(`normalizeStageKey` slugify, create/list/find/archive/delete), `stage.service.js`
(`createStageForActor` rejects a key that collides with a built-in → `STAGE_KEY_RESERVED`, or an
existing custom key → `STAGE_KEY_EXISTS`; `resolveUsableStageValue` returns the canonical stored
value or throws `INVALID_STAGE`), `stage.controller.js` / `stage.validation.js` /
`stage.serializer.js` / `stage.routes.js` mounted at `/api/v1/stages`.

Routes: `GET /` → `requireConversationsRead`; `POST /`, `PATCH /:id/archive`,
`DELETE /:id` → `requireCrmStageManage`.

### A second capability added mid-implementation: real delete

While verifying manually, archiving alone left a stage sitting in the list forever labeled
"Archived" with no way to actually remove it — the user flagged this directly ("no option to
delete"). Added a genuine `DELETE /api/v1/stages/:id` (admin-only), distinct from archive:
archive hides a stage from future selection while keeping the row; delete removes it outright.
Any conversation already sitting on a deleted stage's key keeps that raw string — there's no
foreign key to cascade — and `StageBadge` already falls back to displaying the raw key when it
can't resolve a label.

### Conversation module changes

`conversation.routes.js` (guard reverted to `requireConversationsRead`), `conversation.validation.js`
(`changeStageBodySchema.stage` loosened from a fixed `z.enum` to a validated string — real
validity now checked async in the service), `conversation.service.js`
(`changeConversationStageForActor` calls `resolveUsableStageValue` before writing),
`conversation.model.js` (dropped the `enum` on `stage`), `conversation.controller.js`
(`INVALID_STAGE` → 400 added to `mapConversationError`).

### Frontend

`lib/stages.js` (`BUILTIN_STAGES`, `mergeStages`, `findStageByKey` — one place combining built-ins
with an org's custom stages); `StageControl.jsx` now fetches the merged list and **always
renders**, for every role; `StageBadge.jsx` renders a light tint of a custom stage's own color
when it isn't a built-in; `ConversationList.jsx` / `ConversationView.jsx` each resolve a
conversation's stage label/color from their own `listStages()` fetch (matching the existing
per-component fetch convention — e.g. `AssignmentControl`); `LeadPanel.jsx` reverted to always
showing the editable control. New `pages/StagesPage.jsx` + `components/stages/{AddStageForm,
StageRow}.jsx` — an admin-only page listing built-ins (read-only) and custom stages (color swatch,
Archive, **Delete**), gated by `crm.stage.manage`; new **Stages** nav entry in `AppShell.jsx`.

## Verification

- Backend: `npm run lint` clean, **259 tests pass**. `stage-api.test.js` covers create/duplicate
  key (409)/reserved built-in key (400)/archive/delete/delete-again-404/permission denial for
  staff+manager on create and delete. `conversation-crm-api.test.js` rewritten: staff **and**
  manager can change stage again (200, reverting the interim lock), staff can select an
  admin-created custom stage, an archived custom stage is rejected with `INVALID_STAGE` (400).
- Frontend: lint clean, **50 tests pass**, production build clean. `stages-page.test.jsx` covers
  list/create/archive/delete and permission gating (a genuine bug was caught here: the first cut
  of `StageRow`'s Delete button had no `canManage` check at all — the test failed immediately,
  before this ever reached a real user).
- Manual E2E in the browser, all confirmed live: created "Hot Lead" as admin from the new Stages
  page → the `POST /api/v1/stages` call returned 201 → deleted it via the new Delete button → a
  `DELETE /api/v1/stages/:id` call returned 200 and the row disappeared from the list entirely
  (not just marked archived).

## Non-goals

- No rename/edit of a custom stage once created (matches Tags — create/archive/delete only, no
  update endpoint).
- No per-WhatsApp-account stage scoping (org-wide only).
- No stage-transition rules — any usable value is accepted, matching prior built-in behavior.
- No AI (still deferred).
