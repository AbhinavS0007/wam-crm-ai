# Phase 9 Evidence — 06 Review Checklist

- [x] Reusable `loadVisibleConversationForActor` enforces read-scoping across all new services.
- [x] Notes: role-based visibility on read; create restricted to allowed visibility; soft-delete by creator/read_all.
- [x] Follow-ups: create/list/complete/cancel gated by `crm.tasks.manage`; status transitions only from `pending`.
- [x] Tags: define/archive/attach/detach gated by `crm.tags.manage`; duplicate slug → 409; list open to any authenticated user.
- [x] Conversation stage change + activity timeline, scoped; both write/read via existing repos.
- [x] All mutating actions write an activity-log entry (`NOTE_CREATED`, `FOLLOWUP_*`, `CONVERSATION_TAG_*`, `CONVERSATION_STAGE_CHANGED`).
- [x] No client phone in any response (serializers omit it).
- [x] Nested routers mounted under the conversation router; top-level tag + follow-up routers mounted in `app.js`.
- [x] Backend lint, tests (52 files / 210), index verification, and format check pass locally.
- [ ] GitHub Actions CI green (recorded in 05-ci-result.md).

## Known boundaries

- No WhatsApp account-management API (deferred to its own phase).
- No audit-read endpoint, no frontend, no AI, no media.
