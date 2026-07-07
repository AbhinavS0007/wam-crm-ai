import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { ACCOUNT_STATUSES } from '../src/constants/account-statuses.js';
import { ROLES } from '../src/constants/roles.js';
import { Organization } from '../src/modules/organizations/organization.model.js';
import {
  encryptAccountJidForStorage,
  encryptAccountPhoneForStorage,
} from '../src/modules/privacy/protected-pii.service.js';
import { createOrganization } from '../src/modules/organizations/organization.repository.js';
import { createUser } from '../src/modules/users/user.repository.js';
import { User } from '../src/modules/users/user.model.js';
import { WhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.model.js';
import {
  createAccountRecord,
  findAccountById,
  findAccountsByOrganization,
  softRemoveAccount,
  updateAccountStatus,
} from '../src/modules/whatsapp-accounts/whatsapp-account.repository.js';
import { serializeWhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.serializer.js';

const testRunId = randomUUID().replaceAll('-', '');

const CANARY_PHONE = 'CANARY_PHONE_SHOULD_NOT_LEAK';
const CANARY_JID = 'CANARY_JID_SHOULD_NOT_LEAK';

const makeOrganization = (suffix) =>
  createOrganization({
    name: `Phase 3.2 ${suffix}`,
    slug: `phase-32-${suffix}-${testRunId}`,
  });

const makeUser = (organizationId, suffix) =>
  createUser({
    organizationId,
    name: `Phase 3.2 User ${suffix}`,
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

describe('Phase 3.2 WhatsAppAccount model and repository', () => {
  beforeAll(async () => {
    await connectDatabase();

    await Promise.all([Organization.init(), User.init(), WhatsAppAccount.init()]);
  });

  afterAll(async () => {
    try {
      await WhatsAppAccount.deleteMany({
        brandKey: new RegExp(testRunId),
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

  it('creates an internal account record and keeps encrypted fields private by default', async () => {
    const organization = await makeOrganization('account-create');
    const user = await makeUser(organization._id, 'account-owner');

    const account = await createAccountRecord({
      organizationId: organization._id,
      name: 'Main Sales Account',
      description: 'Internal account record only',
      brandKey: `main-sales-${testRunId}`,
      encryptedPhone: encryptAccountPhoneForStorage(CANARY_PHONE),
      encryptedJid: encryptAccountJidForStorage(CANARY_JID),
      ownerUserId: user._id,
      createdBy: user._id,
      updatedBy: user._id,
      settings: {
        outboundIntervalMs: 5000,
        aiEnabled: false,
      },
    });

    expect(account.status).toBe(ACCOUNT_STATUSES.PENDING);
    expect(account.name).toBe('Main Sales Account');
    expect(account.brandKey).toBe(`main-sales-${testRunId}`);

    const foundWithoutEncryptedFields = await findAccountById({
      accountId: account._id,
      organizationId: organization._id,
    });

    expect(foundWithoutEncryptedFields.encryptedPhone).toBeUndefined();
    expect(foundWithoutEncryptedFields.encryptedJid).toBeUndefined();

    const foundWithEncryptedFields = await findAccountById({
      accountId: account._id,
      organizationId: organization._id,
      includeEncrypted: true,
    });

    expect(foundWithEncryptedFields.encryptedPhone.algorithm).toBe('aes-256-gcm');
    expect(foundWithEncryptedFields.encryptedJid.algorithm).toBe('aes-256-gcm');

    const encryptedFieldsText = JSON.stringify(foundWithEncryptedFields);
    expect(encryptedFieldsText).not.toContain(CANARY_PHONE);
    expect(encryptedFieldsText).not.toContain(CANARY_JID);

    const serialized = serializeWhatsAppAccount(foundWithEncryptedFields);
    const serializedText = JSON.stringify(serialized);

    expect(serialized).toMatchObject({
      id: account._id.toString(),
      organizationId: organization._id.toString(),
      name: 'Main Sales Account',
      description: 'Internal account record only',
      brandKey: `main-sales-${testRunId}`,
      status: ACCOUNT_STATUSES.PENDING,
      ownerUserId: user._id.toString(),
      settings: {
        outboundIntervalMs: 5000,
        aiEnabled: false,
      },
      createdBy: user._id.toString(),
      updatedBy: user._id.toString(),
    });

    expect(serialized).not.toHaveProperty('encryptedPhone');
    expect(serialized).not.toHaveProperty('encryptedJid');
    expect(serializedText).not.toContain(CANARY_PHONE);
    expect(serializedText).not.toContain(CANARY_JID);
  });

  it('lists organization accounts and filters by status', async () => {
    const organization = await makeOrganization('account-list');
    const otherOrganization = await makeOrganization('account-list-other');

    await createAccountRecord({
      organizationId: organization._id,
      name: 'Open Account',
      brandKey: `open-account-${testRunId}`,
      status: ACCOUNT_STATUSES.ACTIVE,
    });

    await createAccountRecord({
      organizationId: organization._id,
      name: 'Paused Account',
      brandKey: `paused-account-${testRunId}`,
      status: ACCOUNT_STATUSES.PAUSED,
    });

    await createAccountRecord({
      organizationId: otherOrganization._id,
      name: 'Other Account',
      brandKey: `other-account-${testRunId}`,
      status: ACCOUNT_STATUSES.ACTIVE,
    });

    const activeAccounts = await findAccountsByOrganization({
      organizationId: organization._id,
      status: ACCOUNT_STATUSES.ACTIVE,
    });

    expect(activeAccounts).toHaveLength(1);
    expect(activeAccounts[0].name).toBe('Open Account');

    const allOrganizationAccounts = await findAccountsByOrganization({
      organizationId: organization._id,
    });

    expect(allOrganizationAccounts).toHaveLength(2);
  });

  it('updates account status and soft-removes account records', async () => {
    const organization = await makeOrganization('account-status');
    const user = await makeUser(organization._id, 'account-status-user');
    const connectedAt = new Date('2026-07-06T10:00:00.000Z');
    const disconnectedAt = new Date('2026-07-06T10:30:00.000Z');
    const removedAt = new Date('2026-07-06T11:00:00.000Z');

    const account = await createAccountRecord({
      organizationId: organization._id,
      name: 'Status Account',
      brandKey: `status-account-${testRunId}`,
      createdBy: user._id,
    });

    const activeAccount = await updateAccountStatus({
      accountId: account._id,
      organizationId: organization._id,
      status: ACCOUNT_STATUSES.ACTIVE,
      actorId: user._id,
      now: connectedAt,
    });

    expect(activeAccount.status).toBe(ACCOUNT_STATUSES.ACTIVE);
    expect(activeAccount.lastConnectedAt.toISOString()).toBe(connectedAt.toISOString());
    expect(activeAccount.lastDisconnectedAt).toBeNull();
    expect(activeAccount.updatedBy.toString()).toBe(user._id.toString());

    const disconnectedAccount = await updateAccountStatus({
      accountId: account._id,
      organizationId: organization._id,
      status: ACCOUNT_STATUSES.DISCONNECTED,
      disconnectCode: 'manual_test_disconnect',
      disconnectReason: 'Disconnected during repository test',
      actorId: user._id,
      now: disconnectedAt,
    });

    expect(disconnectedAccount.status).toBe(ACCOUNT_STATUSES.DISCONNECTED);
    expect(disconnectedAccount.lastDisconnectedAt.toISOString()).toBe(disconnectedAt.toISOString());
    expect(disconnectedAccount.disconnectCode).toBe('manual_test_disconnect');
    expect(disconnectedAccount.disconnectReason).toBe('Disconnected during repository test');

    const removedAccount = await softRemoveAccount({
      accountId: account._id,
      organizationId: organization._id,
      actorId: user._id,
      now: removedAt,
    });

    expect(removedAccount.status).toBe(ACCOUNT_STATUSES.REMOVED);
    expect(removedAccount.removedAt.toISOString()).toBe(removedAt.toISOString());
    expect(removedAccount.lastDisconnectedAt.toISOString()).toBe(removedAt.toISOString());
  });

  it('defines the approved Phase 3.2 indexes', () => {
    expect(
      hasSchemaIndex(WhatsAppAccount, {
        organizationId: 1,
        status: 1,
      }),
    ).toBe(true);

    expect(
      hasSchemaIndex(WhatsAppAccount, {
        organizationId: 1,
        name: 1,
      }),
    ).toBe(true);

    expect(
      hasSchemaIndex(WhatsAppAccount, {
        organizationId: 1,
        brandKey: 1,
      }),
    ).toBe(true);
  });
});
