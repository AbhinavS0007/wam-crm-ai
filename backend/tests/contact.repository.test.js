import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { CONTACT_STATUSES } from '../src/constants/contact-statuses.js';
import { Contact } from '../src/modules/contacts/contact.model.js';
import {
  createContact,
  findContactById,
  findContactByLeadId,
  findOrCreateContactByLeadId,
} from '../src/modules/contacts/contact.repository.js';
import { serializeContact } from '../src/modules/contacts/contact.serializer.js';
import { Organization } from '../src/modules/organizations/organization.model.js';
import {
  encryptContactEmailForStorage,
  encryptContactPhoneForStorage,
  encryptContactProviderJidsForStorage,
} from '../src/modules/privacy/protected-pii.service.js';
import { createOrganization } from '../src/modules/organizations/organization.repository.js';

const testRunId = randomUUID().replaceAll('-', '');

const CANARY_PHONE = 'CANARY_PHONE_SHOULD_NOT_LEAK';
const CANARY_EMAIL = 'CANARY_EMAIL_SHOULD_NOT_LEAK';
const CANARY_JID = 'CANARY_JID_SHOULD_NOT_LEAK';

const makeOrganization = (suffix) =>
  createOrganization({
    name: `Phase 3.3 ${suffix}`,
    slug: `phase-33-${suffix}-${testRunId}`,
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

describe('Phase 3.3 Contact model and repository', () => {
  beforeAll(async () => {
    await connectDatabase();

    await Promise.all([Organization.init(), Contact.init()]);
  });

  afterAll(async () => {
    try {
      await Contact.deleteMany({
        displayName: new RegExp(testRunId),
      });

      await Organization.deleteMany({
        slug: new RegExp(testRunId),
      });
    } finally {
      await disconnectDatabase();
    }
  });

  it('creates contacts with opaque lead IDs and keeps encrypted fields private by default', async () => {
    const organization = await makeOrganization('contact-create');

    const contact = await createContact({
      organizationId: organization._id,
      displayName: `Phase 3.3 Contact ${testRunId}`,
      encryptedPhone: encryptContactPhoneForStorage(CANARY_PHONE),
      encryptedEmail: encryptContactEmailForStorage(CANARY_EMAIL),
      encryptedProviderJids: encryptContactProviderJidsForStorage([CANARY_JID]),
      profileName: `Profile ${testRunId}`,
      source: 'manual',
    });

    expect(contact.leadId).toMatch(/^LEAD-\d{8}-[A-Z0-9]{6}$/);
    expect(contact.leadId).not.toContain(CANARY_PHONE);
    expect(contact.leadId).not.toContain(CANARY_JID);
    expect(contact.status).toBe(CONTACT_STATUSES.ACTIVE);

    const foundWithoutEncryptedFields = await findContactById({
      contactId: contact._id,
      organizationId: organization._id,
    });

    expect(foundWithoutEncryptedFields.encryptedPhone).toBeUndefined();
    expect(foundWithoutEncryptedFields.encryptedEmail).toBeUndefined();
    expect(foundWithoutEncryptedFields.encryptedProviderJids).toBeUndefined();

    const foundWithEncryptedFields = await findContactById({
      contactId: contact._id,
      organizationId: organization._id,
      includeEncrypted: true,
    });

    expect(foundWithEncryptedFields.encryptedPhone.algorithm).toBe('aes-256-gcm');
    expect(foundWithEncryptedFields.encryptedEmail.algorithm).toBe('aes-256-gcm');
    expect(foundWithEncryptedFields.encryptedProviderJids.algorithm).toBe('aes-256-gcm');

    const encryptedFieldsText = JSON.stringify(foundWithEncryptedFields);
    expect(encryptedFieldsText).not.toContain(CANARY_PHONE);
    expect(encryptedFieldsText).not.toContain(CANARY_EMAIL);
    expect(encryptedFieldsText).not.toContain(CANARY_JID);

    const serialized = serializeContact(foundWithEncryptedFields);
    const serializedText = JSON.stringify(serialized);

    expect(serialized).toMatchObject({
      id: contact._id.toString(),
      organizationId: organization._id.toString(),
      leadId: contact.leadId,
      displayName: `Phase 3.3 Contact ${testRunId}`,
      profileName: `Profile ${testRunId}`,
      source: 'manual',
      status: CONTACT_STATUSES.ACTIVE,
    });

    expect(serialized).not.toHaveProperty('encryptedPhone');
    expect(serialized).not.toHaveProperty('encryptedEmail');
    expect(serialized).not.toHaveProperty('encryptedProviderJids');
    expect(serializedText).not.toContain(CANARY_PHONE);
    expect(serializedText).not.toContain(CANARY_EMAIL);
    expect(serializedText).not.toContain(CANARY_JID);
  });

  it('enforces unique lead IDs inside an organization but allows the same lead ID in another organization', async () => {
    const organization = await makeOrganization('contact-unique');
    const otherOrganization = await makeOrganization('contact-unique-other');
    const leadId = 'LEAD-20260706-A8F2K9';

    await createContact({
      organizationId: organization._id,
      leadId,
      displayName: `Unique Contact ${testRunId}`,
    });

    await expect(
      createContact({
        organizationId: organization._id,
        leadId,
        displayName: `Duplicate Contact ${testRunId}`,
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });

    await expect(
      createContact({
        organizationId: otherOrganization._id,
        leadId,
        displayName: `Other Org Contact ${testRunId}`,
      }),
    ).resolves.toBeDefined();
  });

  it('finds or creates contacts by lead ID safely', async () => {
    const organization = await makeOrganization('contact-find-or-create');
    const leadId = 'LEAD-20260706-B7G4M2';

    const createdResult = await findOrCreateContactByLeadId({
      organizationId: organization._id,
      leadId,
      contactData: {
        displayName: `Find Or Create Contact ${testRunId}`,
        source: 'manual',
      },
    });

    expect(createdResult.created).toBe(true);
    expect(createdResult.contact.leadId).toBe(leadId);

    const existingResult = await findOrCreateContactByLeadId({
      organizationId: organization._id,
      leadId,
      contactData: {
        displayName: `Should Not Replace ${testRunId}`,
      },
    });

    expect(existingResult.created).toBe(false);
    expect(existingResult.contact._id.toString()).toBe(createdResult.contact._id.toString());
    expect(existingResult.contact.displayName).toBe(`Find Or Create Contact ${testRunId}`);

    const foundByLeadId = await findContactByLeadId({
      organizationId: organization._id,
      leadId,
    });

    expect(foundByLeadId._id.toString()).toBe(createdResult.contact._id.toString());
  });

  it('defines the approved Phase 3.3 indexes', () => {
    expect(
      hasSchemaIndex(
        Contact,
        {
          organizationId: 1,
          leadId: 1,
        },
        {
          unique: true,
        },
      ),
    ).toBe(true);

    expect(
      hasSchemaIndex(Contact, {
        organizationId: 1,
        displayName: 1,
      }),
    ).toBe(true);
  });
});
