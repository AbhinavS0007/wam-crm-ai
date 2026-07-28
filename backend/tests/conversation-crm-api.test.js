import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { ACTIVITY_EVENTS } from '../src/constants/activity-events.js';
import { CONVERSATION_STAGES } from '../src/constants/conversation-stages.js';
import { ROLES } from '../src/constants/roles.js';
import {
  cleanupPhase9TestData,
  createContactWithPhone,
  createConversationFor,
  createLoginableUser,
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
  let adminToken;
  let staffToken;
  let managerToken;
  let assignedConversation;
  let unassignedConversation;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'crm' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const manager = await createLoginableUser({
      organizationId: base.organization._id,
      testRunId,
      suffix: 'crm-manager',
      role: ROLES.MANAGER,
    });
    managerToken = await loginAs({ organization: base.organization, user: manager, testRunId });

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

  it('lets an admin change the conversation stage and records an activity entry', async () => {
    const response = await request(app)
      .patch(`/api/v1/conversations/${assignedConversation._id.toString()}/stage`)
      .set(authHeader(adminToken))
      .send({ stage: CONVERSATION_STAGES.QUALIFIED })
      .expect(200);

    expect(response.body.data.stage).toBe(CONVERSATION_STAGES.QUALIFIED);

    const activity = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/activity`)
      .set(authHeader(adminToken))
      .expect(200);

    const events = activity.body.data.map((entry) => entry.eventType);
    expect(events).toContain(ACTIVITY_EVENTS.CONVERSATION_STAGE_CHANGED);
  });

  it('rejects an invalid stage value', async () => {
    await request(app)
      .patch(`/api/v1/conversations/${assignedConversation._id.toString()}/stage`)
      .set(authHeader(adminToken))
      .send({ stage: 'not-a-stage' })
      .expect(400);
  });

  it('lets a staff member change the stage on their own assigned conversation', async () => {
    const response = await request(app)
      .patch(`/api/v1/conversations/${assignedConversation._id.toString()}/stage`)
      .set(authHeader(staffToken))
      .send({ stage: CONVERSATION_STAGES.CONTACTED })
      .expect(200);

    expect(response.body.data.stage).toBe(CONVERSATION_STAGES.CONTACTED);
  });

  it('lets a manager change the stage too — applying a stage is not admin-only', async () => {
    const response = await request(app)
      .patch(`/api/v1/conversations/${assignedConversation._id.toString()}/stage`)
      .set(authHeader(managerToken))
      .send({ stage: CONVERSATION_STAGES.QUALIFIED })
      .expect(200);

    expect(response.body.data.stage).toBe(CONVERSATION_STAGES.QUALIFIED);
  });

  it('lets a staff member select an admin-created custom stage', async () => {
    const createResponse = await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label: 'Hot Lead' })
      .expect(201);

    expect(createResponse.body.data.key).toBe('hot-lead');

    const stageResponse = await request(app)
      .patch(`/api/v1/conversations/${assignedConversation._id.toString()}/stage`)
      .set(authHeader(staffToken))
      .send({ stage: 'hot-lead' })
      .expect(200);

    expect(stageResponse.body.data.stage).toBe('hot-lead');
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
