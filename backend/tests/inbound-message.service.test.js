import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Contact } from '../src/modules/contacts/contact.model.js';
import { Conversation } from '../src/modules/conversations/conversation.model.js';
import { Message } from '../src/modules/messages/message.model.js';
import { decryptContactPhoneFromStorage } from '../src/modules/privacy/protected-pii.service.js';
import { createInboundMessageIngestionService } from '../src/modules/whatsapp/ingestion/inbound-message.service.js';
import {
  cleanupPhase3TestData,
  createPhase3Account,
  createPhase3Organization,
  createPhase3User,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

const buildContext = async (suffix) => {
  const organization = await createPhase3Organization(testRunId, suffix);
  const user = await createPhase3User({
    organizationId: organization._id,
    testRunId,
    suffix,
  });
  const account = await createPhase3Account({
    organizationId: organization._id,
    testRunId,
    suffix,
    ownerUserId: user._id,
  });

  return {
    organizationId: organization._id,
    whatsappAccountId: account._id,
  };
};

const inboundFor = ({ messageId, text = 'Hello there', pushName = 'Riya' }) => ({
  provider: 'baileys',
  normalized: true,
  eventType: 'message.received',
  messageId,
  remoteJid: '919876543210@s.whatsapp.net',
  senderJid: '919876543210@s.whatsapp.net',
  pushName,
  text,
  timestamp: 1_753_363_200,
});

describe('Phase 6 inbound message ingestion service', () => {
  const service = createInboundMessageIngestionService({
    now: () => new Date('2026-07-24T12:00:00.000Z'),
  });

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

  it('creates a contact, conversation and message on first inbound', async () => {
    const context = await buildContext('ingest-first');

    const result = await service.ingestInboundMessage({
      ...context,
      inboundMessage: inboundFor({ messageId: `first-${testRunId}` }),
    });

    expect(result.persisted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.leadId).toMatch(/^LEAD-\d{8}-[A-Z0-9]{6}$/);

    const contact = await Contact.findById(result.contactId).exec();
    expect(contact.source).toBe('whatsapp');
    expect(contact.displayName).toBe('Riya');

    const conversation = await Conversation.findById(result.conversationId).exec();
    expect(conversation.unreadCount).toBe(1);
    expect(conversation.lastMessagePreview).toBe('Hello there');
    expect(conversation.lastMessageAt).toBeInstanceOf(Date);

    const message = await Message.findById(result.messageId).exec();
    expect(message.direction).toBe('in');
    expect(message.body).toBe('Hello there');
    expect(message.providerTimestamp).toBeInstanceOf(Date);
  });

  it('reuses the same contact and conversation for a returning sender', async () => {
    const context = await buildContext('ingest-return');

    const first = await service.ingestInboundMessage({
      ...context,
      inboundMessage: inboundFor({ messageId: `ret-1-${testRunId}`, text: 'First' }),
    });

    const second = await service.ingestInboundMessage({
      ...context,
      inboundMessage: inboundFor({ messageId: `ret-2-${testRunId}`, text: 'Second' }),
    });

    expect(second.persisted).toBe(true);
    expect(second.contactId).toBe(first.contactId);
    expect(second.conversationId).toBe(first.conversationId);

    const contactCount = await Contact.countDocuments({
      organizationId: context.organizationId,
    }).exec();
    const messageCount = await Message.countDocuments({
      conversationId: first.conversationId,
    }).exec();
    const conversation = await Conversation.findById(first.conversationId).exec();

    expect(contactCount).toBe(1);
    expect(messageCount).toBe(2);
    expect(conversation.unreadCount).toBe(2);
    expect(conversation.lastMessagePreview).toBe('Second');
  });

  it('is idempotent for a duplicate provider message id', async () => {
    const context = await buildContext('ingest-idempotent');
    const inbound = inboundFor({ messageId: `dup-${testRunId}`, text: 'Only once' });

    const first = await service.ingestInboundMessage({
      ...context,
      inboundMessage: inbound,
    });
    const duplicate = await service.ingestInboundMessage({
      ...context,
      inboundMessage: inbound,
    });

    expect(first.persisted).toBe(true);
    expect(duplicate.persisted).toBe(false);
    expect(duplicate.duplicate).toBe(true);

    const messageCount = await Message.countDocuments({
      conversationId: first.conversationId,
    }).exec();
    const conversation = await Conversation.findById(first.conversationId).exec();

    expect(messageCount).toBe(1);
    expect(conversation.unreadCount).toBe(1);
  });

  it('ignores non-inbound events without persisting', async () => {
    const context = await buildContext('ingest-ignore');

    const result = await service.ingestInboundMessage({
      ...context,
      inboundMessage: {
        eventType: 'message.status',
        senderJid: '919876543210@s.whatsapp.net',
      },
    });

    expect(result.persisted).toBe(false);
    expect(result.ignored).toBe(true);

    const contactCount = await Contact.countDocuments({
      organizationId: context.organizationId,
    }).exec();
    expect(contactCount).toBe(0);
  });

  it('stores no phone for an unresolved @lid sender but still ingests the message', async () => {
    const context = await buildContext('ingest-lid-unresolved');

    const result = await service.ingestInboundMessage({
      ...context,
      inboundMessage: {
        ...inboundFor({ messageId: `lid-none-${testRunId}` }),
        remoteJid: '177850300768311@lid',
        senderJid: '177850300768311@lid',
      },
    });

    expect(result.persisted).toBe(true);

    const contact = await Contact.findById(result.contactId).select('+encryptedPhone').exec();
    expect(contact.encryptedPhone ?? null).toBeNull();
  });

  it('stores the phone when the provider resolved the @lid to a phone JID', async () => {
    const context = await buildContext('ingest-lid-resolved');

    const result = await service.ingestInboundMessage({
      ...context,
      inboundMessage: {
        ...inboundFor({ messageId: `lid-ok-${testRunId}` }),
        remoteJid: '177850300768312@lid',
        senderJid: '177850300768312@lid',
        // Baileys hands back a device-suffixed phone JID.
        senderPhoneJid: '919876543210:0@s.whatsapp.net',
      },
    });

    expect(result.persisted).toBe(true);

    const contact = await Contact.findById(result.contactId).select('+encryptedPhone').exec();
    expect(contact.encryptedPhone).toBeTruthy();
    expect(decryptContactPhoneFromStorage(contact.encryptedPhone)).toBe('919876543210');
  });

  it('backfills the phone on a later message once the @lid mapping is known', async () => {
    const context = await buildContext('ingest-lid-backfill');
    const lidJid = '177850300768313@lid';

    // First message arrives before the mapping is available.
    const first = await service.ingestInboundMessage({
      ...context,
      inboundMessage: {
        ...inboundFor({ messageId: `lid-bf-1-${testRunId}`, text: 'First' }),
        remoteJid: lidJid,
        senderJid: lidJid,
      },
    });

    const before = await Contact.findById(first.contactId).select('+encryptedPhone').exec();
    expect(before.encryptedPhone ?? null).toBeNull();

    // Second message carries the resolved mapping.
    const second = await service.ingestInboundMessage({
      ...context,
      inboundMessage: {
        ...inboundFor({ messageId: `lid-bf-2-${testRunId}`, text: 'Second' }),
        remoteJid: lidJid,
        senderJid: lidJid,
        senderPhoneJid: '919876500999@s.whatsapp.net',
      },
    });

    // Same contact — resolving the phone must not fork identity.
    expect(second.contactId).toBe(first.contactId);

    const after = await Contact.findById(first.contactId).select('+encryptedPhone').exec();
    expect(decryptContactPhoneFromStorage(after.encryptedPhone)).toBe('919876500999');
  });

  it('never returns raw phone digits or JIDs in its result summary', async () => {
    const context = await buildContext('ingest-safe');

    const result = await service.ingestInboundMessage({
      ...context,
      inboundMessage: inboundFor({ messageId: `safe-${testRunId}` }),
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('919876543210');
    expect(serialized).not.toContain('@s.whatsapp.net');
  });
});
