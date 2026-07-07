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

const phase3Models = [
  WhatsAppAccount,
  Contact,
  Conversation,
  Message,
  Tag,
  Note,
  FollowUpTask,
  ActivityLog,
  IdempotencyRecord,
];

describe('Phase 3 models', () => {
  it('requires organizationId on every Phase 3 business model', () => {
    for (const model of phase3Models) {
      expect(model.schema.path('organizationId')?.isRequired).toBe(true);
    }
  });

  it('keeps messages separate from conversations', () => {
    expect(Conversation.schema.path('messages')).toBeUndefined();
    expect(Message.schema.path('conversationId')?.isRequired).toBe(true);
  });

  it('keeps encrypted/private fields select:false where defined', () => {
    expect(WhatsAppAccount.schema.path('encryptedPhone')?.options.select).toBe(false);
    expect(WhatsAppAccount.schema.path('encryptedJid')?.options.select).toBe(false);
    expect(Contact.schema.path('encryptedPhone')?.options.select).toBe(false);
    expect(Contact.schema.path('encryptedEmail')?.options.select).toBe(false);
    expect(Contact.schema.path('encryptedProviderJids')?.options.select).toBe(false);
  });
});
