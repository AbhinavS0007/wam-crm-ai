import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { MESSAGE_STATUSES } from '../src/constants/message-statuses.js';
import {
  createInboundMessage,
  createOutboundMessageRecord,
  findMessageByProviderId,
  findMessagesByConversationCursor,
  updateMessageStatus,
} from '../src/modules/messages/message.repository.js';
import { serializeMessage } from '../src/modules/messages/message.serializer.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 3.5 Message repository', () => {
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

  it('creates inbound messages, prevents duplicate provider messages and serializes safely', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'message-inbound' });
    const providerMessageId = `provider-message-${testRunId}`;
    const receivedAt = new Date('2026-07-06T10:00:00.000Z');

    const message = await createInboundMessage({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      contactId: base.contact._id,
      providerMessageId,
      body: 'Safe inbound body',
      receivedAt,
    });

    await expect(
      createInboundMessage({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        conversationId: base.conversation._id,
        contactId: base.contact._id,
        providerMessageId,
        body: 'Duplicate inbound body',
      }),
    ).rejects.toMatchObject({ code: 11000 });

    const found = await findMessageByProviderId({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      providerMessageId,
    });

    expect(found._id.toString()).toBe(message._id.toString());

    const serialized = serializeMessage(found);
    expect(serialized).toMatchObject({
      id: message._id.toString(),
      providerMessageId,
      body: 'Safe inbound body',
      status: MESSAGE_STATUSES.RECEIVED,
    });
    expect(JSON.stringify(serialized)).not.toContain('rawProviderPayload');
  });

  it('creates outbound records, prevents duplicate idempotency keys and updates status', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'message-outbound' });
    const idempotencyKey = `message-idempotency-${testRunId}`;

    const message = await createOutboundMessageRecord({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      contactId: base.contact._id,
      idempotencyKey,
      body: 'Safe outbound body',
      sentByUserId: base.user._id,
    });

    await expect(
      createOutboundMessageRecord({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        conversationId: base.conversation._id,
        contactId: base.contact._id,
        idempotencyKey,
        body: 'Duplicate outbound body',
      }),
    ).rejects.toMatchObject({ code: 11000 });

    const updated = await updateMessageStatus({
      messageId: message._id,
      organizationId: base.organization._id,
      status: MESSAGE_STATUSES.SENT,
      statusUpdatedAt: new Date('2026-07-06T10:05:00.000Z'),
    });

    expect(updated.status).toBe(MESSAGE_STATUSES.SENT);
  });

  it('supports cursor pagination by conversation', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'message-cursor' });

    const first = await createOutboundMessageRecord({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      contactId: base.contact._id,
      idempotencyKey: `cursor-first-${testRunId}`,
      body: 'First',
      sentAt: new Date('2026-07-06T10:01:00.000Z'),
    });

    const second = await createOutboundMessageRecord({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      contactId: base.contact._id,
      idempotencyKey: `cursor-second-${testRunId}`,
      body: 'Second',
      sentAt: new Date('2026-07-06T10:02:00.000Z'),
    });

    const third = await createOutboundMessageRecord({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      contactId: base.contact._id,
      idempotencyKey: `cursor-third-${testRunId}`,
      body: 'Third',
      sentAt: new Date('2026-07-06T10:03:00.000Z'),
    });

    const firstPage = await findMessagesByConversationCursor({
      organizationId: base.organization._id,
      conversationId: base.conversation._id,
      limit: 2,
    });

    expect(firstPage.map((message) => message.body)).toEqual(['Third', 'Second']);

    const secondPage = await findMessagesByConversationCursor({
      organizationId: base.organization._id,
      conversationId: base.conversation._id,
      beforeSentAt: second.sentAt,
      beforeId: second._id,
      limit: 2,
    });

    expect(secondPage.map((message) => message._id.toString())).toEqual([first._id.toString()]);
    expect(firstPage[0]._id.toString()).toBe(third._id.toString());
  });
});
