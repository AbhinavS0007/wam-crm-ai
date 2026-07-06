import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AUDIT_EVENTS } from '../src/constants/audit-events.js';
import { AUDIT_OUTCOMES } from '../src/constants/audit-outcomes.js';
import { PERMISSIONS } from '../src/constants/permissions.js';
import { REFRESH_SESSION_STATUSES } from '../src/constants/refresh-session-statuses.js';
import { ROLES } from '../src/constants/roles.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import { createAuditLog } from '../src/modules/audit/audit.repository.js';
import { serializeAuditLog } from '../src/modules/audit/audit.serializer.js';
import { RefreshSession } from '../src/modules/auth/refresh-session.model.js';
import {
  createRefreshSession,
  findRefreshSessionByTokenHash,
  markRefreshSessionRotated,
} from '../src/modules/auth/refresh-session.repository.js';
import { serializeRefreshSession } from '../src/modules/auth/refresh-session.serializer.js';
import { Organization } from '../src/modules/organizations/organization.model.js';
import { createOrganization } from '../src/modules/organizations/organization.repository.js';
import { serializeOrganization } from '../src/modules/organizations/organization.serializer.js';
import { User } from '../src/modules/users/user.model.js';
import { createUser, findUserByEmailInOrganization } from '../src/modules/users/user.repository.js';
import { serializeUser } from '../src/modules/users/user.serializer.js';

const testRunId = randomUUID().replaceAll('-', '');

const makeOrganization = (suffix) =>
  createOrganization({
    name: `Phase 2.3 ${suffix}`,
    slug: `phase-23-${suffix}-${testRunId}`,
  });

const makeUser = (organizationId, suffix) =>
  createUser({
    organizationId,
    name: `Phase 2.3 User ${suffix}`,
    email: `${suffix}.${testRunId}@example.com`,
    passwordHash: `hashed-password-${suffix}`,
    role: ROLES.STAFF,
  });

const hasSchemaIndex = (model, expectedKeys, expectedOptions = {}) =>
  model.schema.indexes().some(([keys, options]) => {
    const keysMatch = JSON.stringify(keys) === JSON.stringify(expectedKeys);

    if (!keysMatch) {
      return false;
    }

    return Object.entries(expectedOptions).every(
      ([optionName, optionValue]) => options[optionName] === optionValue,
    );
  });

describe('Phase 2.3 models', () => {
  beforeAll(async () => {
    await connectDatabase();

    await Promise.all([Organization.init(), User.init(), RefreshSession.init(), AuditLog.init()]);
  });

  afterAll(async () => {
    try {
      await AuditLog.deleteMany({
        'metadata.testRunId': testRunId,
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
      await disconnectDatabase();
    }
  });

  it('creates and serializes organizations with a unique slug', async () => {
    const organization = await makeOrganization('organization');

    expect(organization.name).toBe('Phase 2.3 organization');
    expect(organization.slug).toBe(`phase-23-organization-${testRunId}`);

    await expect(
      createOrganization({
        name: 'Duplicate Organization',
        slug: organization.slug,
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });

    expect(serializeOrganization(organization)).toMatchObject({
      id: organization._id.toString(),
      name: 'Phase 2.3 organization',
      slug: `phase-23-organization-${testRunId}`,
      status: 'active',
    });
  });

  it('normalizes users and keeps passwordHash out of default queries and serializers', async () => {
    const organization = await makeOrganization('users');
    const otherOrganization = await makeOrganization('users-other');

    const email = ` Admin.${testRunId}@Example.COM `;

    const user = await createUser({
      organizationId: organization._id,
      name: ' Admin User ',
      email,
      passwordHash: 'hashed-password-secret',
      role: ROLES.ADMIN,
      permissionOverrides: {
        allow: [PERMISSIONS.CLIENT_PII_EXPORT],
        deny: [PERMISSIONS.ACCOUNTS_MANAGE],
      },
      mustChangePassword: false,
    });

    expect(user.name).toBe('Admin User');
    expect(user.email).toBe(`admin.${testRunId}@example.com`);

    const foundWithoutHash = await findUserByEmailInOrganization({
      organizationId: organization._id,
      email,
    });

    expect(foundWithoutHash.passwordHash).toBeUndefined();

    const foundWithHash = await findUserByEmailInOrganization({
      organizationId: organization._id,
      email,
      includePasswordHash: true,
    });

    expect(foundWithHash.passwordHash).toBe('hashed-password-secret');

    await expect(
      createUser({
        organizationId: organization._id,
        name: 'Duplicate User',
        email,
        passwordHash: 'another-hash',
        role: ROLES.STAFF,
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });

    await expect(
      createUser({
        organizationId: otherOrganization._id,
        name: 'Same Email Other Organization',
        email,
        passwordHash: 'another-hash',
        role: ROLES.STAFF,
      }),
    ).resolves.toBeDefined();

    const serialized = serializeUser(foundWithHash);

    expect(serialized).toMatchObject({
      id: user._id.toString(),
      organizationId: organization._id.toString(),
      name: 'Admin User',
      email: `admin.${testRunId}@example.com`,
      role: ROLES.ADMIN,
      status: 'active',
      mustChangePassword: false,
    });

    expect(serialized).not.toHaveProperty('passwordHash');
  });

  it('stores refresh sessions while keeping tokenHash out of default queries and serializers', async () => {
    const organization = await makeOrganization('refresh-sessions');
    const user = await makeUser(organization._id, 'refresh-user');
    const familyId = new mongoose.Types.ObjectId();
    const tokenHash = `token-hash-${testRunId}`;

    const session = await createRefreshSession({
      organizationId: organization._id,
      userId: user._id,
      familyId,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdByIp: '127.0.0.1',
      userAgent: `vitest-${testRunId}`,
    });

    const foundWithoutHash = await findRefreshSessionByTokenHash({
      tokenHash,
    });

    expect(foundWithoutHash.tokenHash).toBeUndefined();

    const foundWithHash = await findRefreshSessionByTokenHash({
      tokenHash,
      includeTokenHash: true,
    });

    expect(foundWithHash.tokenHash).toBe(tokenHash);

    const replacementSessionId = new mongoose.Types.ObjectId();

    const rotatedSession = await markRefreshSessionRotated({
      sessionId: session._id,
      replacedBySessionId: replacementSessionId,
    });

    expect(rotatedSession.status).toBe(REFRESH_SESSION_STATUSES.ROTATED);
    expect(rotatedSession.rotatedAt).toBeInstanceOf(Date);
    expect(rotatedSession.replacedBySessionId.toString()).toBe(replacementSessionId.toString());

    const serialized = serializeRefreshSession(rotatedSession);

    expect(serialized).toMatchObject({
      id: session._id.toString(),
      organizationId: organization._id.toString(),
      userId: user._id.toString(),
      familyId: familyId.toString(),
      status: REFRESH_SESSION_STATUSES.ROTATED,
      createdByIp: '127.0.0.1',
      userAgent: `vitest-${testRunId}`,
    });

    expect(serialized).not.toHaveProperty('tokenHash');
  });

  it('creates audit logs and blocks sensitive metadata keys', async () => {
    const organization = await makeOrganization('audit');
    const user = await makeUser(organization._id, 'audit-user');

    const auditLog = await createAuditLog({
      organizationId: organization._id,
      eventType: AUDIT_EVENTS.USER_CREATED,
      actorId: user._id,
      targetUserId: user._id,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      reasonCode: 'created_by_admin',
      requestId: `request-${testRunId}`,
      ipAddress: '127.0.0.1',
      userAgent: `vitest-${testRunId}`,
      metadata: {
        testRunId,
        changedFields: ['role'],
      },
    });

    const serialized = serializeAuditLog(auditLog);

    expect(serialized).toMatchObject({
      id: auditLog._id.toString(),
      organizationId: organization._id.toString(),
      eventType: AUDIT_EVENTS.USER_CREATED,
      actorId: user._id.toString(),
      targetUserId: user._id.toString(),
      outcome: AUDIT_OUTCOMES.SUCCESS,
      reasonCode: 'created_by_admin',
      requestId: `request-${testRunId}`,
      ipAddress: '127.0.0.1',
      userAgent: `vitest-${testRunId}`,
      metadata: {
        testRunId,
        changedFields: ['role'],
      },
    });

    await expect(
      createAuditLog({
        organizationId: organization._id,
        eventType: AUDIT_EVENTS.AUTH_LOGIN_FAILED,
        outcome: AUDIT_OUTCOMES.FAILURE,
        userAgent: `vitest-${testRunId}`,
        metadata: {
          testRunId,
          nested: {
            refreshToken: 'must-not-be-stored',
          },
        },
      }),
    ).rejects.toThrow(/blocked sensitive key/i);
  });

  it('defines the approved Phase 2.3 indexes', () => {
    expect(
      hasSchemaIndex(
        Organization,
        {
          slug: 1,
        },
        {
          unique: true,
        },
      ),
    ).toBe(true);

    expect(
      hasSchemaIndex(
        User,
        {
          organizationId: 1,
          email: 1,
        },
        {
          unique: true,
        },
      ),
    ).toBe(true);

    expect(
      hasSchemaIndex(User, {
        organizationId: 1,
        role: 1,
        status: 1,
      }),
    ).toBe(true);

    expect(
      hasSchemaIndex(
        RefreshSession,
        {
          tokenHash: 1,
        },
        {
          unique: true,
        },
      ),
    ).toBe(true);

    expect(
      hasSchemaIndex(RefreshSession, {
        userId: 1,
        status: 1,
        expiresAt: 1,
      }),
    ).toBe(true);

    expect(
      hasSchemaIndex(AuditLog, {
        organizationId: 1,
        eventType: 1,
        createdAt: -1,
      }),
    ).toBe(true);
  });
});
