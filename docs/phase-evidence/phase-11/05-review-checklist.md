# Phase 11 Evidence — 05 Review Checklist

- [x] Lead side-panel added to the conversation view, collapsible via a Details toggle.
- [x] Stage change updates the header badge immediately and logs activity.
- [x] Notes: role-filtered list, add with role-limited visibility, delete own.
- [x] Tags: attach/detach as chips; controls gated by `crm.tags.manage`.
- [x] Follow-ups: create + complete/cancel; section gated by `crm.tasks.manage` (no fetch without it).
- [x] Activity timeline renders and refreshes after mutations.
- [x] Phone revealed only via the audited endpoint, gated by `client_pii.reveal`; never rendered otherwise.
- [x] UI permission gating is convenience only; the backend still enforces every permission.
- [x] No backend changes; no new npm dependencies.
- [x] Frontend lint, tests (9 files / 22), and build pass.
- [ ] GitHub Actions CI green (recorded in 06-ci-result.md).

## Known boundaries

- No realtime/websockets (still polling); no account-management UI, media, or AI.
