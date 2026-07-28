import { asyncHandler } from '../../utils/async-handler.js';
import { createHttpError } from '../../utils/http-error.js';

import {
  buildClearRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from './auth-cookie.service.js';
import {
  buildCurrentUserProfile,
  changeOwnPassword,
  loginWithPassword,
  logoutAllUserSessions,
  logoutCurrentSession,
  refreshAuthenticatedSession,
} from './auth.service.js';
import { changePasswordBodySchema, loginBodySchema } from './auth.validation.js';

const parseBody = (schema, body) => {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw createHttpError({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed.',
      details: result.error.flatten().fieldErrors,
    });
  }

  return result.data;
};

export const login = asyncHandler(async (req, res) => {
  const body = parseBody(loginBodySchema, req.body);

  const result = await loginWithPassword({
    organizationSlug: body.organizationSlug,
    email: body.email,
    password: body.password,
    requestContext: req.context,
  });

  setRefreshTokenCookie({
    res,
    refreshToken: result.refreshToken,
  });

  res.status(200).json({
    data: result.data,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  const result = await refreshAuthenticatedSession({
    refreshToken,
    requestContext: req.context,
  });

  setRefreshTokenCookie({
    res,
    refreshToken: result.refreshToken,
  });

  res.status(200).json({
    data: result.data,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  const result = await logoutCurrentSession({
    refreshToken,
    requestContext: req.context,
  });

  clearRefreshTokenCookie(res);

  res.status(200).json({
    data: {
      loggedOut: true,
      sessionRevoked: result.sessionRevoked,
    },
  });
});

export const logoutAll = asyncHandler(async (req, res) => {
  const result = await logoutAllUserSessions({
    user: req.auth.user,
    organization: req.auth.organization,
    session: req.auth.session,
    requestContext: req.context,
  });

  res.setHeader('Set-Cookie', buildClearRefreshTokenCookie());

  res.status(200).json({
    data: {
      loggedOut: true,
      sessionsRevoked: result.sessionsRevoked,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const body = parseBody(changePasswordBodySchema, req.body);

  const result = await changeOwnPassword({
    user: req.auth.user,
    organization: req.auth.organization,
    session: req.auth.session,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
    requestContext: req.context,
  });

  res.status(200).json({
    data: {
      passwordChanged: result.passwordChanged,
      user: result.user,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    data: buildCurrentUserProfile({
      user: req.auth.user,
      organization: req.auth.organization,
      session: req.auth.session,
    }),
  });
});
