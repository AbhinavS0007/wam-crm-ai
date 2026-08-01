import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { env } from '../src/config/env.js';
import { clearAiDraftRateLimitForTest } from '../src/modules/ai/ai-rate-limit.service.js';
import { setAiProvider } from '../src/modules/ai/ai-provider.instance.js';
import { seedInboundMessage } from './fixtures/phase7-fixtures.js';
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

const FAKE_PHONE = '919876543210';

describe('Phase 17 AI reply draft API', () => {
  let base;
  let adminToken;
  let staffToken;
  let conversation;
  let contact;
  let fakeProvider;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'ai-draft' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    contact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'ai-draft',
      phone: FAKE_PHONE,
    });
    conversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact,
      assignedTo: base.staff._id,
    });

    await seedInboundMessage({
      organization: base.organization,
      account: base.account,
      conversation,
      contact,
      body: 'Hi, is the 2BHK still available?',
    });

    env.AI_ENABLED = true;
  });

  afterAll(async () => {
    env.AI_ENABLED = false;
    setAiProvider(null);

    try {
      await cleanupPhase9TestData(testRunId);
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  beforeEach(async () => {
    fakeProvider = {
      name: 'fake',
      generateReplyDraft: vi.fn(async () => ({ draftText: 'Yes, it is still available!' })),
    };
    setAiProvider(fakeProvider);

    await Promise.all([
      clearAiDraftRateLimitForTest({ userId: base.staff._id }),
      clearAiDraftRateLimitForTest({ userId: base.admin._id }),
    ]);
  });

  afterEach(() => {
    setAiProvider(null);
  });

  it('generates a draft, persists it, and never exposes the phone number to the provider', async () => {
    const response = await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/ai-draft`)
      .set(authHeader(staffToken))
      .expect(201);

    expect(response.body.data.draftText).toBe('Yes, it is still available!');
    expect(response.body.data.id).toBeDefined();

    expect(fakeProvider.generateReplyDraft).toHaveBeenCalledTimes(1);
    const [callArgs] = fakeProvider.generateReplyDraft.mock.calls[0];
    const promptPayload = JSON.stringify(callArgs);
    expect(promptPayload).not.toContain(FAKE_PHONE);
    expect(promptPayload).toContain('2BHK');
  });

  it('records the draft outcome as feedback metadata', async () => {
    const draft = await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/ai-draft`)
      .set(authHeader(staffToken))
      .expect(201);

    const outcomeResponse = await request(app)
      .patch(
        `/api/v1/conversations/${conversation._id.toString()}/ai-draft/${draft.body.data.id}/outcome`,
      )
      .set(authHeader(staffToken))
      .send({ outcome: 'approved_edited' })
      .expect(200);

    expect(outcomeResponse.body.data.outcome).toBe('approved_edited');
  });

  it('blocks generation when AI is disabled', async () => {
    env.AI_ENABLED = false;

    try {
      await request(app)
        .post(`/api/v1/conversations/${conversation._id.toString()}/ai-draft`)
        .set(authHeader(staffToken))
        .expect(403);
    } finally {
      env.AI_ENABLED = true;
    }
  });

  it('rate-limits after the configured number of drafts per hour', async () => {
    const originalLimit = env.AI_DRAFT_RATE_LIMIT_PER_HOUR;
    env.AI_DRAFT_RATE_LIMIT_PER_HOUR = 1;

    try {
      await request(app)
        .post(`/api/v1/conversations/${conversation._id.toString()}/ai-draft`)
        .set(authHeader(staffToken))
        .expect(201);

      await request(app)
        .post(`/api/v1/conversations/${conversation._id.toString()}/ai-draft`)
        .set(authHeader(staffToken))
        .expect(429);
    } finally {
      env.AI_DRAFT_RATE_LIMIT_PER_HOUR = originalLimit;
    }
  });

  it('allows staff, manager-equivalent, and admin roles to generate drafts (ai.generate is broad)', async () => {
    await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/ai-draft`)
      .set(authHeader(staffToken))
      .expect(201);

    const adminConversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact: await createContactWithPhone({
        organizationId: base.organization._id,
        suffix: `ai-draft-admin-${randomUUID().slice(0, 6)}`,
      }),
      assignedTo: null,
    });

    await request(app)
      .post(`/api/v1/conversations/${adminConversation._id.toString()}/ai-draft`)
      .set(authHeader(adminToken))
      .expect(201);
  });
});
