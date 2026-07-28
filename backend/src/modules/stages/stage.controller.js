import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import {
  archiveStageForActor,
  createStageForActor,
  deleteStageForActor,
  listStagesForOrganization,
} from './stage.service.js';
import {
  createStageBodySchema,
  listStagesQuerySchema,
  stageIdParamsSchema,
} from './stage.validation.js';

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

const mapStageError = (error) => {
  const errorMap = {
    STAGE_NOT_FOUND: { statusCode: 404, message: 'Stage not found.' },
    STAGE_KEY_EXISTS: { statusCode: 409, message: 'A stage with this key already exists.' },
    STAGE_KEY_RESERVED: {
      statusCode: 400,
      message: 'This key is reserved by a built-in stage.',
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

export const listStages = asyncHandler(async (req, res) => {
  const query = parseWithSchema({
    schema: listStagesQuerySchema,
    value: req.query,
    source: 'Query',
  });

  const stages = await listStagesForOrganization({
    organizationId: req.auth.organization._id,
    status: query.status,
    limit: query.limit,
    skip: query.skip,
  });

  res.status(200).json({
    data: stages,
    meta: { limit: query.limit, skip: query.skip, count: stages.length },
  });
});

export const createStage = asyncHandler(async (req, res) => {
  const body = parseWithSchema({
    schema: createStageBodySchema,
    value: req.body,
    source: 'Body',
  });

  try {
    const stage = await createStageForActor({
      organizationId: req.auth.organization._id,
      actor: req.auth.user,
      label: body.label,
      key: body.key,
      color: body.color,
    });

    res.status(201).json({ data: stage });
  } catch (error) {
    mapStageError(error);
  }
});

export const archiveStage = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: stageIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const stage = await archiveStageForActor({
      organizationId: req.auth.organization._id,
      stageId: params.stageId,
      actor: req.auth.user,
    });

    res.status(200).json({ data: stage });
  } catch (error) {
    mapStageError(error);
  }
});

export const deleteStage = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: stageIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const stage = await deleteStageForActor({
      organizationId: req.auth.organization._id,
      stageId: params.stageId,
    });

    res.status(200).json({ data: stage });
  } catch (error) {
    mapStageError(error);
  }
});
