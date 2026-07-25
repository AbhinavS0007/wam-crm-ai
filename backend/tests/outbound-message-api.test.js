import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { MESSAGE_STATUSES } from '../src/constants/message-statuses.js';
import { PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';
import { Message } from '../src/modules/messages/message.model.js';
import {
  cleanupPhase7TestData,
  createContactWithPhone,
  createConversationFor,
  createLoginableUser,
  createPhase7Base,
  createTestRunId,
  initializePhase7Models,
  loginAs,
} from './fixtures/phase7-fixtures.js';

const testRunId = createTestRunId();

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'user-agent': `vitest-${testRunId}`,
});

describe('Phase 7 outbound send API', () => {
  let base;
  let staffToken;
  let conversation;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase7Models();

    base = await createPhase7Base({ testRunId, suffix: 'send' });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const contact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'send',
    });

    conversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact,
      assignedTo: base.staff._id,
    });
  });

  afterAll(async () => {
    try {
      await cleanupPhase7TestData(testRunId);
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('enqueues an outbound message as queued and is idempotent on replay', async () => {
    const idempotencyKey = `send-${randomUUID()}`;
    const payload = { body: 'Hello from the CRM', idempotencyKey };

    const first = await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/messages`)
      .set(authHeader(staffToken))
      .send(payload)
      .expect(202);

    expect(first.body.data.status).toBe(MESSAGE_STATUSES.QUEUED);
    expect(first.body.data.direction).toBe('out');
    expect(first.body.data.sentByUserId).toBe(base.staff._id.toString());
    expect(first.body.meta.queued).toBe(true);
    expect(JSON.stringify(first.body)).not.toMatch(/"phone"/);

    const replay = await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/messages`)
      .set(authHeader(staffToken))
      .send(payload)
      .expect(200);

    expect(replay.body.data.id).toBe(first.body.data.id);
    expect(replay.body.meta.queued).toBe(false);

    const outboundCount = await Message.countDocuments({
      conversationId: conversation._id,
      idempotencyKey,
    }).exec();
    expect(outboundCount).toBe(1);
  });

  it('rejects a send from a user without messages.send permission', async () => {
    const restricted = await createLoginableUser({
      organizationId: base.organization._id,
      testRunId,
      suffix: 'restricted-send',
      role: ROLES.STAFF,
      permissionOverrides: {
        allow: [],
        deny: [PERMISSIONS.MESSAGES_SEND],
      },
    });

    const restrictedToken = await loginAs({
      organization: base.organization,
      user: restricted,
      testRunId,
    });

    await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/messages`)
      .set(authHeader(restrictedToken))
      .send({ body: 'Should be blocked', idempotencyKey: `blocked-${randomUUID()}` })
      .expect(403);
  });

  it('validates the send body', async () => {
    await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/messages`)
      .set(authHeader(staffToken))
      .send({ body: '', idempotencyKey: 'short' })
      .expect(400);
  });
});
