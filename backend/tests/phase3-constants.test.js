import { describe, expect, it } from 'vitest';

import { ACCOUNT_STATUSES, ACCOUNT_STATUS_VALUES } from '../src/constants/account-statuses.js';
import { ACTIVITY_EVENTS, ACTIVITY_EVENT_VALUES } from '../src/constants/activity-events.js';
import { CONTACT_STATUSES, CONTACT_STATUS_VALUES } from '../src/constants/contact-statuses.js';
import {
  CONVERSATION_STAGES,
  CONVERSATION_STAGE_VALUES,
} from '../src/constants/conversation-stages.js';
import {
  CONVERSATION_STATUSES,
  CONVERSATION_STATUS_VALUES,
} from '../src/constants/conversation-statuses.js';
import {
  FOLLOWUP_PRIORITIES,
  FOLLOWUP_PRIORITY_VALUES,
} from '../src/constants/followup-priorities.js';
import { FOLLOWUP_STATUSES, FOLLOWUP_STATUS_VALUES } from '../src/constants/followup-statuses.js';
import { FOLLOWUP_TYPES, FOLLOWUP_TYPE_VALUES } from '../src/constants/followup-types.js';
import {
  IDEMPOTENCY_STATUSES,
  IDEMPOTENCY_STATUS_VALUES,
} from '../src/constants/idempotency-statuses.js';
import {
  MESSAGE_DIRECTIONS,
  MESSAGE_DIRECTION_VALUES,
} from '../src/constants/message-directions.js';
import { MESSAGE_STATUSES, MESSAGE_STATUS_VALUES } from '../src/constants/message-statuses.js';
import { MESSAGE_TYPES, MESSAGE_TYPE_VALUES } from '../src/constants/message-types.js';
import { NOTE_VISIBILITY, NOTE_VISIBILITY_VALUES } from '../src/constants/note-visibility.js';
import { TAG_STATUSES, TAG_STATUS_VALUES } from '../src/constants/tag-statuses.js';

const expectFrozenConstants = ({ constants, values, expectedValues }) => {
  expect(Object.isFrozen(constants)).toBe(true);
  expect(Object.isFrozen(values)).toBe(true);
  expect(values).toEqual(expectedValues);
  expect(Object.values(constants)).toEqual(expectedValues);
};

describe('Phase 3.1 domain constants', () => {
  it('defines WhatsApp account statuses', () => {
    expectFrozenConstants({
      constants: ACCOUNT_STATUSES,
      values: ACCOUNT_STATUS_VALUES,
      expectedValues: [
        'pending',
        'connecting',
        'active',
        'reconnecting',
        'disconnected',
        'paused',
        'removed',
        'blocked',
      ],
    });
  });

  it('defines contact statuses', () => {
    expectFrozenConstants({
      constants: CONTACT_STATUSES,
      values: CONTACT_STATUS_VALUES,
      expectedValues: ['active', 'archived', 'deleted'],
    });
  });

  it('defines conversation statuses and stages', () => {
    expectFrozenConstants({
      constants: CONVERSATION_STATUSES,
      values: CONVERSATION_STATUS_VALUES,
      expectedValues: ['open', 'closed', 'archived', 'deleted'],
    });

    expectFrozenConstants({
      constants: CONVERSATION_STAGES,
      values: CONVERSATION_STAGE_VALUES,
      expectedValues: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'closed'],
    });
  });

  it('defines message directions, types and statuses', () => {
    expectFrozenConstants({
      constants: MESSAGE_DIRECTIONS,
      values: MESSAGE_DIRECTION_VALUES,
      expectedValues: ['in', 'out', 'system'],
    });

    expectFrozenConstants({
      constants: MESSAGE_TYPES,
      values: MESSAGE_TYPE_VALUES,
      expectedValues: [
        'text',
        'image',
        'document',
        'audio',
        'video',
        'contact',
        'sticker',
        'location',
        'unsupported',
      ],
    });

    expectFrozenConstants({
      constants: MESSAGE_STATUSES,
      values: MESSAGE_STATUS_VALUES,
      expectedValues: [
        'received',
        'created',
        'queued',
        'sending',
        'sent',
        'delivered',
        'read',
        'failed',
        'failed_permanent',
      ],
    });
  });

  it('defines tag and note constants', () => {
    expectFrozenConstants({
      constants: TAG_STATUSES,
      values: TAG_STATUS_VALUES,
      expectedValues: ['active', 'archived', 'deleted'],
    });

    expectFrozenConstants({
      constants: NOTE_VISIBILITY,
      values: NOTE_VISIBILITY_VALUES,
      expectedValues: ['shared', 'manager', 'admin'],
    });
  });

  it('defines follow-up task constants', () => {
    expectFrozenConstants({
      constants: FOLLOWUP_TYPES,
      values: FOLLOWUP_TYPE_VALUES,
      expectedValues: ['call', 'message', 'proposal', 'custom'],
    });

    expectFrozenConstants({
      constants: FOLLOWUP_PRIORITIES,
      values: FOLLOWUP_PRIORITY_VALUES,
      expectedValues: ['low', 'normal', 'high', 'urgent'],
    });

    expectFrozenConstants({
      constants: FOLLOWUP_STATUSES,
      values: FOLLOWUP_STATUS_VALUES,
      expectedValues: ['pending', 'completed', 'cancelled', 'missed'],
    });
  });

  it('defines activity and idempotency constants', () => {
    expectFrozenConstants({
      constants: ACTIVITY_EVENTS,
      values: ACTIVITY_EVENT_VALUES,
      expectedValues: [
        'conversation.created',
        'conversation.assigned',
        'conversation.stage_changed',
        'conversation.tag_added',
        'conversation.tag_removed',
        'message.created',
        'message.status_changed',
        'note.created',
        'followup.created',
        'followup.completed',
        'followup.cancelled',
      ],
    });

    expectFrozenConstants({
      constants: IDEMPOTENCY_STATUSES,
      values: IDEMPOTENCY_STATUS_VALUES,
      expectedValues: ['in_progress', 'completed', 'failed', 'expired'],
    });
  });
});
