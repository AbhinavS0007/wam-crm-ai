import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AUDIT_EVENTS } from '../src/constants/audit-events.js';
import { ROLES } from '../src/constants/roles.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import { seedInitialOrganizationAndSuperAdmin } from '../src/modules/auth/super-admin-seed.service.js';
import { verifyPassword } from '../src/modules/auth/password.service.js';
import { Organization } from '../src/modules/organizations/organization.model.js';
import { createOrganization } from '../src/modules/organizations/organization.repository.js';
import { User } from '../src/modules/users/user.model.js';
import { createUser, findUserByEmailInOrganization } from '../src/modules/users/user.repository.js';

const testRunId = randomUUID().replaceAll('-', '');

const makeSeedInput = (suffix = 'main') => ({
  organizationName: `Seed Organization ${suffix}`,
  organizationSlug: `seed-org-${suffix}-${testRunId}`,
  superAdminName: `Seed Super Admin ${suffix}`,
  superAdminEmail: `seed-${suffix}-${testRunId}@example.com`,
  superAdminPassword: 'ValidSeedPassword123',
  auditMetadata: {
    testRunId,
  },
});

describe('Phase 2.5 super-admin seed', () => {
  beforeAll(async () => {
    await connectDatabase();

    await Promise.all([Organization.init(), User.init(), AuditLog.init()]);
  });

  afterAll(async () => {
    try {
      await AuditLog.deleteMany({
        'metadata.testRunId': testRunId,
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

  it('creates the initial organization and seed-only super-admin safely', async () => {
    const seedInput = makeSeedInput('create');

    const result = await seedInitialOrganizationAndSuperAdmin(seedInput);

    expect(result.organizationCreated).toBe(true);
    expect(result.superAdminCreated).toBe(true);

    expect(result.organization).toMatchObject({
      name: seedInput.organizationName,
      slug: seedInput.organizationSlug,
      status: 'active',
    });

    expect(result.superAdmin).toMatchObject({
      organizationId: result.organization.id,
      name: seedInput.superAdminName,
      email: seedInput.superAdminEmail,
      role: ROLES.SUPER_ADMIN,
      accountAccessMode: 'all',
      status: 'active',
      mustChangePassword: false,
    });

    expect(result.superAdmin).not.toHaveProperty('passwordHash');

    const userWithPasswordHash = await findUserByEmailInOrganization({
      organizationId: result.organization.id,
      email: seedInput.superAdminEmail,
      includePasswordHash: true,
    });

    expect(userWithPasswordHash.passwordHash).not.toBe(seedInput.superAdminPassword);

    await expect(
      verifyPassword({
        password: seedInput.superAdminPassword,
        passwordHash: userWithPasswordHash.passwordHash,
      }),
    ).resolves.toBe(true);

    const auditLog = await AuditLog.findOne({
      organizationId: result.organization.id,
      eventType: AUDIT_EVENTS.USER_CREATED,
      targetUserId: result.superAdmin.id,
      'metadata.testRunId': testRunId,
    }).exec();

    expect(auditLog).toBeTruthy();
    expect(auditLog.metadata).toMatchObject({
      source: 'seed-super-admin',
      testRunId,
    });
  });

  it('is idempotent and does not reset the existing super-admin password', async () => {
    const seedInput = makeSeedInput('idempotent');

    const firstResult = await seedInitialOrganizationAndSuperAdmin(seedInput);

    const firstUserWithHash = await findUserByEmailInOrganization({
      organizationId: firstResult.organization.id,
      email: seedInput.superAdminEmail,
      includePasswordHash: true,
    });

    const secondResult = await seedInitialOrganizationAndSuperAdmin({
      ...seedInput,
      superAdminPassword: 'AnotherValidPassword123',
    });

    const secondUserWithHash = await findUserByEmailInOrganization({
      organizationId: secondResult.organization.id,
      email: seedInput.superAdminEmail,
      includePasswordHash: true,
    });

    expect(secondResult.organizationCreated).toBe(false);
    expect(secondResult.superAdminCreated).toBe(false);
    expect(secondResult.organization.id).toBe(firstResult.organization.id);
    expect(secondResult.superAdmin.id).toBe(firstResult.superAdmin.id);
    expect(secondUserWithHash.passwordHash).toBe(firstUserWithHash.passwordHash);

    const userCount = await User.countDocuments({
      organizationId: firstResult.organization.id,
      email: seedInput.superAdminEmail,
    });

    expect(userCount).toBe(1);
  });

  it('fails if the seed email already belongs to a non-super-admin user', async () => {
    const seedInput = makeSeedInput('conflict');

    const organization = await createOrganization({
      name: seedInput.organizationName,
      slug: seedInput.organizationSlug,
    });

    await createUser({
      organizationId: organization._id,
      name: 'Existing Staff User',
      email: seedInput.superAdminEmail,
      passwordHash: 'existing-hash',
      role: ROLES.STAFF,
    });

    await expect(seedInitialOrganizationAndSuperAdmin(seedInput)).rejects.toThrow(
      'SEED_SUPER_ADMIN_EMAIL_ALREADY_USED_BY_NON_SUPER_ADMIN',
    );
  });

  it('rejects invalid seed passwords before creating records', async () => {
    const seedInput = {
      ...makeSeedInput('bad-password'),
      superAdminPassword: 'short',
    };

    await expect(seedInitialOrganizationAndSuperAdmin(seedInput)).rejects.toThrow(
      'PASSWORD_TOO_SHORT',
    );

    const organization = await Organization.findOne({
      slug: seedInput.organizationSlug,
    }).exec();

    expect(organization).toBeNull();
  });
});
