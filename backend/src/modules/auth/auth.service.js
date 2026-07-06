import mongoose from 'mongoose';

import { ACCOUNT_ACCESS_MODES } from '../../constants/account-access-modes.js';
import { AUDIT_EVENTS } from '../../constants/audit-events.js';
import { AUDIT_OUTCOMES } from '../../constants/audit-outcomes.js';
import { ORGANIZATION_STATUSES } from '../../constants/organization-statuses.js';
import { REFRESH_SESSION_STATUSES } from '../../constants/refresh-session-statuses.js';
import { USER_STATUSES } from '../../constants/user-statuses.js';
import { createAuditLog } from '../audit/audit.repository.js';
import {
  findOrganizationById,
  findOrganizationBySlug,
} from '../organizations/organization.repository.js';
import { serializeOrganization } from '../organizations/organization.serializer.js';
import {
  findUserByEmailInOrganization,
  findUserById,
  normalizeEmail,
  updateUserById,
} from '../users/user.repository.js';
import { serializeUser } from '../users/user.serializer.js';

import {
  createRefreshSession,
  findRefreshSessionByTokenHash,
  markRefreshSessionExpired,
  markRefreshSessionRotated,
  revokeActiveRefreshSessionsForUser,
  revokeRefreshSessionById,
  revokeRefreshSessionFamily,
} from './refresh-session.repository.js';
import { serializeRefreshSession } from './refresh-session.serializer.js';
import { clearLoginRateLimit, checkLoginRateLimit } from './login-rate-limit.service.js';
import { verifyPassword } from './password.service.js';
import { resolveUserPermissions } from './permission.service.js';
import {
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
  signAccessToken,
} from './token.service.js';
import { createHttpError } from '../../utils/http-error.js';

const DEFAULT_ORGANIZATION_SLUG = 'vistaar-media';

const createSafeAuditLog = async ({
  organizationId,
  eventType,
  actorId = null,
  targetUserId = null,
  sessionId = null,
  outcome,
  reasonCode,
  requestContext,
  metadata = {},
}) => {
  if (!organizationId) {
    return null;
  }

  return createAuditLog({
    organizationId,
    eventType,
    actorId,
    targetUserId,
    sessionId,
    outcome,
    reasonCode,
    requestId: requestContext?.requestId ?? null,
    ipAddress: requestContext?.ipAddress ?? null,
    userAgent: requestContext?.userAgent ?? null,
    metadata,
  });
};

const createInvalidCredentialsError = () =>
  createHttpError({
    statusCode: 401,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password.',
  });

const createAuthPayload = ({ accessToken, user, organization, session }) => ({
  accessToken,
  tokenType: 'Bearer',
  organization: serializeOrganization(organization),
  user: serializeUser(user),
  permissions: resolveUserPermissions(user),
  session: serializeRefreshSession(session),
});

const createAuthenticatedSession = async ({
  organization,
  user,
  ipAddress,
  userAgent,
  familyId = new mongoose.Types.ObjectId(),
}) => {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  const session = await createRefreshSession({
    organizationId: organization._id,
    userId: user._id,
    familyId,
    tokenHash,
    expiresAt: getRefreshTokenExpiresAt(),
    createdByIp: ipAddress,
    lastUsedByIp: ipAddress,
    userAgent,
  });

  const accessToken = signAccessToken({
    userId: user._id,
    sessionId: session._id,
    organizationId: organization._id,
  });

  return {
    refreshToken,
    accessToken,
    session,
  };
};

export const loginWithPassword = async ({
  organizationSlug = DEFAULT_ORGANIZATION_SLUG,
  email,
  password,
  requestContext,
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOrganizationSlug = organizationSlug.trim().toLowerCase();

  const rateLimitResult = await checkLoginRateLimit({
    email: normalizedEmail,
    ipAddress: requestContext?.ipAddress,
  });

  if (rateLimitResult.limited) {
    throw createHttpError({
      statusCode: 429,
      code: 'AUTH_LOGIN_RATE_LIMITED',
      message: 'Too many login attempts. Please try again later.',
      details: {
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      },
    });
  }

  const organization = await findOrganizationBySlug(normalizedOrganizationSlug);

  if (!organization) {
    throw createInvalidCredentialsError();
  }

  const user = await findUserByEmailInOrganization({
    organizationId: organization._id,
    email: normalizedEmail,
    includePasswordHash: true,
  });

  const passwordMatches =
    user?.passwordHash &&
    (await verifyPassword({
      password,
      passwordHash: user.passwordHash,
    }));

  if (!user || !passwordMatches) {
    await createSafeAuditLog({
      organizationId: organization._id,
      eventType: AUDIT_EVENTS.AUTH_LOGIN_FAILED,
      outcome: AUDIT_OUTCOMES.FAILURE,
      reasonCode: 'invalid_credentials',
      requestContext,
      metadata: {
        source: 'auth-login',
      },
    });

    throw createInvalidCredentialsError();
  }

  if (organization.status !== ORGANIZATION_STATUSES.ACTIVE) {
    await createSafeAuditLog({
      organizationId: organization._id,
      eventType: AUDIT_EVENTS.AUTH_LOGIN_FAILED,
      targetUserId: user._id,
      outcome: AUDIT_OUTCOMES.FAILURE,
      reasonCode: 'organization_not_active',
      requestContext,
      metadata: {
        source: 'auth-login',
      },
    });

    throw createHttpError({
      statusCode: 403,
      code: 'ORGANIZATION_NOT_ACTIVE',
      message: 'Organization is not active.',
    });
  }

  if (user.status !== USER_STATUSES.ACTIVE) {
    await createSafeAuditLog({
      organizationId: organization._id,
      eventType: AUDIT_EVENTS.AUTH_LOGIN_FAILED,
      targetUserId: user._id,
      outcome: AUDIT_OUTCOMES.FAILURE,
      reasonCode: 'user_not_active',
      requestContext,
      metadata: {
        source: 'auth-login',
      },
    });

    throw createHttpError({
      statusCode: 403,
      code: 'USER_NOT_ACTIVE',
      message: 'User is not active.',
    });
  }

  const { refreshToken, accessToken, session } = await createAuthenticatedSession({
    organization,
    user,
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  });

  const updatedUser = await updateUserById({
    userId: user._id,
    organizationId: organization._id,
    updateData: {
      lastLoginAt: new Date(),
    },
  });

  await clearLoginRateLimit({
    email: normalizedEmail,
    ipAddress: requestContext?.ipAddress,
  });

  await createSafeAuditLog({
    organizationId: organization._id,
    eventType: AUDIT_EVENTS.AUTH_LOGIN_SUCCEEDED,
    actorId: updatedUser._id,
    targetUserId: updatedUser._id,
    sessionId: session._id,
    outcome: AUDIT_OUTCOMES.SUCCESS,
    reasonCode: 'login_success',
    requestContext,
    metadata: {
      source: 'auth-login',
    },
  });

  return {
    refreshToken,
    data: createAuthPayload({
      accessToken,
      user: updatedUser,
      organization,
      session,
    }),
  };
};

export const refreshAuthenticatedSession = async ({ refreshToken, requestContext }) => {
  if (!refreshToken) {
    throw createHttpError({
      statusCode: 401,
      code: 'REFRESH_TOKEN_MISSING',
      message: 'Refresh token is required.',
    });
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const existingSession = await findRefreshSessionByTokenHash({
    tokenHash,
  });

  if (!existingSession) {
    throw createHttpError({
      statusCode: 401,
      code: 'REFRESH_SESSION_NOT_FOUND',
      message: 'Refresh session is not valid.',
    });
  }

  if (existingSession.status !== REFRESH_SESSION_STATUSES.ACTIVE) {
    if (existingSession.status === REFRESH_SESSION_STATUSES.ROTATED) {
      await revokeRefreshSessionFamily({
        familyId: existingSession.familyId,
        revokeReason: 'refresh_token_reuse_detected',
        markAsCompromised: true,
      });

      await createSafeAuditLog({
        organizationId: existingSession.organizationId,
        eventType: AUDIT_EVENTS.AUTH_REFRESH_REUSE_DETECTED,
        targetUserId: existingSession.userId,
        sessionId: existingSession._id,
        outcome: AUDIT_OUTCOMES.FAILURE,
        reasonCode: 'refresh_token_reuse_detected',
        requestContext,
        metadata: {
          source: 'auth-refresh',
        },
      });
    }

    throw createHttpError({
      statusCode: 401,
      code: 'REFRESH_SESSION_NOT_ACTIVE',
      message: 'Refresh session is not active.',
    });
  }

  if (existingSession.expiresAt <= new Date()) {
    await markRefreshSessionExpired({
      sessionId: existingSession._id,
    });

    throw createHttpError({
      statusCode: 401,
      code: 'REFRESH_SESSION_EXPIRED',
      message: 'Refresh session has expired.',
    });
  }

  const [organization, user] = await Promise.all([
    findOrganizationById(existingSession.organizationId),
    findUserById({
      userId: existingSession.userId,
    }),
  ]);

  if (
    !organization ||
    organization._id.toString() !== existingSession.organizationId.toString() ||
    organization.status !== ORGANIZATION_STATUSES.ACTIVE
  ) {
    await revokeRefreshSessionById({
      sessionId: existingSession._id,
      revokeReason: 'organization_not_active',
    });

    throw createHttpError({
      statusCode: 401,
      code: 'ORGANIZATION_NOT_ACTIVE',
      message: 'Organization is not active.',
    });
  }

  if (!user || user.status !== USER_STATUSES.ACTIVE) {
    await revokeRefreshSessionById({
      sessionId: existingSession._id,
      revokeReason: 'user_not_active',
    });

    throw createHttpError({
      statusCode: 401,
      code: 'USER_NOT_ACTIVE',
      message: 'User is not active.',
    });
  }

  const {
    refreshToken: newRefreshToken,
    accessToken,
    session: newSession,
  } = await createAuthenticatedSession({
    organization,
    user,
    familyId: existingSession.familyId,
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  });

  const rotatedSession = await markRefreshSessionRotated({
    sessionId: existingSession._id,
    replacedBySessionId: newSession._id,
  });

  await createSafeAuditLog({
    organizationId: organization._id,
    eventType: AUDIT_EVENTS.AUTH_REFRESH_SUCCEEDED,
    actorId: user._id,
    targetUserId: user._id,
    sessionId: newSession._id,
    outcome: AUDIT_OUTCOMES.SUCCESS,
    reasonCode: 'refresh_success',
    requestContext,
    metadata: {
      source: 'auth-refresh',
      rotatedSessionId: rotatedSession._id.toString(),
    },
  });

  return {
    refreshToken: newRefreshToken,
    data: createAuthPayload({
      accessToken,
      user,
      organization,
      session: newSession,
    }),
  };
};

export const logoutCurrentSession = async ({ refreshToken, requestContext }) => {
  if (!refreshToken) {
    return {
      sessionRevoked: false,
    };
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const session = await findRefreshSessionByTokenHash({
    tokenHash,
  });

  if (!session) {
    return {
      sessionRevoked: false,
    };
  }

  if (session.status === REFRESH_SESSION_STATUSES.ACTIVE) {
    await revokeRefreshSessionById({
      sessionId: session._id,
      revokeReason: 'logout',
    });

    await createSafeAuditLog({
      organizationId: session.organizationId,
      eventType: AUDIT_EVENTS.AUTH_LOGOUT,
      actorId: session.userId,
      targetUserId: session.userId,
      sessionId: session._id,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      reasonCode: 'logout',
      requestContext,
      metadata: {
        source: 'auth-logout',
      },
    });

    return {
      sessionRevoked: true,
    };
  }

  return {
    sessionRevoked: false,
  };
};

export const logoutAllUserSessions = async ({ user, organization, session, requestContext }) => {
  await revokeActiveRefreshSessionsForUser({
    userId: user._id,
    revokeReason: 'logout_all',
  });

  await createSafeAuditLog({
    organizationId: organization._id,
    eventType: AUDIT_EVENTS.AUTH_LOGOUT_ALL,
    actorId: user._id,
    targetUserId: user._id,
    sessionId: session._id,
    outcome: AUDIT_OUTCOMES.SUCCESS,
    reasonCode: 'logout_all',
    requestContext,
    metadata: {
      source: 'auth-logout-all',
    },
  });

  return {
    sessionsRevoked: true,
  };
};

export const buildCurrentUserProfile = ({ user, organization, session }) => ({
  organization: serializeOrganization(organization),
  user: serializeUser(user),
  permissions: resolveUserPermissions(user),
  session: serializeRefreshSession(session),
  accountAccessMode: user.accountAccessMode ?? ACCOUNT_ACCESS_MODES.SELECTED,
});
