import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import {
  accountIdParamsSchema,
  connectAccountBodySchema,
  createAccountBodySchema,
  listAccountsQuerySchema,
} from './whatsapp-account.validation.js';
import {
  connectAccountForActor,
  createAccountForActor,
  disconnectAccountForActor,
  getAccountForOrganization,
  getAccountQrForActor,
  listAccountsForOrganization,
  pauseAccountForActor,
  removeAccountForActor,
  resetAccountForActor,
  resumeAccountForActor,
} from './whatsapp-account.service.js';

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

const mapAccountError = (error) => {
  const key = error.code ?? error.message;
  const errorMap = {
    ACCOUNT_NOT_FOUND: { statusCode: 404, message: 'WhatsApp account not found.' },
    ACCOUNT_BRAND_KEY_EXISTS: {
      statusCode: 409,
      message: 'A WhatsApp account with this brand key already exists.',
    },
    WHATSAPP_DISABLED: {
      statusCode: 409,
      message: 'WhatsApp connections are disabled (WHATSAPP_ENABLED).',
    },
    WHATSAPP_ACCOUNT_NOT_STARTABLE: {
      statusCode: 409,
      message: 'This account cannot be connected from its current status.',
    },
    WHATSAPP_ACCOUNT_REQUIRED: { statusCode: 400, message: 'Account is required.' },
  };

  const mapped = errorMap[key];

  if (!mapped) {
    throw error;
  }

  throw createHttpError({ statusCode: mapped.statusCode, code: key, message: mapped.message });
};

const orgId = (req) => req.auth.organization._id;

export const listAccounts = asyncHandler(async (req, res) => {
  const query = parseWithSchema({
    schema: listAccountsQuerySchema,
    value: req.query,
    source: 'Query',
  });

  const accounts = await listAccountsForOrganization({
    organizationId: orgId(req),
    status: query.status,
    limit: query.limit,
    skip: query.skip,
  });

  res.status(200).json({
    data: accounts,
    meta: { limit: query.limit, skip: query.skip, count: accounts.length },
  });
});

export const createAccount = asyncHandler(async (req, res) => {
  const body = parseWithSchema({
    schema: createAccountBodySchema,
    value: req.body,
    source: 'Body',
  });

  try {
    const account = await createAccountForActor({
      organizationId: orgId(req),
      actor: req.auth.user,
      name: body.name,
      brandKey: body.brandKey,
      description: body.description,
    });

    res.status(201).json({ data: account });
  } catch (error) {
    mapAccountError(error);
  }
});

const runAction = (action, { status = 200 } = {}) =>
  asyncHandler(async (req, res) => {
    const params = parseWithSchema({
      schema: accountIdParamsSchema,
      value: req.params,
      source: 'Params',
    });

    try {
      const data = await action({
        organizationId: orgId(req),
        accountId: params.accountId,
        actor: req.auth.user,
      });

      res.status(status).json({ data });
    } catch (error) {
      mapAccountError(error);
    }
  });

export const getAccount = runAction(getAccountForOrganization);
export const getAccountQr = runAction(getAccountQrForActor);

export const connectAccount = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: accountIdParamsSchema,
    value: req.params,
    source: 'Params',
  });
  const body = parseWithSchema({
    schema: connectAccountBodySchema,
    value: req.body ?? {},
    source: 'Body',
  });

  try {
    const data = await connectAccountForActor({
      organizationId: orgId(req),
      accountId: params.accountId,
      pairingPhoneNumber: body.pairingPhoneNumber,
    });

    res.status(202).json({ data });
  } catch (error) {
    mapAccountError(error);
  }
});
export const pauseAccount = runAction(pauseAccountForActor);
export const resumeAccount = runAction(resumeAccountForActor);
export const resetAccount = runAction(resetAccountForActor);
export const disconnectAccount = runAction(disconnectAccountForActor);
export const removeAccount = runAction(removeAccountForActor);
