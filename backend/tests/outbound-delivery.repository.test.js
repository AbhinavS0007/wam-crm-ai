import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { MESSAGE_STATUSES } from '../src/constants/message-statuses.js';
import {
  claimNextOutboundMessage,
  createOutboundMessageRecord,
  markOutboundMessageFailed,
  markOutboundMessageSent,
} from '../src/modules/messages/message.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

const queueOutbound = ({ base, suffix }) =>
  createOutboundMessageRecord({
    organizationId: base.organization._id,
    whatsappAccountId: base.account._id,
    conversationId: base.conversation._id,
    contactId: base.contact._id,
    idempotencyKey: `deliver-${suffix}-${testRunId}`,
    body: `Outbound ${suffix}`,
    status: MESSAGE_STATUSES.QUEUED,
  });

describe('Phase 8 outbound delivery repository', () => {
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

  it('claims a queued message atomically and never hands the same row to two claims', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'claim-atomic' });
    await queueOutbound({ base, suffix: 'only' });

    const [first, second] = await Promise.all([
      claimNextOutboundMessage({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
      }),
      claimNextOutboundMessage({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
      }),
    ]);

    const claimed = [first, second].filter(Boolean);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].status).toBe(MESSAGE_STATUSES.SENDING);
    expect(claimed[0].deliveryAttempts).toBe(1);
  });

  it('marks a claimed message sent with the provider id', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'mark-sent' });
    await queueOutbound({ base, suffix: 'sent' });

    const claimed = await claimNextOutboundMessage({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
    });

    const sent = await markOutboundMessageSent({
      messageId: claimed._id,
      organizationId: base.organization._id,
      providerMessageId: 'wamid-sent-1',
    });

    expect(sent.status).toBe(MESSAGE_STATUSES.SENT);
    expect(sent.providerMessageId).toBe('wamid-sent-1');
    expect(sent.sentAt).toBeInstanceOf(Date);
  });

  it('only re-claims a failed message after nextAttemptAt has passed', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'retry-window' });
    await queueOutbound({ base, suffix: 'retry' });

    const claimed = await claimNextOutboundMessage({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
    });

    await markOutboundMessageFailed({
      messageId: claimed._id,
      organizationId: base.organization._id,
      error: 'CONNECTION_CLOSED',
      permanent: false,
      nextAttemptAt: new Date(Date.now() + 60_000),
    });

    const tooEarly = await claimNextOutboundMessage({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      now: new Date(),
    });
    expect(tooEarly).toBeNull();

    const afterWindow = await claimNextOutboundMessage({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      now: new Date(Date.now() + 120_000),
    });
    expect(afterWindow._id.toString()).toBe(claimed._id.toString());
    expect(afterWindow.deliveryAttempts).toBe(2);
  });

  it('does not re-claim a failed message that reached the attempt cap', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'cap' });
    await queueOutbound({ base, suffix: 'cap' });

    const claimed = await claimNextOutboundMessage({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
    });

    await markOutboundMessageFailed({
      messageId: claimed._id,
      organizationId: base.organization._id,
      error: 'boom',
      permanent: false,
      nextAttemptAt: new Date(Date.now() - 1000),
    });

    const reclaim = await claimNextOutboundMessage({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      maxAttempts: 1,
    });

    expect(reclaim).toBeNull();
  });
});
