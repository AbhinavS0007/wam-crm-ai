# Phase 17a — AI reply assistant + knowledge base

First AI slice, per `docs/architecture/phase-17-ai-assistant-plan.md`'s build order: reply
assistant + knowledge base first, since everything else in that plan (daily briefing, dashboard
narrative, train-the-AI) optionally reuses the same drafting capability.

## What was built

- **AI provider adapter** (`backend/src/modules/ai/{ai-provider.interface,ai.errors}.js`,
  `providers/anthropic.provider.js`, `providers/grok.provider.js`) — mirrors the WhatsApp/Baileys
  adapter pattern exactly (duck-typed interface + assertion function). Two providers ship:
  Anthropic (via `@anthropic-ai/sdk`) and Grok/xAI (via its OpenAI-compatible `chat/completions`
  endpoint, plain `fetch`, no extra SDK). Selected via `AI_PROVIDER` (`anthropic` | `grok`) in
  `ai-provider.instance.js`; no business logic calls either SDK/API directly.
- **Draft generation** (`ai-context.service.js`, `ai-rate-limit.service.js`, `ai-draft.{model,
repository,service,controller,validation,serializer}.js`) — `POST
/conversations/:id/ai-draft` builds a prompt from the last N thread messages + active
  knowledge facts, calls the provider, persists an audit row, returns the draft text. `PATCH
/conversations/:id/ai-draft/:draftId/outcome` records what happened to it.
- **Knowledge base** (`modules/ai-knowledge/*`) — an org-scoped fact catalog (label, content,
  category), admin-only end to end (including listing), mounted at `/api/v1/ai/knowledge`.
  Mirrors the Tags module file-for-file.
- **Frontend** — `MessageComposer` gained a "✨ Suggest reply" button (visible only with
  `ai.generate`) that fills the textarea with the draft; the human still edits/reviews and clicks
  Send. A new admin-only **Knowledge** page manages the fact catalog.

## ADR-005 controls — implemented, not just claimed

| Control                                | Where                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft only, human sends                | `MessageComposer` never auto-submits; approving a draft is still the existing `POST /conversations/:id/messages` flow, unchanged                                                      |
| Disable switch                         | `AI_ENABLED` env var, default `false`; checked first in `generateReplyDraftForActor`                                                                                                  |
| Rate limit                             | `ai-rate-limit.service.js`, Redis-backed, `AI_DRAFT_RATE_LIMIT_PER_HOUR` (default 30/hour/user)                                                                                       |
| PII sanitization                       | `ai-context.service.js` never calls the phone-decrypt path — only message bodies + the contact's already-public `displayName`; `findContactById` is called without `includeEncrypted` |
| Provider adapter, not direct SDK calls | `ai-provider.interface.js` / `anthropic.provider.js` / `grok.provider.js`, mirrors the WhatsApp adapter                                                                               |
| Audit + feedback metadata              | Every draft is persisted (`AiDraft`) with who/when/context size; outcome (`approved_unedited` / `approved_edited` / `discarded`) recorded best-effort after send                      |
| 30-day retention                       | Mongo TTL index on `AiDraft.createdAt`, `expireAfterSeconds: 60*60*24*30`                                                                                                             |
| No auto-send                           | No code path sends a WhatsApp message from the AI module; drafting and sending remain fully separate                                                                                  |

## Verification

- Backend: `npm run lint` clean, **270 tests pass** (62 files). New
  `tests/ai-draft-api.test.js` (fake provider injected via `setAiProvider`, mirroring the
  WhatsApp session-manager tests' fake-provider pattern) covers: draft generated + persisted +
  the fake provider's received prompt asserted to **never contain the contact's phone number**;
  outcome recording; `AI_ENABLED=false` blocks with a clear error; rate limit triggers a 429
  after the configured cap; staff/manager/admin can all generate (matches `ai.generate` being
  broad). New `tests/ai-knowledge-api.test.js` covers create/list/archive as admin, and 403 for
  staff on every route including `GET`. New `tests/grok.provider.test.js` covers the Grok adapter
  directly (injected `fetchImpl`): missing key throws `AiProviderNotReadyError`; a successful
  call posts the expected `chat/completions` body and extracts `draftText`; a non-OK response
  throws `AiProviderError`.
- Frontend: lint clean, **60 tests pass** (16 files), production build clean. New
  `message-composer-suggest.test.jsx` covers: hidden without `canSuggest`; fills without sending;
  `wasEdited: false` for an unedited draft, `true` after editing; a manually-typed message sends
  with no `draftId`. New `ai-knowledge-page.test.jsx` covers list/create/archive and permission
  gating — this test caught a real bug during development (the Archive button was rendering
  unconditionally in `KnowledgeRow`, not gated by `canManage` like `StageRow` is), fixed before
  landing.
- Manual E2E in the browser (super admin, real dev DB, `AI_ENABLED=false` — the safe default):
  created a knowledge fact end to end (create → appears in list → Archive button present);
  opened a real conversation and confirmed the "✨ Suggest reply" button renders for a role with
  `ai.generate`; clicked it and confirmed the full chain — permission guard → route → service →
  `AI_ENABLED` check → `AiDisabledError` → controller mapping → frontend error display — produces
  exactly "AI features are disabled." Generating a real draft requires a real provider key
  (`ANTHROPIC_API_KEY` or `XAI_API_KEY`, matching `AI_PROVIDER`) and `AI_ENABLED=true`, which this
  environment does not have configured; that path is covered by the fake-provider integration
  test and the Grok adapter's own unit test instead.

## Non-goals (this slice)

- No auto-send / "Auto mode" — excluded by ADR-005.
- No "train the AI" plain-language rule editor — facts are added via a plain form.
- No daily briefing, lead scoring, dashboard, or follow-ups calendar — separate phases.
- No rewrite/shorten/translate/tone transforms on an existing draft — fresh generation only.
