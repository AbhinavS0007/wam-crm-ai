import { describe, expect, it } from 'vitest';

import { createUniqueLeadId, generateLeadId } from '../src/services/lead-id.service.js';

const fixedDate = new Date('2026-07-06T12:00:00.000Z');

const makeRandomBytesFn = (byte) => (length) => Buffer.alloc(length, byte);

describe('Phase 3.3 lead ID service', () => {
  it('generates human-readable opaque lead IDs with the approved format', () => {
    const leadId = generateLeadId({
      now: fixedDate,
      randomBytesFn: makeRandomBytesFn(0),
    });

    expect(leadId).toBe('LEAD-20260706-AAAAAA');
    expect(leadId).toMatch(/^LEAD-\d{8}-[A-Z0-9]{6}$/);
  });

  it('does not include phone-like values or WhatsApp JIDs', () => {
    const phoneLikeValue = '919999999999';
    const whatsappJid = '919999999999@s.whatsapp.net';

    const leadId = generateLeadId({
      now: fixedDate,
    });

    expect(leadId).not.toContain(phoneLikeValue);
    expect(leadId).not.toContain(whatsappJid);
    expect(leadId).not.toContain('@s.whatsapp.net');
  });

  it('generates different IDs when random bytes differ', () => {
    const firstLeadId = generateLeadId({
      now: fixedDate,
      randomBytesFn: makeRandomBytesFn(0),
    });

    const secondLeadId = generateLeadId({
      now: fixedDate,
      randomBytesFn: makeRandomBytesFn(1),
    });

    expect(firstLeadId).not.toBe(secondLeadId);
  });

  it('retries on rare collision and returns the first unused lead ID', async () => {
    const byteSequence = [0, 0, 1];

    const randomBytesFn = (length) => Buffer.alloc(length, byteSequence.shift());

    const leadId = await createUniqueLeadId({
      now: fixedDate,
      randomBytesFn,
      exists: (candidateLeadId) => candidateLeadId === 'LEAD-20260706-AAAAAA',
    });

    expect(leadId).toBe('LEAD-20260706-BBBBBB');
  });

  it('throws when collision retry attempts are exhausted', async () => {
    await expect(
      createUniqueLeadId({
        now: fixedDate,
        randomBytesFn: makeRandomBytesFn(0),
        maxAttempts: 2,
        exists: () => true,
      }),
    ).rejects.toThrow('LEAD_ID_COLLISION_RETRY_EXHAUSTED');
  });
});
