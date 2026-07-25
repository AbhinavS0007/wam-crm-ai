import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  findContactByProviderKey,
  findContactPrivatePiiForInternalUse,
  findOrCreateContactByProviderKey,
} from '../src/modules/contacts/contact.repository.js';
import { computeContactProviderKey } from '../src/modules/privacy/protected-pii.service.js';
import {
  cleanupPhase3TestData,
  createPhase3Organization,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 6 contact provider-key repository', () => {
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

  it('creates a contact on first sight and reuses it for the same provider key', async () => {
    const organization = await createPhase3Organization(testRunId, 'provider-key-reuse');
    const jid = '919876500001@s.whatsapp.net';
    const providerContactKey = computeContactProviderKey(jid);

    const first = await findOrCreateContactByProviderKey({
      organizationId: organization._id,
      providerContactKey,
      displayName: 'First Sight',
      profileName: 'First Sight',
      phone: '919876500001',
      providerJids: [jid],
    });

    expect(first.created).toBe(true);
    expect(first.contact.leadId).toMatch(/^LEAD-\d{8}-[A-Z0-9]{6}$/);
    expect(first.contact.source).toBe('whatsapp');

    const second = await findOrCreateContactByProviderKey({
      organizationId: organization._id,
      providerContactKey,
      displayName: 'Second Sight',
      phone: '919876500001',
      providerJids: [jid],
    });

    expect(second.created).toBe(false);
    expect(second.contact._id.toString()).toBe(first.contact._id.toString());
  });

  it('encrypts phone and provider JIDs, never storing plaintext', async () => {
    const organization = await createPhase3Organization(testRunId, 'provider-key-encryption');
    const jid = '919876500002@s.whatsapp.net';
    const providerContactKey = computeContactProviderKey(jid);

    const { contact } = await findOrCreateContactByProviderKey({
      organizationId: organization._id,
      providerContactKey,
      displayName: 'Encrypted Contact',
      phone: '919876500002',
      providerJids: [jid],
    });

    const stored = await findContactByProviderKey({
      organizationId: organization._id,
      providerContactKey,
    });

    const serializedStored = JSON.stringify(stored.toObject());
    expect(serializedStored).not.toContain('919876500002');

    const privatePii = await findContactPrivatePiiForInternalUse({
      contactId: contact._id,
      organizationId: organization._id,
    });

    expect(privatePii.phone).toBe('919876500002');
    expect(privatePii.providerJids).toEqual([jid]);
  });

  it('enforces one contact per provider key within an organization', async () => {
    const organization = await createPhase3Organization(testRunId, 'provider-key-unique');
    const providerContactKey = computeContactProviderKey('919876500003@s.whatsapp.net');

    await findOrCreateContactByProviderKey({
      organizationId: organization._id,
      providerContactKey,
      displayName: 'Race A',
    });

    const race = await findOrCreateContactByProviderKey({
      organizationId: organization._id,
      providerContactKey,
      displayName: 'Race B',
    });

    expect(race.created).toBe(false);
  });
});
