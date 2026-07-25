import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { AUDIT_EVENTS } from '../src/constants/audit-events.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import {
  cleanupPhase7TestData,
  createContactWithPhone,
  createPhase7Base,
  createTestRunId,
  initializePhase7Models,
  loginAs,
} from './fixtures/phase7-fixtures.js';

const testRunId = createTestRunId();
const SECRET_PHONE = '919876500123';

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'user-agent': `vitest-${testRunId}`,
});

describe('Phase 7 contact reveal API', () => {
  let base;
  let adminToken;
  let staffToken;
  let contact;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase7Models();

    base = await createPhase7Base({ testRunId, suffix: 'reveal' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    contact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'reveal',
      phone: SECRET_PHONE,
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

  it('never includes the phone in the default contact response', async () => {
    const response = await request(app)
      .get(`/api/v1/contacts/${contact._id.toString()}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.data.phone).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(SECRET_PHONE);
  });

  it('forbids reveal for a user without client_pii.reveal (staff)', async () => {
    await request(app)
      .post(`/api/v1/contacts/${contact._id.toString()}/reveal-phone`)
      .set(authHeader(staffToken))
      .expect(403);
  });

  it('reveals the phone for an authorized user and writes one audit record without the phone', async () => {
    const before = await AuditLog.countDocuments({
      organizationId: base.organization._id,
      eventType: AUDIT_EVENTS.CLIENT_PII_REVEALED,
    }).exec();

    const response = await request(app)
      .post(`/api/v1/contacts/${contact._id.toString()}/reveal-phone`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.data.phone).toBe(SECRET_PHONE);
    expect(response.body.data.leadId).toBe(contact.leadId);

    const auditRecords = await AuditLog.find({
      organizationId: base.organization._id,
      eventType: AUDIT_EVENTS.CLIENT_PII_REVEALED,
    }).exec();

    expect(auditRecords.length).toBe(before + 1);
    const latest = auditRecords.at(-1);
    expect(latest.actorId.toString()).toBe(base.admin._id.toString());
    expect(latest.metadata.contactId).toBe(contact._id.toString());
    expect(JSON.stringify(latest.metadata)).not.toContain(SECRET_PHONE);
  });
});
