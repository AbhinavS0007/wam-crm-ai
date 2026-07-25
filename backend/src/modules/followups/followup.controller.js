import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import {
  cancelFollowUpForActor,
  completeFollowUpForActor,
  createFollowUpForActor,
  listConversationFollowUpsForActor,
  listMyFollowUps,
} from './followup.service.js';
import {
  conversationIdParamsSchema,
  createFollowUpBodySchema,
  listMyFollowUpsQuerySchema,
  taskIdParamsSchema,
} from './followup.validation.js';

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

const mapFollowUpError = (error) => {
  const errorMap = {
    CONVERSATION_NOT_FOUND: { statusCode: 404, message: 'Conversation not found.' },
    CONVERSATION_ACCESS_DENIED: {
      statusCode: 403,
      message: 'You do not have access to this conversation.',
    },
    FOLLOWUP_NOT_FOUND: { statusCode: 404, message: 'Follow-up task not found.' },
    FOLLOWUP_NOT_PENDING: {
      statusCode: 409,
      message: 'Only a pending follow-up task can change status.',
    },
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

export const createFollowUp = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });
  const body = parseWithSchema({
    schema: createFollowUpBodySchema,
    value: req.body,
    source: 'Body',
  });

  try {
    const task = await createFollowUpForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      actor: req.auth.user,
      permissions: req.auth.permissions,
      assignedTo: body.assignedTo,
      type: body.type,
      note: body.note,
      dueAt: body.dueAt,
      priority: body.priority,
    });

    res.status(201).json({ data: task });
  } catch (error) {
    mapFollowUpError(error);
  }
});

export const listConversationFollowUps = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const tasks = await listConversationFollowUpsForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      actor: req.auth.user,
      permissions: req.auth.permissions,
    });

    res.status(200).json({ data: tasks, meta: { count: tasks.length } });
  } catch (error) {
    mapFollowUpError(error);
  }
});

export const listMyFollowUpTasks = asyncHandler(async (req, res) => {
  const query = parseWithSchema({
    schema: listMyFollowUpsQuerySchema,
    value: req.query,
    source: 'Query',
  });

  const tasks = await listMyFollowUps({
    organizationId: req.auth.organization._id,
    actor: req.auth.user,
    dueBefore: query.dueBefore,
    limit: query.limit,
    skip: query.skip,
  });

  res.status(200).json({
    data: tasks,
    meta: { limit: query.limit, skip: query.skip, count: tasks.length },
  });
});

export const completeFollowUp = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: taskIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const task = await completeFollowUpForActor({
      organizationId: req.auth.organization._id,
      taskId: params.taskId,
      actor: req.auth.user,
    });

    res.status(200).json({ data: task });
  } catch (error) {
    mapFollowUpError(error);
  }
});

export const cancelFollowUp = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: taskIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const task = await cancelFollowUpForActor({
      organizationId: req.auth.organization._id,
      taskId: params.taskId,
      actor: req.auth.user,
    });

    res.status(200).json({ data: task });
  } catch (error) {
    mapFollowUpError(error);
  }
});
