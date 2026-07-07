import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { IDEMPOTENCY_STATUSES } from '../src/constants/idempotency-statuses.js';
import {
  createInProgressRecord,
  findByKey,
  markCompleted,
  markFailed,
} from '../src/modules/idempotency/idempotency-record.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 3.7 IdempotencyRecord repository', () => {
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

  it('creates, finds and completes idempotency records', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'idempotency-complete' });
    const key = `idem-key-${testRunId}`;

    const record = await createInProgressRecord({
      organizationId: base.organization._id,
      scope: 'messages',
      key,
      method: 'POST',
      path: '/api/v1/messages',
      requestHash: 'a'.repeat(64),
      lockedUntil: new Date('2026-07-06T10:05:00.000Z'),
      expiresAt: new Date('2026-07-07T10:00:00.000Z'),
      createdBy: base.user._id,
    });

    await expect(
      createInProgressRecord({
        organizationId: base.organization._id,
        scope: 'messages',
        key,
        method: 'POST',
        path: '/api/v1/messages',
        requestHash: 'b'.repeat(64),
        expiresAt: new Date('2026-07-07T10:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 11000 });

    const found = await findByKey({
      organizationId: base.organization._id,
      scope: 'messages',
      key,
    });

    expect(found._id.toString()).toBe(record._id.toString());

    const completed = await markCompleted({
      recordId: record._id,
      organizationId: base.organization._id,
      responseStatus: 201,
      responseBody: {
        ok: true,
      },
    });

    expect(completed.status).toBe(IDEMPOTENCY_STATUSES.COMPLETED);
    expect(completed.responseStatus).toBe(201);
  });

  it('marks records as failed and blocks sensitive request hash values', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'idempotency-failed' });

    expect(() =>
      createInProgressRecord({
        organizationId: base.organization._id,
        scope: 'messages',
        key: `sensitive-${testRunId}`,
        method: 'POST',
        path: '/api/v1/messages',
        requestHash: 'contains-token-value',
        expiresAt: new Date('2026-07-07T10:00:00.000Z'),
      }),
    ).toThrow('IDEMPOTENCY_REQUEST_HASH_CONTAINS_SENSITIVE_VALUE');

    const record = await createInProgressRecord({
      organizationId: base.organization._id,
      scope: 'messages',
      key: `failed-${testRunId}`,
      method: 'POST',
      path: '/api/v1/messages',
      requestHash: 'c'.repeat(64),
      expiresAt: new Date('2026-07-07T10:00:00.000Z'),
    });

    const failed = await markFailed({
      recordId: record._id,
      organizationId: base.organization._id,
      responseStatus: 500,
      responseBody: {
        ok: false,
      },
    });

    expect(failed.status).toBe(IDEMPOTENCY_STATUSES.FAILED);
    expect(failed.responseStatus).toBe(500);
  });
});
