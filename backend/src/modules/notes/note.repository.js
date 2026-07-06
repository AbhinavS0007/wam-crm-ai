import { NOTE_VISIBILITY } from '../../constants/note-visibility.js';
import { ROLES } from '../../constants/roles.js';
import { Note } from './note.model.js';

export const getAllowedNoteVisibilityForRole = (role) => {
  if (role === ROLES.STAFF) {
    return [NOTE_VISIBILITY.SHARED];
  }

  if (role === ROLES.MANAGER) {
    return [NOTE_VISIBILITY.SHARED, NOTE_VISIBILITY.MANAGER];
  }

  return [NOTE_VISIBILITY.SHARED, NOTE_VISIBILITY.MANAGER, NOTE_VISIBILITY.ADMIN];
};

export const createNote = (noteData) => Note.create(noteData);

export const findNotesForConversationByVisibility = ({
  organizationId,
  conversationId,
  role,
  includeDeleted = false,
  limit = 50,
  skip = 0,
} = {}) => {
  const filter = {
    organizationId,
    conversationId,
    visibility: {
      $in: getAllowedNoteVisibilityForRole(role),
    },
  };

  if (!includeDeleted) {
    filter.deletedAt = null;
  }

  return Note.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const softDeleteNote = ({ noteId, organizationId, actorId, now = new Date() } = {}) =>
  Note.findOneAndUpdate(
    {
      _id: noteId,
      organizationId,
    },
    {
      $set: {
        deletedAt: now,
        updatedBy: actorId,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
