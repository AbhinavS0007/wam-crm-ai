import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';

import { serializeContact } from '../src/modules/contacts/contact.serializer.js';
import { EncryptionOperationError } from '../src/modules/security/encryption.errors.js';
import {
  createPhase3Base,
  cleanupPhase3TestData,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';
import { Contact } from '../src/modules/contacts/contact.model.js';
import {
  findContactById,
  findContactPrivatePiiForInternalUse,
  setContactEncryptedPii,
} from '../src/modules/contacts/contact.repository.js';

const testRunId = createTestRunId();

describe('Contact encrypted PII repository helpers', () => {
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

  it('stores synthetic contact PII as encrypted fields and decrypts internally', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'contact-encryption',
    });

    const contact = await setContactEncryptedPii({
      contactId: base.contact._id,
      organizationId: base.organization._id,
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
      email: 'CANARY_EMAIL_SHOULD_NOT_LEAK',
      providerJids: ['CANARY_JID_SHOULD_NOT_LEAK'],
    });

    expect(contact.encryptedPhone.algorithm).toBe('aes-256-gcm');
    expect(contact.encryptedEmail.algorithm).toBe('aes-256-gcm');
    expect(contact.encryptedProviderJids.algorithm).toBe('aes-256-gcm');

    const privatePii = await findContactPrivatePiiForInternalUse({
      contactId: base.contact._id,
      organizationId: base.organization._id,
    });

    expect(privatePii.phone).toBe('CANARY_PHONE_SHOULD_NOT_LEAK');
    expect(privatePii.email).toBe('CANARY_EMAIL_SHOULD_NOT_LEAK');
    expect(privatePii.providerJids).toEqual(['CANARY_JID_SHOULD_NOT_LEAK']);
  });

  it('does not expose encrypted fields through normal queries or serializers', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'contact-serializer',
    });

    await setContactEncryptedPii({
      contactId: base.contact._id,
      organizationId: base.organization._id,
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
      email: 'CANARY_EMAIL_SHOULD_NOT_LEAK',
      providerJids: ['CANARY_JID_SHOULD_NOT_LEAK'],
    });

    const normalContact = await findContactById({
      contactId: base.contact._id,
      organizationId: base.organization._id,
    });

    expect(normalContact.encryptedPhone).toBeUndefined();
    expect(normalContact.encryptedEmail).toBeUndefined();
    expect(normalContact.encryptedProviderJids).toBeUndefined();

    const serialized = serializeContact(normalContact);

    expect(serialized).not.toHaveProperty('encryptedPhone');
    expect(serialized).not.toHaveProperty('encryptedEmail');
    expect(serialized).not.toHaveProperty('encryptedProviderJids');
    expect(JSON.stringify(serialized)).not.toContain('CANARY_PHONE_SHOULD_NOT_LEAK');
  });

  it('keeps plaintext canary values out of the raw MongoDB document', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'contact-raw',
    });

    await setContactEncryptedPii({
      contactId: base.contact._id,
      organizationId: base.organization._id,
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
      email: 'CANARY_EMAIL_SHOULD_NOT_LEAK',
      providerJids: ['CANARY_JID_SHOULD_NOT_LEAK'],
    });

    const rawContact = await Contact.collection.findOne({
      _id: base.contact._id,
    });

    const rawJson = JSON.stringify(rawContact);

    expect(rawJson).not.toContain('CANARY_PHONE_SHOULD_NOT_LEAK');
    expect(rawJson).not.toContain('CANARY_EMAIL_SHOULD_NOT_LEAK');
    expect(rawJson).not.toContain('CANARY_JID_SHOULD_NOT_LEAK');
    expect(rawContact.encryptedPhone.algorithm).toBe('aes-256-gcm');
    expect(rawContact.encryptedProviderJids.ciphertext).toEqual(expect.any(String));
  });

  it('fails closed if encrypted contact PII is decrypted with the wrong key', async () => {
    const base = await createPhase3Base({
      testRunId,
      suffix: 'contact-wrong-key',
    });

    await setContactEncryptedPii({
      contactId: base.contact._id,
      organizationId: base.organization._id,
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
    });

    const originalKey = process.env.ENCRYPTION_KEY_V1;
    process.env.ENCRYPTION_KEY_V1 = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=';

    try {
      await expect(
        findContactPrivatePiiForInternalUse({
          contactId: base.contact._id,
          organizationId: base.organization._id,
        }),
      ).rejects.toThrow(EncryptionOperationError);
    } finally {
      process.env.ENCRYPTION_KEY_V1 = originalKey;
    }
  });
});
