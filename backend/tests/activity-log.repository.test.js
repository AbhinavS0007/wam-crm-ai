import { setTimeout as delay } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { ACTIVITY_EVENTS } from '../src/constants/activity-events.js';
import {
  createActivity,
  findActivityForConversation,
} from '../src/modules/activity/activity-log.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3ActivityData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 3.6 ActivityLog repository', () => {
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

  it('creates safe activity and returns conversation timeline newest first', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'activity-main' });

    await createActivity(createPhase3ActivityData({ base, summary: 'First activity' }));
    await delay(5);
    await createActivity({
      ...createPhase3ActivityData({ base, summary: 'Second activity' }),
      eventType: ACTIVITY_EVENTS.MESSAGE_CREATED,
    });

    const activities = await findActivityForConversation({
      organizationId: base.organization._id,
      conversationId: base.conversation._id,
    });

    expect(activities.map((activity) => activity.summary)).toEqual([
      'Second activity',
      'First activity',
    ]);
  });

  it('blocks sensitive metadata keys', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'activity-sensitive' });

    expect(() =>
      createActivity({
        ...createPhase3ActivityData({ base }),
        metadata: {
          nested: {
            providerJid: 'CANARY_JID_SHOULD_NOT_LEAK',
          },
        },
      }),
    ).toThrow(/blocked sensitive key/i);
  });
});
