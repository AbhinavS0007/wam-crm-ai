import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import {
  archiveKnowledgeForActor,
  createKnowledgeForActor,
  listKnowledgeForOrganization,
} from './ai-knowledge.service.js';
import {
  createKnowledgeBodySchema,
  knowledgeIdParamsSchema,
  listKnowledgeQuerySchema,
} from './ai-knowledge.validation.js';

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

const mapKnowledgeError = (error) => {
  const errorMap = {
    AI_KNOWLEDGE_NOT_FOUND: { statusCode: 404, message: 'Knowledge entry not found.' },
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

export const listKnowledge = asyncHandler(async (req, res) => {
  const query = parseWithSchema({
    schema: listKnowledgeQuerySchema,
    value: req.query,
    source: 'Query',
  });

  const knowledge = await listKnowledgeForOrganization({
    organizationId: req.auth.organization._id,
    status: query.status,
    limit: query.limit,
    skip: query.skip,
  });

  res.status(200).json({
    data: knowledge,
    meta: { limit: query.limit, skip: query.skip, count: knowledge.length },
  });
});

export const createKnowledge = asyncHandler(async (req, res) => {
  const body = parseWithSchema({
    schema: createKnowledgeBodySchema,
    value: req.body,
    source: 'Body',
  });

  const knowledge = await createKnowledgeForActor({
    organizationId: req.auth.organization._id,
    actor: req.auth.user,
    label: body.label,
    content: body.content,
    category: body.category,
  });

  res.status(201).json({ data: knowledge });
});

export const archiveKnowledge = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: knowledgeIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const knowledge = await archiveKnowledgeForActor({
      organizationId: req.auth.organization._id,
      knowledgeId: params.knowledgeId,
      actor: req.auth.user,
    });

    res.status(200).json({ data: knowledge });
  } catch (error) {
    mapKnowledgeError(error);
  }
});
