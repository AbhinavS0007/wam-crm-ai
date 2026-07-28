import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { ROLES } from '../src/constants/roles.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { RefreshSession } from '../src/modules/auth/refresh-session.model.js';
import { Organization } from '../src/modules/organizations/organization.model.js';
import { createOrganization } from '../src/modules/organizations/organization.repository.js';
import { User } from '../src/modules/users/user.model.js';
import { createUser } from '../src/modules/users/user.repository.js';

const testRunId = randomUUID().replaceAll('-', '');
const currentPassword = 'CurrentPassword123456';

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'user-agent': `vitest-${testRunId}`,
});

const createSignedInUser = async ({ mustChangePassword = false, suffix = 'user' } = {}) => {
  const fixtureId = `${suffix}-${randomUUID().replaceAll('-', '')}-${testRunId}`;

  const organization = await createOrganization({
    name: `Change Password ${suffix}`,
    slug: `change-password-${fixtureId}`,
  });

  const passwordHash = await hashPassword(currentPassword);

  const user = await createUser({
    organizationId: organization._id,
    name: `User ${suffix}`,
    email: `change-password-${fixtureId}@example.com`,
    passwordHash,
    role: ROLES.ADMIN,
    mustChangePassword,
  });

  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .set('user-agent', `vitest-${testRunId}`)
    .send({
      organizationSlug: organization.slug,
      email: user.email,
      password: currentPassword,
    })
    .expect(200);

  return {
    organization,
    user,
    accessToken: loginResponse.body.data.accessToken,
  };
};

describe('Phase 15 self-service password change', () => {
  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();

    await Promise.all([Organization.init(), User.init(), RefreshSession.init(), AuditLog.init()]);
  });

  afterAll(async () => {
    try {
      await AuditLog.deleteMany({ userAgent: new RegExp(testRunId) });
      await RefreshSession.deleteMany({ userAgent: new RegExp(testRunId) });
      await User.deleteMany({ email: new RegExp(testRunId) });
      await Organization.deleteMany({ slug: new RegExp(testRunId) });
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('changes the password, clears mustChangePassword, and lets the new password sign in', async () => {
    const fixture = await createSignedInUser({ mustChangePassword: true, suffix: 'happy' });
    const newPassword = 'BrandNewPassword456789';

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set(authHeader(fixture.accessToken))
      .send({ currentPassword, newPassword })
      .expect(200);

    expect(response.body.data.passwordChanged).toBe(true);
    expect(response.body.data.user.mustChangePassword).toBe(false);

    // The new password works...
    await request(app)
      .post('/api/v1/auth/login')
      .set('user-agent', `vitest-${testRunId}`)
      .send({
        organizationSlug: fixture.organization.slug,
        email: fixture.user.email,
        password: newPassword,
      })
      .expect(200);

    // ...and the old one no longer does.
    await request(app)
      .post('/api/v1/auth/login')
      .set('user-agent', `vitest-${testRunId}`)
      .send({
        organizationSlug: fixture.organization.slug,
        email: fixture.user.email,
        password: currentPassword,
      })
      .expect(401);
  });

  it('rejects a wrong current password with 401', async () => {
    const fixture = await createSignedInUser({ suffix: 'wrongcurrent' });

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set(authHeader(fixture.accessToken))
      .send({
        currentPassword: 'NotTheCurrentPassword1',
        newPassword: 'BrandNewPassword456789',
      })
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('rejects a new password that is too short', async () => {
    const fixture = await createSignedInUser({ suffix: 'weak' });

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set(authHeader(fixture.accessToken))
      .send({ currentPassword, newPassword: 'short' })
      .expect(400);

    expect(response.body.error.code).toBe('PASSWORD_TOO_SHORT');
  });

  it('rejects reusing the current password', async () => {
    const fixture = await createSignedInUser({ suffix: 'reuse' });

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set(authHeader(fixture.accessToken))
      .send({ currentPassword, newPassword: currentPassword })
      .expect(400);

    expect(response.body.error.code).toBe('PASSWORD_REUSED');
  });
});

describe('Phase 15 forced password change enforcement', () => {
  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();

    await Promise.all([Organization.init(), User.init(), RefreshSession.init(), AuditLog.init()]);
  });

  afterAll(async () => {
    try {
      await AuditLog.deleteMany({ userAgent: new RegExp(testRunId) });
      await RefreshSession.deleteMany({ userAgent: new RegExp(testRunId) });
      await User.deleteMany({ email: new RegExp(testRunId) });
      await Organization.deleteMany({ slug: new RegExp(testRunId) });
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('blocks the product API with 403 while a password change is owed', async () => {
    const fixture = await createSignedInUser({ mustChangePassword: true, suffix: 'blocked' });

    const response = await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(fixture.accessToken))
      .expect(403);

    expect(response.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('still allows /auth/me so the user can be told to change their password', async () => {
    const fixture = await createSignedInUser({ mustChangePassword: true, suffix: 'meopen' });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(fixture.accessToken))
      .expect(200);

    expect(response.body.data.user.mustChangePassword).toBe(true);
  });

  it('unblocks the product API once the password has been changed', async () => {
    const fixture = await createSignedInUser({ mustChangePassword: true, suffix: 'unblock' });

    await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(fixture.accessToken))
      .expect(403);

    await request(app)
      .post('/api/v1/auth/change-password')
      .set(authHeader(fixture.accessToken))
      .send({ currentPassword, newPassword: 'BrandNewPassword456789' })
      .expect(200);

    // Same access token: the forced-change session stays usable after the change.
    await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(fixture.accessToken))
      .expect(200);
  });
});
