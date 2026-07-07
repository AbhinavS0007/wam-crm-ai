import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { CONVERSATION_STAGES } from '../src/constants/conversation-stages.js';
import {
  createConversation,
  findConversationByAccountAndContact,
  updateAssignment,
  updateConversationPreview,
  updateStage,
  upsertConversationForContact,
} from '../src/modules/conversations/conversation.repository.js';
import { serializeConversation } from '../src/modules/conversations/conversation.serializer.js';
import {
  cleanupPhase3TestData,
  createPhase3Account,
  createPhase3Base,
  createPhase3Contact,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 3.4 Conversation repository', () => {
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

  it('creates, finds, updates and serializes conversations safely', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'conversation-main' });
    const assignedAt = new Date('2026-07-06T10:00:00.000Z');

    const found = await findConversationByAccountAndContact({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      contactId: base.contact._id,
    });

    expect(found._id.toString()).toBe(base.conversation._id.toString());

    const assigned = await updateAssignment({
      conversationId: base.conversation._id,
      organizationId: base.organization._id,
      assignedTo: base.user._id,
      assignedTeam: 'sales',
      lastHandledBy: base.user._id,
      lastHandledAt: assignedAt,
    });

    expect(assigned.assignedTo.toString()).toBe(base.user._id.toString());
    expect(assigned.assignedTeam).toBe('sales');

    const staged = await updateStage({
      conversationId: base.conversation._id,
      organizationId: base.organization._id,
      stage: CONVERSATION_STAGES.PROPOSAL,
      lastHandledBy: base.user._id,
      lastHandledAt: assignedAt,
    });

    expect(staged.stage).toBe(CONVERSATION_STAGES.PROPOSAL);

    const previewed = await updateConversationPreview({
      conversationId: base.conversation._id,
      organizationId: base.organization._id,
      lastMessageAt: assignedAt,
      lastMessagePreview: 'Safe preview',
      unreadCountIncrement: 2,
    });

    expect(previewed.unreadCount).toBe(2);
    expect(previewed.lastMessagePreview).toBe('Safe preview');

    expect(serializeConversation(previewed)).toMatchObject({
      id: base.conversation._id.toString(),
      organizationId: base.organization._id.toString(),
      whatsappAccountId: base.account._id.toString(),
      contactId: base.contact._id.toString(),
      leadId: base.contact.leadId,
      stage: CONVERSATION_STAGES.PROPOSAL,
    });
  });

  it('prevents duplicate account/contact conversations and supports upsert reuse', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'conversation-duplicate' });

    await expect(
      createConversation({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        contactId: base.contact._id,
        leadId: base.contact.leadId,
        displayName: 'Duplicate',
      }),
    ).rejects.toMatchObject({ code: 11000 });

    const upserted = await upsertConversationForContact({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      contactId: base.contact._id,
      leadId: base.contact.leadId,
      displayName: 'Should not duplicate',
    });

    expect(upserted._id.toString()).toBe(base.conversation._id.toString());

    const secondAccount = await createPhase3Account({
      organizationId: base.organization._id,
      testRunId,
      suffix: 'conversation-second-account',
      ownerUserId: base.user._id,
    });

    const secondContact = await createPhase3Contact({
      organizationId: base.organization._id,
      testRunId,
      suffix: 'conversation-second-contact',
    });

    const createdByUpsert = await upsertConversationForContact({
      organizationId: base.organization._id,
      whatsappAccountId: secondAccount._id,
      contactId: secondContact._id,
      leadId: secondContact.leadId,
      displayName: 'Created by upsert',
    });

    expect(createdByUpsert.displayName).toBe('Created by upsert');
  });
});
