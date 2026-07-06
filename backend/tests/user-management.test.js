import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { AUDIT_EVENTS } from '../src/constants/audit-events.js';
import { ACCOUNT_ACCESS_MODES } from '../src/constants/account-access-modes.js';
import { PERMISSIONS } from '../src/constants/permissions.js';
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
const password = 'ValidUserApiPassword123';

const createFixture = async ({ actorRole = ROLES.ADMIN } = {}) => {
  const fixtureId = `${actorRole}-${randomUUID().replaceAll('-', '')}-${testRunId}`;

  const organization = await createOrganization({
    name: `User API ${actorRole}`,
    slug: `user-api-${fixtureId}`,
  });

  const passwordHash = await hashPassword(password);

  const actor = await createUser({
    organizationId: organization._id,
    name: `Actor ${actorRole}`,
    email: `actor-${fixtureId}@example.com`,
    passwordHash,
    role: actorRole,
    mustChangePassword: false,
  });

  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .set('user-agent', `vitest-${testRunId}`)
    .send({
      organizationSlug: organization.slug,
      email: actor.email,
      password,
    })
    .expect(200);

  return {
    organization,
    actor,
    accessToken: loginResponse.body.data.accessToken,
  };
};

const createManagedUser = async ({ organization, suffix = 'managed' }) => {
  const passwordHash = await hashPassword(password);

  return createUser({
    organizationId: organization._id,
    name: `Managed User ${suffix}`,
    email: `managed-${suffix}-${testRunId}@example.com`,
    passwordHash,
    role: ROLES.STAFF,
    mustChangePassword: false,
  });
};

describe('Phase 2 user-management endpoints', () => {
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

  it('allows an admin to create, list, read, update, disable, enable and reset a user password', async () => {
    const fixture = await createFixture({
      actorRole: ROLES.ADMIN,
    });

    const createResponse = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .set('user-agent', `vitest-${testRunId}`)
      .send({
        name: 'Created Staff User',
        email: `created-staff-${testRunId}@example.com`,
        password: 'CreatedStaffPassword123',
        role: ROLES.STAFF,
        permissionOverrides: {
          allow: [PERMISSIONS.CRM_TAGS_MANAGE],
          deny: [],
        },
        accountAccessMode: ACCOUNT_ACCESS_MODES.SELECTED,
        accountAccess: [],
        mustChangePassword: true,
      })
      .expect(201);

    expect(createResponse.body.data).toMatchObject({
      name: 'Created Staff User',
      email: `created-staff-${testRunId}@example.com`,
      role: ROLES.STAFF,
      accountAccessMode: ACCOUNT_ACCESS_MODES.SELECTED,
      status: 'active',
      mustChangePassword: true,
    });

    expect(createResponse.body.data).not.toHaveProperty('passwordHash');

    const userId = createResponse.body.data.id;

    const listResponse = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(listResponse.body.data.some((user) => user.id === userId)).toBe(true);

    const getResponse = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(getResponse.body.data.id).toBe(userId);

    const updateResponse = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .set('user-agent', `vitest-${testRunId}`)
      .send({
        name: 'Updated Staff User',
        role: ROLES.MANAGER,
        accountAccessMode: ACCOUNT_ACCESS_MODES.ALL,
      })
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      id: userId,
      name: 'Updated Staff User',
      role: ROLES.MANAGER,
      accountAccessMode: ACCOUNT_ACCESS_MODES.ALL,
      accountAccess: [],
    });

    const disableResponse = await request(app)
      .patch(`/api/v1/users/${userId}/disable`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .set('user-agent', `vitest-${testRunId}`)
      .expect(200);

    expect(disableResponse.body.data.status).toBe('disabled');

    const enableResponse = await request(app)
      .patch(`/api/v1/users/${userId}/enable`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .set('user-agent', `vitest-${testRunId}`)
      .expect(200);

    expect(enableResponse.body.data.status).toBe('active');

    const resetResponse = await request(app)
      .patch(`/api/v1/users/${userId}/reset-password`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .set('user-agent', `vitest-${testRunId}`)
      .send({
        password: 'ResetStaffPassword123',
        mustChangePassword: true,
      })
      .expect(200);

    expect(resetResponse.body.data).toMatchObject({
      id: userId,
      mustChangePassword: true,
    });

    const auditLogs = await AuditLog.find({
      organizationId: fixture.organization._id,
      targetUserId: userId,
      eventType: {
        $in: [
          AUDIT_EVENTS.USER_CREATED,
          AUDIT_EVENTS.USER_UPDATED,
          AUDIT_EVENTS.USER_DISABLED,
          AUDIT_EVENTS.USER_ENABLED,
          AUDIT_EVENTS.USER_PASSWORD_RESET,
        ],
      },
    }).exec();

    expect(auditLogs.length).toBeGreaterThanOrEqual(5);
  });

  it('allows a manager to read users but blocks user management', async () => {
    const fixture = await createFixture({
      actorRole: ROLES.MANAGER,
    });

    await createManagedUser({
      organization: fixture.organization,
      suffix: 'manager-read',
    });

    await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        name: 'Blocked User',
        email: `blocked-manager-${testRunId}@example.com`,
        password: 'BlockedPassword123',
        role: ROLES.STAFF,
        accountAccessMode: ACCOUNT_ACCESS_MODES.SELECTED,
        accountAccess: [],
      })
      .expect(403);
  });

  it('blocks staff from reading or managing users', async () => {
    const fixture = await createFixture({
      actorRole: ROLES.STAFF,
    });

    await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(403);

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        name: 'Blocked Staff User',
        email: `blocked-staff-${testRunId}@example.com`,
        password: 'BlockedPassword123',
        role: ROLES.STAFF,
        accountAccessMode: ACCOUNT_ACCESS_MODES.SELECTED,
        accountAccess: [],
      })
      .expect(403);
  });

  it('blocks creating or assigning super_admin through the API', async () => {
    const fixture = await createFixture({
      actorRole: ROLES.ADMIN,
    });

    const createSuperAdminResponse = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        name: 'Blocked Super Admin',
        email: `blocked-super-admin-${testRunId}@example.com`,
        password: 'BlockedPassword123',
        role: ROLES.SUPER_ADMIN,
        accountAccessMode: ACCOUNT_ACCESS_MODES.ALL,
        accountAccess: [],
      })
      .expect(400);

    expect(createSuperAdminResponse.body.error.code).toBe('VALIDATION_FAILED');

    const managedUser = await createManagedUser({
      organization: fixture.organization,
      suffix: 'super-admin-assign',
    });

    const assignSuperAdminResponse = await request(app)
      .patch(`/api/v1/users/${managedUser._id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        role: ROLES.SUPER_ADMIN,
      })
      .expect(400);

    expect(assignSuperAdminResponse.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('blocks self-management for dangerous user actions', async () => {
    const fixture = await createFixture({
      actorRole: ROLES.ADMIN,
    });

    await request(app)
      .patch(`/api/v1/users/${fixture.actor._id}/disable`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(400);

    await request(app)
      .patch(`/api/v1/users/${fixture.actor._id}/reset-password`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        password: 'AnotherValidPassword123',
        mustChangePassword: true,
      })
      .expect(400);
  });
});
