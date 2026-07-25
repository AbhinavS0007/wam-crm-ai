# Phase 9 Evidence — 03 Test Results

## New supertest suites

### `tests/note-api.test.js`

- Staff can create and read a `shared` note on an assigned conversation.
- Staff creating an `admin`-visibility note → 403.
- `admin`-visibility notes are hidden from staff but visible to admins.
- Scoped staff blocked from an unassigned conversation's notes → 403.
- Creator can soft-delete a note (removed from the list afterward).
- No phone appears in note responses.

### `tests/followup-api.test.js`

- Create → list (mine) → complete lifecycle; `completedAt` set.
- Completing an already-cancelled task → 409.
- Create/list forbidden without `crm.tasks.manage` → 403.
- Body validation → 400.

### `tests/tag-api.test.js`

- Create tag (slug auto-normalized), duplicate slug → 409, attach/detach on a conversation.
- Archive a tag → `archived`.
- Any authenticated user can list tags; create forbidden without `crm.tags.manage` → 403.

### `tests/conversation-crm-api.test.js`

- Stage change updates the conversation and records a `CONVERSATION_STAGE_CHANGED` activity.
- Invalid stage value → 400.
- Scoped staff blocked from an unassigned conversation's stage change and activity → 403.

## Result

```
cd backend && npm test
```

Result: 52 files / 210 tests passed (16 new Phase 9 tests across the four suites above).
