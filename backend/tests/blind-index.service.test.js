import { describe, expect, it } from 'vitest';

import { EncryptionOperationError } from '../src/modules/security/encryption.errors.js';
import {
  BLIND_INDEX_PURPOSES,
  computeBlindIndex,
} from '../src/modules/security/blind-index.service.js';

const TEST_KEY = 'Y29udGFjdC1sb29rdXAtaG1hYy1rZXktZm9yLXdhbS1jcm0tYWktdGVzdA==';

describe('Blind index service', () => {
  it('is deterministic for the same value, purpose and key', () => {
    const first = computeBlindIndex(
      '919876543210@s.whatsapp.net',
      BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID,
      {
        lookupKey: TEST_KEY,
      },
    );
    const second = computeBlindIndex(
      '919876543210@s.whatsapp.net',
      BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID,
      {
        lookupKey: TEST_KEY,
      },
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different digests for different values', () => {
    const a = computeBlindIndex(
      '919876543210@s.whatsapp.net',
      BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID,
      {
        lookupKey: TEST_KEY,
      },
    );
    const b = computeBlindIndex(
      '919999999999@s.whatsapp.net',
      BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID,
      {
        lookupKey: TEST_KEY,
      },
    );

    expect(a).not.toBe(b);
  });

  it('produces different digests for different purposes', () => {
    const a = computeBlindIndex('same-value', 'purpose.a', { lookupKey: TEST_KEY });
    const b = computeBlindIndex('same-value', 'purpose.b', { lookupKey: TEST_KEY });

    expect(a).not.toBe(b);
  });

  it('produces different digests for different keys', () => {
    const a = computeBlindIndex('same-value', BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID, {
      lookupKey: TEST_KEY,
    });
    const b = computeBlindIndex('same-value', BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID, {
      lookupKey: 'ZGlmZmVyZW50LWtleS1mb3ItYmxpbmQtaW5kZXgtdGVzdGluZw==',
    });

    expect(a).not.toBe(b);
  });

  it('never leaks the plaintext value in the digest', () => {
    const value = '919876543210@s.whatsapp.net';
    const digest = computeBlindIndex(value, BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID, {
      lookupKey: TEST_KEY,
    });

    expect(digest).not.toContain('919876543210');
  });

  it('returns null for empty or nullish values', () => {
    expect(
      computeBlindIndex(null, BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID, { lookupKey: TEST_KEY }),
    ).toBeNull();
    expect(
      computeBlindIndex('   ', BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID, { lookupKey: TEST_KEY }),
    ).toBeNull();
  });

  it('rejects a missing or too-short lookup key', () => {
    expect(() => computeBlindIndex('value', 'purpose', { lookupKey: '' })).toThrow(
      EncryptionOperationError,
    );
    expect(() => computeBlindIndex('value', 'purpose', { lookupKey: 'c2hvcnQ=' })).toThrow(
      EncryptionOperationError,
    );
  });

  it('rejects a missing purpose', () => {
    expect(() => computeBlindIndex('value', '', { lookupKey: TEST_KEY })).toThrow(
      EncryptionOperationError,
    );
  });
});
