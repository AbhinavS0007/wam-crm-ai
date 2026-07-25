import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { ACTIVITY_EVENTS } from '../src/constants/activity-events.js';
import { CONVERSATION_STAGES } from '../src/constants/conversation-stages.js';
import {
  cleanupPhase9TestData,
  createContactWithPhone,
  createConversationFor,
  createPhase7Base,
  createTestRunId,
  initializePhase9Models,
  loginAs,
} from './fixtures/phase9-fixtures.js';

const testRunId = createTestRunId();

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'user-agent': `vitest-${testRunId}`,
});

describe('Phase 9 conversation stage + activity API', () => {
  let base;
  let staffToken;
  let assignedConversation;
  let unassignedConversation;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'crm' });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const assignedContact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'crm-assigned',
    });
    const unassignedContact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'crm-unassigned',
    });

    assignedConversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact: assignedContact,
      assignedTo: base.staff._id,
    });
    unassignedConversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact: unassignedContact,
      assignedTo: null,
    });
  });

  afterAll(async () => {
    try {
      await cleanupPhase9TestData(testRunId);
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('changes the conversation stage and records an activity entry', async () => {
    const response = await request(app)
      .patch(`/api/v1/conversations/${assignedConversation._id.toString()}/stage`)
      .set(authHeader(staffToken))
      .send({ stage: CONVERSATION_STAGES.QUALIFIED })
      .expect(200);

    expect(response.body.data.stage).toBe(CONVERSATION_STAGES.QUALIFIED);

    const activity = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/activity`)
      .set(authHeader(staffToken))
      .expect(200);

    const events = activity.body.data.map((entry) => entry.eventType);
    expect(events).toContain(ACTIVITY_EVENTS.CONVERSATION_STAGE_CHANGED);
  });

  it('rejects an invalid stage value', async () => {
    await request(app)
      .patch(`/api/v1/conversations/${assignedConversation._id.toString()}/stage`)
      .set(authHeader(staffToken))
      .send({ stage: 'not-a-stage' })
      .expect(400);
  });

  it('blocks a scoped staff user from an unassigned conversation stage and activity', async () => {
    await request(app)
      .patch(`/api/v1/conversations/${unassignedConversation._id.toString()}/stage`)
      .set(authHeader(staffToken))
      .send({ stage: CONVERSATION_STAGES.CONTACTED })
      .expect(403);

    await request(app)
      .get(`/api/v1/conversations/${unassignedConversation._id.toString()}/activity`)
      .set(authHeader(staffToken))
      .expect(403);
  });
});
