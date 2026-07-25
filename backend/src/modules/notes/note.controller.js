import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import { createNoteForActor, deleteNoteForActor, listNotesForActor } from './note.service.js';
import {
  conversationIdParamsSchema,
  createNoteBodySchema,
  listNotesQuerySchema,
  noteParamsSchema,
} from './note.validation.js';

const parseWithSchema = ({ schema, value, source }) => {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw createHttpError({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: `${source} validation failed.`,
      details: result.error.flatten().fieldErrors,
    });
  }

  return result.data;
};

const mapNoteError = (error) => {
  const errorMap = {
    CONVERSATION_NOT_FOUND: { statusCode: 404, message: 'Conversation not found.' },
    CONVERSATION_ACCESS_DENIED: {
      statusCode: 403,
      message: 'You do not have access to this conversation.',
    },
    NOTE_NOT_FOUND: { statusCode: 404, message: 'Note not found.' },
    NOTE_VISIBILITY_FORBIDDEN: {
      statusCode: 403,
      message: 'You cannot create a note with that visibility.',
    },
    NOTE_DELETE_FORBIDDEN: { statusCode: 403, message: 'You cannot delete this note.' },
  };

  const mapped = errorMap[error.message];

  if (!mapped) {
    throw error;
  }

  throw createHttpError({
    statusCode: mapped.statusCode,
    code: error.message,
    message: mapped.message,
  });
};

export const listNotes = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });
  const query = parseWithSchema({
    schema: listNotesQuerySchema,
    value: req.query,
    source: 'Query',
  });

  try {
    const notes = await listNotesForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      actor: req.auth.user,
      permissions: req.auth.permissions,
      limit: query.limit,
      skip: query.skip,
    });

    res.status(200).json({
      data: notes,
      meta: { limit: query.limit, skip: query.skip, count: notes.length },
    });
  } catch (error) {
    mapNoteError(error);
  }
});

export const createNote = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });
  const body = parseWithSchema({
    schema: createNoteBodySchema,
    value: req.body,
    source: 'Body',
  });

  try {
    const note = await createNoteForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      actor: req.auth.user,
      permissions: req.auth.permissions,
      body: body.body,
      visibility: body.visibility,
    });

    res.status(201).json({ data: note });
  } catch (error) {
    mapNoteError(error);
  }
});

export const deleteNote = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: noteParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const note = await deleteNoteForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      noteId: params.noteId,
      actor: req.auth.user,
      permissions: req.auth.permissions,
    });

    res.status(200).json({ data: note });
  } catch (error) {
    mapNoteError(error);
  }
});
