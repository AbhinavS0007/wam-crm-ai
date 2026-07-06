import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { env } from '../src/config/env.js';
import {
  hashPassword,
  validatePlainPassword,
  verifyPassword,
} from '../src/modules/auth/password.service.js';
import {
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from '../src/modules/auth/token.service.js';

describe('Phase 2.4 password utilities', () => {
  it('validates the approved password policy', () => {
    expect(validatePlainPassword()).toMatchObject({
      valid: false,
      reasonCode: 'PASSWORD_REQUIRED',
    });

    expect(validatePlainPassword('short')).toMatchObject({
      valid: false,
      reasonCode: 'PASSWORD_TOO_SHORT',
    });

    expect(validatePlainPassword(' ValidPassword123 ')).toMatchObject({
      valid: false,
      reasonCode: 'PASSWORD_HAS_SURROUNDING_WHITESPACE',
    });

    expect(validatePlainPassword('ValidPassword123')).toMatchObject({
      valid: true,
      reasonCode: null,
    });
  });

  it('hashes and verifies passwords without exposing the plain password', async () => {
    const password = 'ValidPassword123';
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toMatch(/^\$2[aby]\$/);

    await expect(verifyPassword({ password, passwordHash })).resolves.toBe(true);

    await expect(
      verifyPassword({
        password: 'WrongPassword123',
        passwordHash,
      }),
    ).resolves.toBe(false);
  });

  it('rejects invalid passwords before hashing', async () => {
    await expect(hashPassword('short')).rejects.toThrow('PASSWORD_TOO_SHORT');
  });
});

describe('Phase 2.4 token utilities', () => {
  it('signs and verifies access tokens with only approved auth claims', () => {
    const token = signAccessToken({
      userId: 'user-id-1',
      sessionId: 'session-id-1',
      organizationId: 'organization-id-1',
      jwtId: 'jwt-id-1',
    });

    const decoded = verifyAccessToken(token);

    expect(decoded).toMatchObject({
      sub: 'user-id-1',
      sid: 'session-id-1',
      org: 'organization-id-1',
      type: 'access',
      jti: 'jwt-id-1',
    });

    expect(decoded).not.toHaveProperty('role');
    expect(decoded).not.toHaveProperty('permissions');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it('rejects tokens that are not access tokens', () => {
    const token = jwt.sign(
      {
        sub: 'user-id-1',
        sid: 'session-id-1',
        org: 'organization-id-1',
        type: 'refresh',
      },
      env.JWT_ACCESS_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '15m',
        jwtid: 'jwt-id-2',
      },
    );

    expect(() => verifyAccessToken(token)).toThrow('INVALID_ACCESS_TOKEN_TYPE');
  });

  it('generates random opaque refresh tokens and hashes them with SHA-256', () => {
    const refreshTokenOne = generateRefreshToken();
    const refreshTokenTwo = generateRefreshToken();

    expect(refreshTokenOne).not.toBe(refreshTokenTwo);
    expect(refreshTokenOne.length).toBeGreaterThanOrEqual(40);

    const hashOne = hashRefreshToken(refreshTokenOne);
    const hashOneAgain = hashRefreshToken(refreshTokenOne);

    expect(hashOne).toBe(hashOneAgain);
    expect(hashOne).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOne).not.toBe(refreshTokenOne);

    expect(() => hashRefreshToken()).toThrow('REFRESH_TOKEN_REQUIRED');
  });

  it('calculates refresh-token expiry from the configured TTL', () => {
    const fromDate = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = getRefreshTokenExpiresAt({
      fromDate,
    });

    expect(expiresAt.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
