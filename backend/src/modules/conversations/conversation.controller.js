import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import {
  assignConversationForActor,
  changeConversationStageForActor,
  getConversationActivityForActor,
  getConversationForActor,
  getConversationMessagesForActor,
  listConversationsForActor,
  sendMessageForActor,
} from './conversation.service.js';
import {
  assignConversationBodySchema,
  changeStageBodySchema,
  conversationActivityQuerySchema,
  conversationIdParamsSchema,
  conversationMessagesQuerySchema,
  listConversationsQuerySchema,
  sendMessageBodySchema,
} from './conversation.validation.js';

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

const mapConversationError = (error) => {
  const errorMap = {
    CONVERSATION_NOT_FOUND: {
      statusCode: 404,
      message: 'Conversation not found.',
    },
    CONVERSATION_ACCESS_DENIED: {
      statusCode: 403,
      message: 'You do not have access to this conversation.',
    },
  };

  const mappedError = errorMap[error.message];

  if (!mappedError) {
    throw error;
  }

  throw createHttpError({
    statusCode: mappedError.statusCode,
    code: error.message,
    message: mappedError.message,
  });
};

export const listConversations = asyncHandler(async (req, res) => {
  const query = parseWithSchema({
    schema: listConversationsQuerySchema,
    value: req.query,
    source: 'Query',
  });

  const conversations = await listConversationsForActor({
    organizationId: req.auth.organization._id,
    actorId: req.auth.user._id,
    permissions: req.auth.permissions,
    whatsappAccountId: query.whatsappAccountId,
    stage: query.stage,
    status: query.status,
    limit: query.limit,
    skip: query.skip,
  });

  res.status(200).json({
    data: conversations,
    meta: {
      limit: query.limit,
      skip: query.skip,
      count: conversations.length,
    },
  });
});

export const getConversation = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const data = await getConversationForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      permissions: req.auth.permissions,
      actorId: req.auth.user._id,
    });

    res.status(200).json({
      data,
    });
  } catch (error) {
    mapConversationError(error);
  }
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  const query = parseWithSchema({
    schema: conversationMessagesQuerySchema,
    value: req.query,
    source: 'Query',
  });

  try {
    const messages = await getConversationMessagesForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      permissions: req.auth.permissions,
      actorId: req.auth.user._id,
      beforeSentAt: query.beforeSentAt,
      beforeId: query.beforeId,
      limit: query.limit,
    });

    res.status(200).json({
      data: messages,
      meta: {
        limit: query.limit,
        count: messages.length,
      },
    });
  } catch (error) {
    mapConversationError(error);
  }
});

export const assignConversation = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  const body = parseWithSchema({
    schema: assignConversationBodySchema,
    value: req.body,
    source: 'Body',
  });

  try {
    const conversation = await assignConversationForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      actor: req.auth.user,
      assignedTo: body.assignedTo,
      assignedTeam: body.assignedTeam,
    });

    res.status(200).json({
      data: conversation,
    });
  } catch (error) {
    mapConversationError(error);
  }
});

export const changeConversationStage = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  const body = parseWithSchema({
    schema: changeStageBodySchema,
    value: req.body,
    source: 'Body',
  });

  try {
    const conversation = await changeConversationStageForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      permissions: req.auth.permissions,
      actor: req.auth.user,
      stage: body.stage,
    });

    res.status(200).json({
      data: conversation,
    });
  } catch (error) {
    mapConversationError(error);
  }
});

export const getConversationActivity = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  const query = parseWithSchema({
    schema: conversationActivityQuerySchema,
    value: req.query,
    source: 'Query',
  });

  try {
    const activity = await getConversationActivityForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      permissions: req.auth.permissions,
      actorId: req.auth.user._id,
      limit: query.limit,
      skip: query.skip,
    });

    res.status(200).json({
      data: activity,
      meta: {
        limit: query.limit,
        skip: query.skip,
        count: activity.length,
      },
    });
  } catch (error) {
    mapConversationError(error);
  }
});

export const sendConversationMessage = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: conversationIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  const body = parseWithSchema({
    schema: sendMessageBodySchema,
    value: req.body,
    source: 'Body',
  });

  try {
    const result = await sendMessageForActor({
      organizationId: req.auth.organization._id,
      conversationId: params.conversationId,
      permissions: req.auth.permissions,
      actor: req.auth.user,
      body: body.body,
      idempotencyKey: body.idempotencyKey,
    });

    res.status(result.created ? 202 : 200).json({
      data: result.message,
      meta: {
        queued: result.created,
      },
    });
  } catch (error) {
    mapConversationError(error);
  }
});
