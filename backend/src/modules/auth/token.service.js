import { randomBytes, randomUUID, createHash } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';

export const ACCESS_TOKEN_TYPE = 'access';

export const signAccessToken = ({ userId, sessionId, organizationId, jwtId = randomUUID() }) => {
  if (!userId || !sessionId || !organizationId) {
    throw new Error('ACCESS_TOKEN_REQUIRED_CLAIMS_MISSING');
  }

  return jwt.sign(
    {
      sub: userId.toString(),
      sid: sessionId.toString(),
      org: organizationId.toString(),
      type: ACCESS_TOKEN_TYPE,
    },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      jwtid: jwtId,
    },
  );
};

export const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  });

  if (decoded.type !== ACCESS_TOKEN_TYPE) {
    throw new Error('INVALID_ACCESS_TOKEN_TYPE');
  }

  return decoded;
};

export const generateRefreshToken = () =>
  randomBytes(env.REFRESH_TOKEN_BYTES).toString('base64url');

export const hashRefreshToken = (refreshToken) => {
  if (!refreshToken) {
    throw new Error('REFRESH_TOKEN_REQUIRED');
  }

  return createHash('sha256').update(refreshToken).digest('hex');
};

export const getRefreshTokenExpiresAt = ({ fromDate = new Date() } = {}) => {
  const expiresAt = new Date(fromDate);
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);

  return expiresAt;
};
