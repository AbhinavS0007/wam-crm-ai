# Phase 11 Evidence — 02 Panel Design

## Layers

### Endpoints — `src/api/endpoints.js`

Added thin `apiFetch` wrappers over the Phase 9 routes: `changeStage`, `getActivity`,
`listNotes`/`createNote`/`deleteNote`, `listTags`/`attachTag`/`detachTag`,
`listConversationFollowUps`/`createFollowUp`/`completeFollowUp`/`cancelFollowUp`,
`revealPhone`. All return the backend `{ data, meta }` shape.

### Permissions — `src/lib/permissions.js`

Mirrors the backend permission strings and `allowedNoteVisibilityForRole` so the UI can hide
actions the user can't perform. `hasPermission(permissions, perm)` reads the `permissions`
array from the auth payload.

### Layout — `ConversationView`

Gains a **Details** toggle in the header and an outer flex row: the thread column on the
left, a collapsible `LeadPanel` on the right. A local `stageOverride` keeps the header's
`StageBadge` in sync the moment the stage is changed in the panel (the inbox chip refreshes on
the existing 15s poll).

### Components — `src/components/lead/`

- `LeadPanel` — container; lays out the sections and bumps an `activityKey` after mutations so
  the timeline re-fetches.
- `StageControl` — stage `<select>` → `changeStage`; calls back to update the header.
- `RevealPhone` — rendered only with `client_pii.reveal`; button → `revealPhone` → shows the
  number with an "audited" note.
- `TagsSection` — resolves `conversation.tags` against `listTags`; chips with remove; add
  `<select>`; attach/detach gated by `crm.tags.manage`.
- `NotesSection` — `listNotes` (role-filtered by the API); add form whose visibility options
  are limited to the role; delete own notes.
- `FollowUpsSection` — `listConversationFollowUps`; create form (type/priority/dueAt/note);
  complete/cancel on pending; entire section gated by `crm.tasks.manage` (and it does not even
  fetch without the permission).
- `ActivitySection` — `getActivity` timeline (summary + relative time).

## Correctness / privacy

- Phone renders only after an explicit, permission-gated, audited reveal — asserted by tests.
- UI permission gating is convenience; the backend still enforces every permission.
- Note-visibility options are filtered client-side to the role; the server re-checks.

## Reuse

- `apiFetch` + `useAuth().authedRequest` (token + single 401 refresh-retry).
- `Spinner`, `EmptyState`, `RelativeTime`, `StageBadge`.
- No backend changes; no new npm dependencies.
