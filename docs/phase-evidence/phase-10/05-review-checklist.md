# Phase 10 Evidence — 05 Review Checklist

- [x] Login/logout via the API; session restored on load through the refresh cookie.
- [x] Inbox lists conversations (name, stage, unread, preview, relative time) with poll + refresh.
- [x] Thread view renders inbound/outbound bubbles on the correct side, with outbound status.
- [x] "Load older" paginates via the `beforeSentAt`/`beforeId` cursor.
- [x] Composer sends with a generated `idempotencyKey`; disabled while sending; errors surfaced.
- [x] `401` triggers a single refresh-and-retry, then a clean logout on failure.
- [x] No client phone is rendered (API omits it; asserted in tests).
- [x] No new runtime dependencies; no backend changes.
- [x] Frontend lint, tests (5 files / 12), and build pass; browser smoke confirms the UI renders.
- [ ] GitHub Actions CI green (recorded in 06-ci-result.md).

## Known boundaries

- No realtime/websockets (interval polling only).
- No lead side-panel (notes/tags/stage/reveal UI), no account-management UI, no media, no AI.
