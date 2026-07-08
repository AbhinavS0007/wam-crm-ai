import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { EncryptionOperationError } from '../src/modules/security/encryption.errors.js';
import { createEncryptedBaileysAuthState } from '../src/modules/whatsapp/auth-state/baileys-auth-state.adapter.js';
import { toBaileysKeyStorageKey } from '../src/modules/whatsapp/auth-state/baileys-auth-state.mapper.js';
import { WhatsAppAuthState } from '../src/modules/whatsapp-auth-states/whatsapp-auth-state.model.js';
import {
  findEncryptedAuthStateForInternalUse,
  upsertEncryptedAuthState,
} from '../src/modules/whatsapp-auth-states/whatsapp-auth-state.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

const CANARY_AUTH_SECRET = 'CANARY_PHASE5_AUTH_STATE_SHOULD_NOT_LEAK';

const createSyntheticCreds = () => ({
  noiseKey: Buffer.from(`${CANARY_AUTH_SECRET}:noise-key`),
  signedIdentityKey: {
    public: Buffer.from('synthetic-public-key'),
    private: Buffer.from('synthetic-private-key'),
  },
  registrationId: 12345,
});

describe('Encrypted Baileys auth-state adapter', () => {
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

  it('creates initial creds through initAuthCreds and saves them encrypted', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'baileys-auth-creds',
    });

    const { state, saveCreds } = await createEncryptedBaileysAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      initAuthCreds: createSyntheticCreds,
    });

    expect(state.creds.registrationId).toBe(12345);

    await saveCreds();

    const rawAuthState = await WhatsAppAuthState.collection.findOne({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: 'creds',
      keyId: 'default',
    });

    expect(rawAuthState.encryptedPayload.algorithm).toBe('aes-256-gcm');
    expect(JSON.stringify(rawAuthState)).not.toContain(CANARY_AUTH_SECRET);

    const restored = await createEncryptedBaileysAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      initAuthCreds: () => {
        throw new Error('initAuthCreds should not be called when creds exist.');
      },
    });

    expect(Buffer.isBuffer(restored.state.creds.noiseKey)).toBe(true);
    expect(restored.state.creds.noiseKey.toString('utf8')).toBe(`${CANARY_AUTH_SECRET}:noise-key`);
  });

  it('stores, reads, updates and deletes Baileys key records through encrypted storage', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'baileys-auth-keys',
    });

    const { state } = await createEncryptedBaileysAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      initAuthCreds: createSyntheticCreds,
    });

    await state.keys.set({
      session: {
        'jid-1': {
          session: Buffer.from(`${CANARY_AUTH_SECRET}:session-one`),
          updatedAt: new Date('2026-07-07T11:00:00.000Z'),
        },
      },
    });

    const firstRead = await state.keys.get('session', ['jid-1', 'missing-jid']);

    expect(Object.keys(firstRead)).toEqual(['jid-1']);
    expect(firstRead['jid-1'].session.toString('utf8')).toBe(`${CANARY_AUTH_SECRET}:session-one`);
    expect(firstRead['jid-1'].updatedAt.toISOString()).toBe('2026-07-07T11:00:00.000Z');

    await state.keys.set({
      session: {
        'jid-1': {
          session: Buffer.from('updated-session'),
        },
      },
    });

    const updatedRead = await state.keys.get('session', ['jid-1']);
    expect(updatedRead['jid-1'].session.toString('utf8')).toBe('updated-session');

    await state.keys.set({
      session: {
        'jid-1': null,
      },
    });

    const deletedRead = await state.keys.get('session', ['jid-1']);
    expect(deletedRead).toEqual({});
  });

  it('keeps key plaintext canaries out of raw MongoDB auth-state documents', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'baileys-auth-raw',
    });

    const { state } = await createEncryptedBaileysAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      initAuthCreds: createSyntheticCreds,
    });

    await state.keys.set({
      'app-state-sync-key': {
        syncKey: {
          keyData: Buffer.from(CANARY_AUTH_SECRET),
        },
      },
    });

    const { namespace, keyId } = toBaileysKeyStorageKey({
      type: 'app-state-sync-key',
      id: 'syncKey',
    });

    const rawAuthState = await WhatsAppAuthState.collection.findOne({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace,
      keyId,
    });

    expect(JSON.stringify(rawAuthState)).not.toContain(CANARY_AUTH_SECRET);
    expect(rawAuthState.encryptedPayload.algorithm).toBe('aes-256-gcm');

    const internalState = await findEncryptedAuthStateForInternalUse({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace,
      keyId,
    });

    expect(internalState.payload.keyData.__type).toBe('wam-crm-ai:buffer:v1');
  });

  it('marks corrupted auth-state records corrupt and fails closed on adapter read', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'baileys-auth-corrupt',
    });

    const { namespace, keyId } = toBaileysKeyStorageKey({
      type: 'session',
      id: 'tampered-jid',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace,
      keyId,
      payload: {
        secret: CANARY_AUTH_SECRET,
      },
    });

    await WhatsAppAuthState.collection.updateOne(
      {
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        namespace,
        keyId,
      },
      {
        $set: {
          'encryptedPayload.ciphertext': 'AAAA',
        },
      },
    );

    const { state } = await createEncryptedBaileysAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      initAuthCreds: createSyntheticCreds,
    });

    await expect(state.keys.get('session', ['tampered-jid'])).rejects.toThrow(
      EncryptionOperationError,
    );

    const corruptRecord = await WhatsAppAuthState.findOne({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace,
      keyId,
    }).exec();

    expect(corruptRecord.status).toBe('corrupt');
  });
});
