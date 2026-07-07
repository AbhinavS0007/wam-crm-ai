import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { EncryptionOperationError } from '../src/modules/security/encryption.errors.js';
import {
  WhatsAppAuthState,
  WHATSAPP_AUTH_STATE_NAMESPACES,
  WHATSAPP_AUTH_STATE_STATUSES,
} from '../src/modules/whatsapp-auth-states/whatsapp-auth-state.model.js';
import {
  deleteAuthStateForAccount,
  encryptAuthStatePayloadForStorage,
  findEncryptedAuthStateForInternalUse,
  listAuthStateKeysForAccount,
  markAuthStateCorrupt,
  upsertEncryptedAuthState,
} from '../src/modules/whatsapp-auth-states/whatsapp-auth-state.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

const CANARY_AUTH_PAYLOAD = Object.freeze({
  creds: {
    token: 'CANARY_AUTH_STATE_SHOULD_NOT_LEAK',
  },
  nested: {
    secret: 'CANARY_SECRET_SHOULD_NOT_LEAK',
  },
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

describe('WhatsAppAuthState encrypted repository', () => {
  beforeAll(async () => {
    await connectDatabase();
    await initializePhase3Models();
  });

  afterAll(async () => {
    try {
      await cleanupPhase3TestData(testRunId);
    } finally {
      await disconnectDatabase();
    }
  });

  it('creates encrypted auth-state payloads and decrypts internally', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-create',
    });

    const authState = await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'default',
      payload: CANARY_AUTH_PAYLOAD,
    });

    expect(authState.encryptedPayload.algorithm).toBe('aes-256-gcm');

    const internalState = await findEncryptedAuthStateForInternalUse({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'default',
    });

    expect(internalState.payload).toEqual(CANARY_AUTH_PAYLOAD);
    expect(internalState.status).toBe(WHATSAPP_AUTH_STATE_STATUSES.ACTIVE);
  });

  it('keeps plaintext auth-state canaries out of raw MongoDB documents', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-raw',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.SESSION,
      keyId: 'session-key',
      payload: CANARY_AUTH_PAYLOAD,
    });

    const rawState = await WhatsAppAuthState.collection.findOne({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.SESSION,
      keyId: 'session-key',
    });

    const rawText = JSON.stringify(rawState);

    expect(rawText).not.toContain('CANARY_AUTH_STATE_SHOULD_NOT_LEAK');
    expect(rawText).not.toContain('CANARY_SECRET_SHOULD_NOT_LEAK');
    expect(rawState.encryptedPayload.algorithm).toBe('aes-256-gcm');
    expect(rawState.encryptedPayload.ciphertext).toEqual(expect.any(String));
  });

  it('upserts the same namespace and keyId instead of creating duplicates', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-upsert',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.KEYS,
      keyId: 'app-key',
      payload: {
        value: 'first',
      },
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.KEYS,
      keyId: 'app-key',
      payload: {
        value: 'second',
      },
    });

    const count = await WhatsAppAuthState.countDocuments({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.KEYS,
      keyId: 'app-key',
    });

    const internalState = await findEncryptedAuthStateForInternalUse({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.KEYS,
      keyId: 'app-key',
    });

    expect(count).toBe(1);
    expect(internalState.payload).toEqual({
      value: 'second',
    });
  });

  it('does not expose encrypted payload through list queries', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-list',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.SENDER_KEY,
      keyId: 'sender-key',
      payload: CANARY_AUTH_PAYLOAD,
    });

    const keys = await listAuthStateKeysForAccount({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
    });

    expect(keys).toHaveLength(1);
    expect(keys[0].namespace).toBe(WHATSAPP_AUTH_STATE_NAMESPACES.SENDER_KEY);
    expect(keys[0].keyId).toBe('sender-key');
    expect(keys[0].encryptedPayload).toBeUndefined();
    expect(JSON.stringify(keys)).not.toContain('CANARY_AUTH_STATE_SHOULD_NOT_LEAK');
  });

  it('fails closed with the wrong key', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-wrong-key',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.APP_STATE_SYNC_KEY,
      keyId: 'sync-key',
      payload: CANARY_AUTH_PAYLOAD,
    });

    const originalKey = process.env.ENCRYPTION_KEY_V1;
    process.env.ENCRYPTION_KEY_V1 = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=';

    try {
      await expect(
        findEncryptedAuthStateForInternalUse({
          organizationId: base.organization._id,
          whatsappAccountId: base.account._id,
          namespace: WHATSAPP_AUTH_STATE_NAMESPACES.APP_STATE_SYNC_KEY,
          keyId: 'sync-key',
        }),
      ).rejects.toThrow(EncryptionOperationError);
    } finally {
      process.env.ENCRYPTION_KEY_V1 = originalKey;
    }
  });

  it('fails closed when encrypted payload is tampered', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-tamper',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'tamper-key',
      payload: CANARY_AUTH_PAYLOAD,
    });

    await WhatsAppAuthState.collection.updateOne(
      {
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
        keyId: 'tamper-key',
      },
      {
        $set: {
          'encryptedPayload.ciphertext': 'AAAA',
        },
      },
    );

    await expect(
      findEncryptedAuthStateForInternalUse({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
        keyId: 'tamper-key',
      }),
    ).rejects.toThrow(EncryptionOperationError);
  });

  it('marks auth-state records corrupt and deletes all auth-state records for an account', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-maintenance',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'maintenance-key',
      payload: CANARY_AUTH_PAYLOAD,
    });

    const corruptState = await markAuthStateCorrupt({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'maintenance-key',
    });

    expect(corruptState.status).toBe(WHATSAPP_AUTH_STATE_STATUSES.CORRUPT);

    const deleteResult = await deleteAuthStateForAccount({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
    });

    expect(deleteResult.deletedCount).toBe(1);

    const keys = await listAuthStateKeysForAccount({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
    });

    expect(keys).toHaveLength(0);
  });

  it('prevents duplicate namespace/keyId records with a unique index', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'auth-state-unique',
    });

    const encryptedPayload = encryptAuthStatePayloadForStorage({
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'unique-key',
      payload: CANARY_AUTH_PAYLOAD,
    });

    await WhatsAppAuthState.create({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'unique-key',
      encryptedPayload,
    });

    await expect(
      WhatsAppAuthState.create({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
        keyId: 'unique-key',
        encryptedPayload,
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  it('defines the approved Phase 4 auth-state indexes', () => {
    expect(
      hasSchemaIndex(
        WhatsAppAuthState,
        {
          organizationId: 1,
          whatsappAccountId: 1,
          namespace: 1,
          keyId: 1,
        },
        {
          unique: true,
        },
      ),
    ).toBe(true);

    expect(
      hasSchemaIndex(WhatsAppAuthState, {
        organizationId: 1,
        whatsappAccountId: 1,
        status: 1,
      }),
    ).toBe(true);
  });
});
