import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import { getContactForActor, revealContactPhoneForActor } from './contact.service.js';
import { contactIdParamsSchema } from './contact.validation.js';

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

const mapContactError = (error) => {
  if (error.message === 'CONTACT_NOT_FOUND') {
    throw createHttpError({
      statusCode: 404,
      code: 'CONTACT_NOT_FOUND',
      message: 'Contact not found.',
    });
  }

  throw error;
};

export const getContact = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: contactIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const contact = await getContactForActor({
      organizationId: req.auth.organization._id,
      contactId: params.contactId,
    });

    res.status(200).json({
      data: contact,
    });
  } catch (error) {
    mapContactError(error);
  }
});

export const revealContactPhone = asyncHandler(async (req, res) => {
  const params = parseWithSchema({
    schema: contactIdParamsSchema,
    value: req.params,
    source: 'Params',
  });

  try {
    const revealed = await revealContactPhoneForActor({
      organizationId: req.auth.organization._id,
      contactId: params.contactId,
      actor: req.auth.user,
      session: req.auth.session,
      requestContext: req.context,
    });

    res.status(200).json({
      data: revealed,
    });
  } catch (error) {
    mapContactError(error);
  }
});
