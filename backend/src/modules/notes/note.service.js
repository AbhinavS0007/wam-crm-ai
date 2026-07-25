import { ACTIVITY_EVENTS } from '../../constants/activity-events.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { createActivity } from '../activity/activity-log.repository.js';
import { loadVisibleConversationForActor } from '../conversations/conversation.service.js';
import {
  createNote,
  findNoteById,
  findNotesForConversationByVisibility,
  getAllowedNoteVisibilityForRole,
  softDeleteNote,
} from './note.repository.js';
import { serializeNote } from './note.serializer.js';

export const listNotesForActor = async ({
  organizationId,
  conversationId,
  actor,
  permissions,
  limit,
  skip,
}) => {
  await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  const notes = await findNotesForConversationByVisibility({
    organizationId,
    conversationId,
    role: actor.role,
    limit,
    skip,
  });

  return notes.map((note) => serializeNote(note));
};

export const createNoteForActor = async ({
  organizationId,
  conversationId,
  actor,
  permissions,
  body,
  visibility,
}) => {
  const conversation = await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  if (!getAllowedNoteVisibilityForRole(actor.role).includes(visibility)) {
    throw new Error('NOTE_VISIBILITY_FORBIDDEN');
  }

  const note = await createNote({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    body,
    visibility,
    createdBy: actor._id,
  });

  await createActivity({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    actorId: actor._id,
    eventType: ACTIVITY_EVENTS.NOTE_CREATED,
    summary: 'Note added to the conversation.',
    metadata: {
      visibility,
    },
  });

  return serializeNote(note);
};

export const deleteNoteForActor = async ({
  organizationId,
  conversationId,
  noteId,
  actor,
  permissions,
}) => {
  await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  const note = await findNoteById({
    noteId,
    organizationId,
  });

  if (!note || note.conversationId.toString() !== conversationId || note.deletedAt) {
    throw new Error('NOTE_NOT_FOUND');
  }

  const isCreator = note.createdBy.toString() === actor._id.toString();
  const canManageAll = permissions.includes(PERMISSIONS.CONVERSATIONS_READ_ALL);

  if (!isCreator && !canManageAll) {
    throw new Error('NOTE_DELETE_FORBIDDEN');
  }

  const deleted = await softDeleteNote({
    noteId: note._id,
    organizationId,
    actorId: actor._id,
  });

  return serializeNote(deleted);
};
