import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { AUDIT_EVENTS } from '../src/constants/audit-events.js';
import { REFRESH_SESSION_STATUSES } from '../src/constants/refresh-session-statuses.js';
import { ROLES } from '../src/constants/roles.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { RefreshSession } from '../src/modules/auth/refresh-session.model.js';
import { Organization } from '../src/modules/organizations/organization.model.js';
import { createOrganization } from '../src/modules/organizations/organization.repository.js';
import { User } from '../src/modules/users/user.model.js';
import { createUser } from '../src/modules/users/user.repository.js';

const testRunId = randomUUID().replaceAll('-', '');
const password = 'ValidLoginPassword123';

const extractCookiePair = (response) => {
  const setCookie = response.headers['set-cookie'];

  if (!setCookie?.length) {
    return null;
  }

  return setCookie[0].split(';')[0];
};

const createLoginFixture = async (suffix) => {
  const organization = await createOrganization({
    name: `Auth Flow ${suffix}`,
    slug: `auth-flow-${suffix}-${testRunId}`,
  });

  const passwordHash = await hashPassword(password);

  const user = await createUser({
    organizationId: organization._id,
    name: `Auth User ${suffix}`,
    email: `auth-${suffix}-${testRunId}@example.com`,
    passwordHash,
    role: ROLES.SUPER_ADMIN,
    mustChangePassword: false,
  });

  return {
    organization,
    user,
    email: user.email,
    password,
  };
};

const login = ({ organization, email }) =>
  request(app).post('/api/v1/auth/login').set('user-agent', `vitest-${testRunId}`).send({
    organizationSlug: organization.slug,
    email,
    password,
  });

describe('Phase 2 auth flow endpoints', () => {
  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();

    await Promise.all([Organization.init(), User.init(), RefreshSession.init(), AuditLog.init()]);
  });

  afterAll(async () => {
    try {
      await AuditLog.deleteMany({
        userAgent: new RegExp(testRunId),
      });

      await RefreshSession.deleteMany({
        userAgent: new RegExp(testRunId),
      });

      await User.deleteMany({
        email: new RegExp(testRunId),
      });

      await Organization.deleteMany({
        slug: new RegExp(testRunId),
      });
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('logs in and returns the authenticated /me profile', async () => {
    const fixture = await createLoginFixture('me');

    const loginResponse = await login({
      organization: fixture.organization,
      email: fixture.email,
    }).expect(200);

    const refreshCookie = extractCookiePair(loginResponse);

    expect(refreshCookie).toMatch(/^wam_refresh=/);
    expect(loginResponse.body.data.accessToken).toBeTruthy();
    expect(loginResponse.body.data.user).toMatchObject({
      email: fixture.email,
      role: ROLES.SUPER_ADMIN,
    });
    expect(loginResponse.body.data.permissions).toContain('users.manage');
    expect(loginResponse.body.data.user).not.toHaveProperty('passwordHash');

    const meResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .expect(200);

    expect(meResponse.body.data.user).toMatchObject({
      id: loginResponse.body.data.user.id,
      email: fixture.email,
    });
    expect(meResponse.body.data.organization.slug).toBe(fixture.organization.slug);
  });

  it('rotates refresh tokens and detects reuse of a rotated token', async () => {
    const fixture = await createLoginFixture('refresh');

    const loginResponse = await login({
      organization: fixture.organization,
      email: fixture.email,
    }).expect(200);

    const oldRefreshCookie = extractCookiePair(loginResponse);

    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldRefreshCookie)
      .set('user-agent', `vitest-${testRunId}`)
      .expect(200);

    const newRefreshCookie = extractCookiePair(refreshResponse);

    expect(newRefreshCookie).toMatch(/^wam_refresh=/);
    expect(newRefreshCookie).not.toBe(oldRefreshCookie);

    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldRefreshCookie)
      .set('user-agent', `vitest-${testRunId}`)
      .expect(401);

    const sessions = await RefreshSession.find({
      userId: fixture.user._id,
    }).exec();

    expect(sessions).toHaveLength(2);
    expect(
      sessions.every((session) => session.status === REFRESH_SESSION_STATUSES.COMPROMISED),
    ).toBe(true);

    const reuseAuditLog = await AuditLog.findOne({
      organizationId: fixture.organization._id,
      eventType: AUDIT_EVENTS.AUTH_REFRESH_REUSE_DETECTED,
    }).exec();

    expect(reuseAuditLog).toBeTruthy();
  });

  it('logs out the current refresh session and clears the cookie', async () => {
    const fixture = await createLoginFixture('logout');

    const loginResponse = await login({
      organization: fixture.organization,
      email: fixture.email,
    }).expect(200);

    const refreshCookie = extractCookiePair(loginResponse);

    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie)
      .set('user-agent', `vitest-${testRunId}`)
      .expect(200);

    expect(logoutResponse.body.data).toMatchObject({
      loggedOut: true,
      sessionRevoked: true,
    });

    expect(extractCookiePair(logoutResponse)).toBe('wam_refresh=');

    const session = await RefreshSession.findById(loginResponse.body.data.session.id).exec();

    expect(session.status).toBe(REFRESH_SESSION_STATUSES.REVOKED);
    expect(session.revokeReason).toBe('logout');
  });

  it('logs out all active sessions for the authenticated user', async () => {
    const fixture = await createLoginFixture('logout-all');

    const firstLoginResponse = await login({
      organization: fixture.organization,
      email: fixture.email,
    }).expect(200);

    await login({
      organization: fixture.organization,
      email: fixture.email,
    }).expect(200);

    const logoutAllResponse = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${firstLoginResponse.body.data.accessToken}`)
      .set('user-agent', `vitest-${testRunId}`)
      .expect(200);

    expect(logoutAllResponse.body.data).toMatchObject({
      loggedOut: true,
      sessionsRevoked: true,
    });

    const activeSessionCount = await RefreshSession.countDocuments({
      userId: fixture.user._id,
      status: REFRESH_SESSION_STATUSES.ACTIVE,
    });

    expect(activeSessionCount).toBe(0);
  });

  it('rejects invalid credentials without exposing password data', async () => {
    const fixture = await createLoginFixture('invalid');

    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('user-agent', `vitest-${testRunId}`)
      .send({
        organizationSlug: fixture.organization.slug,
        email: fixture.email,
        password: 'WrongPassword123',
      })
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});
