import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';

import { serializeWhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.serializer.js';
import { EncryptionOperationError } from '../src/modules/security/encryption.errors.js';
import {
  createPhase3Base,
  cleanupPhase3TestData,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';
import { WhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.model.js';
import {
  findAccountById,
  findAccountPrivateIdentifiersForInternalUse,
  setAccountEncryptedIdentifiers,
} from '../src/modules/whatsapp-accounts/whatsapp-account.repository.js';

const testRunId = createTestRunId();

describe('WhatsAppAccount encrypted identifier repository helpers', () => {
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

  it('stores synthetic account identifiers as encrypted fields and decrypts internally', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'account-encryption',
    });

    const account = await setAccountEncryptedIdentifiers({
      accountId: base.account._id,
      organizationId: base.organization._id,
      phone: 'CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK',
      jid: 'CANARY_ACCOUNT_JID_SHOULD_NOT_LEAK',
    });

    expect(account.encryptedPhone.algorithm).toBe('aes-256-gcm');
    expect(account.encryptedJid.algorithm).toBe('aes-256-gcm');

    const privateIdentifiers = await findAccountPrivateIdentifiersForInternalUse({
      accountId: base.account._id,
      organizationId: base.organization._id,
    });

    expect(privateIdentifiers.phone).toBe('CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK');
    expect(privateIdentifiers.jid).toBe('CANARY_ACCOUNT_JID_SHOULD_NOT_LEAK');
  });

  it('does not expose encrypted fields through normal queries or serializers', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'account-serializer',
    });

    await setAccountEncryptedIdentifiers({
      accountId: base.account._id,
      organizationId: base.organization._id,
      phone: 'CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK',
      jid: 'CANARY_ACCOUNT_JID_SHOULD_NOT_LEAK',
    });

    const normalAccount = await findAccountById({
      accountId: base.account._id,
      organizationId: base.organization._id,
    });

    expect(normalAccount.encryptedPhone).toBeUndefined();
    expect(normalAccount.encryptedJid).toBeUndefined();

    const serialized = serializeWhatsAppAccount(normalAccount);

    expect(serialized).not.toHaveProperty('encryptedPhone');
    expect(serialized).not.toHaveProperty('encryptedJid');
    expect(JSON.stringify(serialized)).not.toContain('CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK');
  });

  it('keeps plaintext canary values out of the raw MongoDB document', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'account-raw',
    });

    await setAccountEncryptedIdentifiers({
      accountId: base.account._id,
      organizationId: base.organization._id,
      phone: 'CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK',
      jid: 'CANARY_ACCOUNT_JID_SHOULD_NOT_LEAK',
    });

    const rawAccount = await WhatsAppAccount.collection.findOne({
      _id: base.account._id,
    });

    const rawJson = JSON.stringify(rawAccount);

    expect(rawJson).not.toContain('CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK');
    expect(rawJson).not.toContain('CANARY_ACCOUNT_JID_SHOULD_NOT_LEAK');
    expect(rawAccount.encryptedPhone.algorithm).toBe('aes-256-gcm');
    expect(rawAccount.encryptedJid.ciphertext).toEqual(expect.any(String));
  });

  it('fails closed if encrypted account identifiers are decrypted with the wrong key', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'account-wrong-key',
    });

    await setAccountEncryptedIdentifiers({
      accountId: base.account._id,
      organizationId: base.organization._id,
      phone: 'CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK',
    });

    const originalKey = process.env.ENCRYPTION_KEY_V1;
    process.env.ENCRYPTION_KEY_V1 = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=';

    try {
      await expect(
        findAccountPrivateIdentifiersForInternalUse({
          accountId: base.account._id,
          organizationId: base.organization._id,
        }),
      ).rejects.toThrow(EncryptionOperationError);
    } finally {
      process.env.ENCRYPTION_KEY_V1 = originalKey;
    }
  });
});
