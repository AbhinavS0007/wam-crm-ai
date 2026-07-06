import { PERMISSIONS } from '../constants/permissions.js';
import { REFRESH_SESSION_STATUSES } from '../constants/refresh-session-statuses.js';
import { ORGANIZATION_STATUSES } from '../constants/organization-statuses.js';
import { USER_STATUSES } from '../constants/user-statuses.js';
import { findRefreshSessionById } from '../modules/auth/refresh-session.repository.js';
import {
  resolveUserPermissions,
  userHasEveryPermission,
} from '../modules/auth/permission.service.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { findOrganizationById } from '../modules/organizations/organization.repository.js';
import { findUserById } from '../modules/users/user.repository.js';
import { createHttpError } from '../utils/http-error.js';

const getBearerToken = (req) => {
  const authorizationHeader = req.get('authorization');

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

export const authenticateRequest = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw createHttpError({
        statusCode: 401,
        code: 'AUTH_TOKEN_MISSING',
        message: 'Authentication token is required.',
      });
    }

    const decodedToken = verifyAccessToken(token);

    const [user, organization, session] = await Promise.all([
      findUserById({
        userId: decodedToken.sub,
      }),
      findOrganizationById(decodedToken.org),
      findRefreshSessionById({
        sessionId: decodedToken.sid,
      }),
    ]);

    if (!organization || organization.status !== ORGANIZATION_STATUSES.ACTIVE) {
      throw createHttpError({
        statusCode: 401,
        code: 'ORGANIZATION_NOT_ACTIVE',
        message: 'Organization is not active.',
      });
    }

    if (!user || user.status !== USER_STATUSES.ACTIVE) {
      throw createHttpError({
        statusCode: 401,
        code: 'USER_NOT_ACTIVE',
        message: 'User is not active.',
      });
    }

    if (
      !session ||
      session.status !== REFRESH_SESSION_STATUSES.ACTIVE ||
      session.userId.toString() !== user._id.toString() ||
      session.organizationId.toString() !== organization._id.toString()
    ) {
      throw createHttpError({
        statusCode: 401,
        code: 'SESSION_NOT_ACTIVE',
        message: 'Session is not active.',
      });
    }

    req.auth = {
      token: decodedToken,
      user,
      organization,
      session,
      permissions: resolveUserPermissions(user),
    };

    next();
  } catch (error) {
    next(
      createHttpError({
        statusCode: 401,
        code: error.code ?? error.message ?? 'AUTHENTICATION_FAILED',
        message: 'Authentication failed.',
      }),
    );
  }
};

export const requirePermissions =
  (...permissions) =>
  (req, res, next) => {
    if (!req.auth?.user) {
      next(
        createHttpError({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
        }),
      );
      return;
    }

    if (
      !userHasEveryPermission({
        user: req.auth.user,
        permissions,
      })
    ) {
      next(
        createHttpError({
          statusCode: 403,
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to perform this action.',
          details: {
            requiredPermissions: permissions,
          },
        }),
      );
      return;
    }

    next();
  };

export const requireUsersRead = requirePermissions(PERMISSIONS.USERS_READ);

export const requireUsersManage = requirePermissions(PERMISSIONS.USERS_MANAGE);
