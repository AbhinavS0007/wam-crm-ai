import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { setContactEncryptedPii } from '../src/modules/contacts/contact.repository.js';
import { setAccountEncryptedIdentifiers } from '../src/modules/whatsapp-accounts/whatsapp-account.repository.js';
import { WhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.model.js';
import {
  WHATSAPP_AUTH_STATE_NAMESPACES,
  WhatsAppAuthState,
} from '../src/modules/whatsapp-auth-states/whatsapp-auth-state.model.js';
import { upsertEncryptedAuthState } from '../src/modules/whatsapp-auth-states/whatsapp-auth-state.repository.js';
import { runKeyRotationDryRun } from '../src/scripts/key-rotation-dry-run.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

const TEST_KEY_V2 = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=';

const createLoggerCapture = () => {
  const messages = [];

  return {
    messages,
    logger: {
      log: (message) => {
        messages.push(String(message));
      },
      error: (message) => {
        messages.push(String(message));
      },
    },
  };
};

describe('Phase 4 key rotation dry-run', () => {
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

  it('inspects encrypted records, performs no writes, and prints no plaintext', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'rotation-current',
    });

    await setAccountEncryptedIdentifiers({
      accountId: base.account._id,
      organizationId: base.organization._id,
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
      jid: 'CANARY_JID_SHOULD_NOT_LEAK',
    });

    await setContactEncryptedPii({
      contactId: base.contact._id,
      organizationId: base.organization._id,
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
      email: 'CANARY_EMAIL_SHOULD_NOT_LEAK',
      providerJids: ['CANARY_JID_SHOULD_NOT_LEAK'],
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: 'rotation-current',
      payload: {
        token: 'CANARY_AUTH_STATE_SHOULD_NOT_LEAK',
      },
    });

    const accountBefore = await WhatsAppAccount.collection.findOne({
      _id: base.account._id,
    });

    const { logger, messages } = createLoggerCapture();

    const stats = await runKeyRotationDryRun({
      connect: false,
      logger,
    });

    const accountAfter = await WhatsAppAccount.collection.findOne({
      _id: base.account._id,
    });

    const output = messages.join('\n');

    expect(stats.writesPerformed).toBe(false);
    expect(stats.errors).toBe(0);
    expect(JSON.stringify(accountAfter)).toBe(JSON.stringify(accountBefore));
    expect(output).toContain('No writes were performed.');
    expect(output).not.toContain('CANARY_PHONE_SHOULD_NOT_LEAK');
    expect(output).not.toContain('CANARY_EMAIL_SHOULD_NOT_LEAK');
    expect(output).not.toContain('CANARY_JID_SHOULD_NOT_LEAK');
    expect(output).not.toContain('CANARY_AUTH_STATE_SHOULD_NOT_LEAK');
    expect(output).not.toContain(process.env.ENCRYPTION_KEY_V1);
  });

  it('reports records requiring rotation when current key version changes', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'rotation-needed',
    });

    await setAccountEncryptedIdentifiers({
      accountId: base.account._id,
      organizationId: base.organization._id,
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
    });

    const originalCurrentVersion = process.env.ENCRYPTION_KEY_CURRENT_VERSION;
    const originalV2 = process.env.ENCRYPTION_KEY_V2;

    process.env.ENCRYPTION_KEY_CURRENT_VERSION = '2';
    process.env.ENCRYPTION_KEY_V2 = TEST_KEY_V2;

    try {
      const { logger, messages } = createLoggerCapture();

      const stats = await runKeyRotationDryRun({
        connect: false,
        logger,
      });

      const output = messages.join('\n');

      expect(stats.currentKeyVersion).toBe('2');
      expect(stats.recordsNeedingRotation).toBeGreaterThanOrEqual(1);
      expect(stats.writesPerformed).toBe(false);
      expect(output).toContain('Records needing rotation:');
      expect(output).not.toContain('CANARY_PHONE_SHOULD_NOT_LEAK');
      expect(output).not.toContain(TEST_KEY_V2);
    } finally {
      process.env.ENCRYPTION_KEY_CURRENT_VERSION = originalCurrentVersion;
      if (originalV2 === undefined) {
        delete process.env.ENCRYPTION_KEY_V2;
      } else {
        process.env.ENCRYPTION_KEY_V2 = originalV2;
      }
    }
  });

  it('reports undecryptable records safely without throwing plaintext', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'rotation-corrupt',
    });

    await upsertEncryptedAuthState({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.SESSION,
      keyId: 'corrupt-record',
      payload: {
        token: 'CANARY_AUTH_STATE_SHOULD_NOT_LEAK',
      },
    });

    await WhatsAppAuthState.collection.updateOne(
      {
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        namespace: WHATSAPP_AUTH_STATE_NAMESPACES.SESSION,
        keyId: 'corrupt-record',
      },
      {
        $set: {
          'encryptedPayload.ciphertext': 'AAAA',
        },
      },
    );

    const { logger, messages } = createLoggerCapture();

    const stats = await runKeyRotationDryRun({
      connect: false,
      logger,
    });

    const output = messages.join('\n');

    expect(stats.errors).toBeGreaterThanOrEqual(1);
    expect(stats.writesPerformed).toBe(false);
    expect(output).toContain('Errors:');
    expect(output).not.toContain('CANARY_AUTH_STATE_SHOULD_NOT_LEAK');
    expect(output).not.toContain(process.env.ENCRYPTION_KEY_V1);
  });
});
