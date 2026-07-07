import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { NOTE_VISIBILITY } from '../src/constants/note-visibility.js';
import {
  encryptContactEmailForStorage,
  encryptContactPhoneForStorage,
  encryptContactProviderJidsForStorage,
  encryptAccountJidForStorage,
  encryptAccountPhoneForStorage,
} from '../src/modules/privacy/protected-pii.service.js';
import { ROLES } from '../src/constants/roles.js';
import { createContact, findContactById } from '../src/modules/contacts/contact.repository.js';
import { serializeContact } from '../src/modules/contacts/contact.serializer.js';
import {
  createNote,
  findNotesForConversationByVisibility,
} from '../src/modules/notes/note.repository.js';
import {
  createAccountRecord,
  findAccountById,
} from '../src/modules/whatsapp-accounts/whatsapp-account.repository.js';
import { serializeWhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.serializer.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createPhase3Conversation,
  createPhase3Organization,
  createPhase3User,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

const CANARY_PHONE = 'CANARY_PHONE_SHOULD_NOT_LEAK';
const CANARY_EMAIL = 'CANARY_EMAIL_SHOULD_NOT_LEAK';
const CANARY_JID = 'CANARY_JID_SHOULD_NOT_LEAK';

describe('Phase 3.9 privacy serializers', () => {
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

  it('does not leak encrypted account or contact fields in staff-safe serializers', async () => {
    const organization = await createPhase3Organization(testRunId, 'privacy');
    const user = await createPhase3User({
      organizationId: organization._id,
      testRunId,
      suffix: 'privacy-user',
      role: ROLES.STAFF,
    });

    const account = await createAccountRecord({
      organizationId: organization._id,
      name: 'Privacy Account',
      brandKey: `privacy-account-${testRunId}`,
      encryptedPhone: encryptAccountPhoneForStorage(CANARY_PHONE),
      encryptedJid: encryptAccountJidForStorage(CANARY_JID),
      ownerUserId: user._id,
    });

    const contact = await createContact({
      organizationId: organization._id,
      displayName: `Privacy Contact ${testRunId}`,
      encryptedPhone: encryptContactPhoneForStorage(CANARY_PHONE),
      encryptedEmail: encryptContactEmailForStorage(CANARY_EMAIL),
      encryptedProviderJids: encryptContactProviderJidsForStorage([CANARY_JID]),
    });

    const accountWithPrivateFields = await findAccountById({
      accountId: account._id,
      organizationId: organization._id,
      includeEncrypted: true,
    });

    const contactWithPrivateFields = await findContactById({
      contactId: contact._id,
      organizationId: organization._id,
      includeEncrypted: true,
    });

    const serializedText = JSON.stringify({
      account: serializeWhatsAppAccount(accountWithPrivateFields),
      contact: serializeContact(contactWithPrivateFields),
    });

    expect(serializedText).not.toContain(CANARY_PHONE);
    expect(serializedText).not.toContain(CANARY_EMAIL);
    expect(serializedText).not.toContain(CANARY_JID);
  });

  it('does not return manager/admin notes for staff', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'privacy-notes' });
    const privateContact = await createContact({
      organizationId: base.organization._id,
      displayName: `Privacy Notes Contact ${testRunId}`,
      encryptedPhone: encryptContactPhoneForStorage(CANARY_PHONE),
      encryptedEmail: encryptContactEmailForStorage(CANARY_EMAIL),
      encryptedProviderJids: encryptContactProviderJidsForStorage([CANARY_JID]),
    });
    const privateConversation = await createPhase3Conversation({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      contact: privateContact,
      testRunId,
      suffix: 'privacy-note-conversation',
    });

    await createNote({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: privateConversation._id,
      body: 'Visible shared note',
      visibility: NOTE_VISIBILITY.SHARED,
      createdBy: base.user._id,
    });

    await createNote({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: privateConversation._id,
      body: `Manager note ${CANARY_PHONE}`,
      visibility: NOTE_VISIBILITY.MANAGER,
      createdBy: base.user._id,
    });

    await createNote({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: privateConversation._id,
      body: `Admin note ${CANARY_JID}`,
      visibility: NOTE_VISIBILITY.ADMIN,
      createdBy: base.user._id,
    });

    const staffNotes = await findNotesForConversationByVisibility({
      organizationId: base.organization._id,
      conversationId: privateConversation._id,
      role: ROLES.STAFF,
    });

    const staffNotesText = JSON.stringify(staffNotes);

    expect(staffNotes).toHaveLength(1);
    expect(staffNotes[0].body).toBe('Visible shared note');
    expect(staffNotesText).not.toContain(CANARY_PHONE);
    expect(staffNotesText).not.toContain(CANARY_EMAIL);
    expect(staffNotesText).not.toContain(CANARY_JID);
  });
});
