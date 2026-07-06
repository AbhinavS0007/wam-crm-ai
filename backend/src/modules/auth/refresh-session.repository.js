import { REFRESH_SESSION_STATUSES } from '../../constants/refresh-session-statuses.js';

import { RefreshSession } from './refresh-session.model.js';

export const createRefreshSession = (sessionData) => RefreshSession.create(sessionData);

export const findRefreshSessionById = ({ sessionId, includeTokenHash = false } = {}) => {
  let query = RefreshSession.findById(sessionId);

  if (includeTokenHash) {
    query = query.select('+tokenHash');
  }

  return query.exec();
};

export const findRefreshSessionByTokenHash = ({ tokenHash, includeTokenHash = false }) => {
  let query = RefreshSession.findOne({
    tokenHash,
  });

  if (includeTokenHash) {
    query = query.select('+tokenHash');
  }

  return query.exec();
};

export const listActiveRefreshSessionsByUserId = (userId) =>
  RefreshSession.find({
    userId,
    status: REFRESH_SESSION_STATUSES.ACTIVE,
    expiresAt: {
      $gt: new Date(),
    },
  })
    .sort({
      createdAt: -1,
    })
    .exec();

export const updateRefreshSessionLastUsed = ({
  sessionId,
  lastUsedAt = new Date(),
  lastUsedByIp,
}) =>
  RefreshSession.findByIdAndUpdate(
    sessionId,
    {
      lastUsedAt,
      lastUsedByIp,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const markRefreshSessionRotated = ({
  sessionId,
  replacedBySessionId,
  rotatedAt = new Date(),
}) =>
  RefreshSession.findByIdAndUpdate(
    sessionId,
    {
      status: REFRESH_SESSION_STATUSES.ROTATED,
      rotatedAt,
      replacedBySessionId,
      lastUsedAt: rotatedAt,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const markRefreshSessionExpired = ({
  sessionId,
  expiredAt = new Date(),
  revokeReason = 'refresh_token_expired',
}) =>
  RefreshSession.findByIdAndUpdate(
    sessionId,
    {
      status: REFRESH_SESSION_STATUSES.EXPIRED,
      revokedAt: expiredAt,
      revokeReason,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const revokeRefreshSessionById = ({
  sessionId,
  revokedAt = new Date(),
  revokeReason = 'manual_revoke',
}) =>
  RefreshSession.findByIdAndUpdate(
    sessionId,
    {
      status: REFRESH_SESSION_STATUSES.REVOKED,
      revokedAt,
      revokeReason,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const revokeRefreshSessionFamily = ({
  familyId,
  revokedAt = new Date(),
  revokeReason = 'family_revoke',
  markAsCompromised = false,
}) => {
  const updateData = {
    status: markAsCompromised
      ? REFRESH_SESSION_STATUSES.COMPROMISED
      : REFRESH_SESSION_STATUSES.REVOKED,
    revokedAt,
    revokeReason,
  };

  if (markAsCompromised) {
    updateData.reuseDetectedAt = revokedAt;
  }

  return RefreshSession.updateMany(
    {
      familyId,
      status: {
        $in: [REFRESH_SESSION_STATUSES.ACTIVE, REFRESH_SESSION_STATUSES.ROTATED],
      },
    },
    updateData,
    {
      runValidators: true,
    },
  ).exec();
};

export const revokeActiveRefreshSessionsForUser = ({
  userId,
  revokedAt = new Date(),
  revokeReason = 'user_sessions_revoked',
}) =>
  RefreshSession.updateMany(
    {
      userId,
      status: REFRESH_SESSION_STATUSES.ACTIVE,
    },
    {
      status: REFRESH_SESSION_STATUSES.REVOKED,
      revokedAt,
      revokeReason,
    },
    {
      runValidators: true,
    },
  ).exec();
