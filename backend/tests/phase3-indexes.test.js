import { describe, expect, it } from 'vitest';

import { ActivityLog } from '../src/modules/activity/activity-log.model.js';
import { Contact } from '../src/modules/contacts/contact.model.js';
import { Conversation } from '../src/modules/conversations/conversation.model.js';
import { FollowUpTask } from '../src/modules/followups/followup-task.model.js';
import { IdempotencyRecord } from '../src/modules/idempotency/idempotency-record.model.js';
import { Message } from '../src/modules/messages/message.model.js';
import { Note } from '../src/modules/notes/note.model.js';
import { Tag } from '../src/modules/tags/tag.model.js';
import { WhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.model.js';

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

describe('Phase 3 indexes', () => {
  it('defines account, contact, conversation and message indexes', () => {
    expect(hasSchemaIndex(WhatsAppAccount, { organizationId: 1, status: 1 })).toBe(true);
    expect(hasSchemaIndex(Contact, { organizationId: 1, leadId: 1 }, { unique: true })).toBe(true);

    expect(
      hasSchemaIndex(
        Conversation,
        { organizationId: 1, whatsappAccountId: 1, contactId: 1 },
        { unique: true },
      ),
    ).toBe(true);

    expect(
      hasSchemaIndex(
        Message,
        { organizationId: 1, whatsappAccountId: 1, providerMessageId: 1 },
        { unique: true },
      ),
    ).toBe(true);

    expect(
      hasSchemaIndex(
        Message,
        { organizationId: 1, whatsappAccountId: 1, idempotencyKey: 1 },
        { unique: true },
      ),
    ).toBe(true);
  });

  it('defines CRM timeline and idempotency indexes', () => {
    expect(
      hasSchemaIndex(Tag, { organizationId: 1, whatsappAccountId: 1, slug: 1 }, { unique: true }),
    ).toBe(true);
    expect(hasSchemaIndex(Note, { organizationId: 1, conversationId: 1, createdAt: -1 })).toBe(
      true,
    );
    expect(
      hasSchemaIndex(FollowUpTask, {
        organizationId: 1,
        assignedTo: 1,
        status: 1,
        dueAt: 1,
      }),
    ).toBe(true);
    expect(
      hasSchemaIndex(ActivityLog, { organizationId: 1, conversationId: 1, createdAt: -1 }),
    ).toBe(true);
    expect(
      hasSchemaIndex(IdempotencyRecord, { organizationId: 1, scope: 1, key: 1 }, { unique: true }),
    ).toBe(true);
    expect(hasSchemaIndex(IdempotencyRecord, { expiresAt: 1 }, { expireAfterSeconds: 0 })).toBe(
      true,
    );
  });
});
