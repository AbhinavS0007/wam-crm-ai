# Phase 9 Evidence — 02 API Design

All endpoints follow the Phase-7 pattern: `routes → controller (zod + asyncHandler) →
service (scoping + activity) → repository`, `{ data, meta }` responses, `createHttpError`.

## Shared foundation

- `loadVisibleConversationForActor` exported from `conversations/conversation.service.js`
  (extracted from the private scope helper). Every conversation-scoped service calls it
  first, so read-scoping (assigned-only vs read-all) and org isolation are enforced
  uniformly. Throws `CONVERSATION_NOT_FOUND` / `CONVERSATION_ACCESS_DENIED`.
- New serializers: `note`, `followup-task`, `tag`, `activity-log`.
- New guards in `auth.middleware.js`: `requireCrmTasksManage`, `requireCrmTagsManage`.

## Endpoints

### Notes — `modules/notes` (nested under a conversation)

- `GET /conversations/:id/notes` — role-visibility filtered (staff: shared; manager: +manager;
  admin: +admin).
- `POST /conversations/:id/notes` — requested visibility must be allowed for the role; logs `NOTE_CREATED`.
- `DELETE /conversations/:id/notes/:noteId` — soft delete; creator or `conversations.read_all`.

### Follow-ups — `modules/followups` (gated by `crm.tasks.manage`)

- `POST /conversations/:id/follow-ups`, `GET /conversations/:id/follow-ups`.
- `GET /follow-ups` — the actor's pending tasks.
- `PATCH /follow-ups/:taskId/complete` and `/cancel` — only from `pending`; log `FOLLOWUP_*`.

### Tags — `modules/tags` (define/attach gated by `crm.tags.manage`)

- `GET /tags` (any authenticated), `POST /tags` (dup slug → 409), `PATCH /tags/:tagId/archive`.
- `POST /conversations/:id/tags` / `DELETE /conversations/:id/tags/:tagId` — attach/detach
  (`$addToSet`/`$pull` on `conversation.tags`); log `CONVERSATION_TAG_ADDED/REMOVED`.

### Conversation stage + activity — `modules/conversations`

- `PATCH /conversations/:id/stage` — scoped; logs `CONVERSATION_STAGE_CHANGED`.
- `GET /conversations/:id/activity` — scoped; returns the serialized timeline.

## Routing

Conversation sub-resources use `Router({ mergeParams: true })` mounted under the
conversation router (which already applies `authenticateRequest`). Top-level `tagRouter`
(`/api/v1/tags`) and `followUpRouter` (`/api/v1/follow-ups`) are mounted in `app.js`.

## Reuse

`findNotesForConversationByVisibility`, `getAllowedNoteVisibilityForRole`, `softDeleteNote`,
`createFollowUpTask`, `findPendingTasksByUser`, `updateTaskStatus`, `createTag`,
`findTagBySlugInScope`, `archiveTag`, `updateStage`, `findActivityForConversation`,
`createActivity`. No new indexes required.
