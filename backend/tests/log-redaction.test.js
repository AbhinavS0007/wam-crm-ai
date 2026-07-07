import { describe, expect, it } from 'vitest';

import { createInProgressRecord } from '../src/modules/idempotency/idempotency-record.repository.js';
import {
  assertNoSensitiveKeys,
  redactSensitiveData,
  safeStringify,
} from '../src/modules/security/redaction.service.js';

describe('Phase 4 redaction safety', () => {
  it('redacts sensitive key names before stringifying log-like payloads', () => {
    const payload = {
      safe: 'visible',
      phone: 'CANARY_PHONE_SHOULD_NOT_LEAK',
      email: 'CANARY_EMAIL_SHOULD_NOT_LEAK',
      nested: {
        encryptedPayload: {
          iv: 'CANARY_IV_SHOULD_NOT_LEAK',
          ciphertext: 'CANARY_SECRET_SHOULD_NOT_LEAK',
          authTag: 'CANARY_AUTH_TAG_SHOULD_NOT_LEAK',
        },
        jid: 'CANARY_JID_SHOULD_NOT_LEAK',
      },
    };

    const redacted = redactSensitiveData(payload);
    const text = JSON.stringify(redacted);

    expect(redacted.safe).toBe('visible');
    expect(text).not.toContain('CANARY_PHONE_SHOULD_NOT_LEAK');
    expect(text).not.toContain('CANARY_EMAIL_SHOULD_NOT_LEAK');
    expect(text).not.toContain('CANARY_JID_SHOULD_NOT_LEAK');
    expect(text).not.toContain('CANARY_SECRET_SHOULD_NOT_LEAK');
    expect(text).toContain('[REDACTED]');
  });

  it('safeStringify does not expose encrypted field internals', () => {
    const text = safeStringify({
      encryptedPhone: {
        algorithm: 'aes-256-gcm',
        iv: 'CANARY_IV_SHOULD_NOT_LEAK',
        ciphertext: 'CANARY_SECRET_SHOULD_NOT_LEAK',
        authTag: 'CANARY_AUTH_TAG_SHOULD_NOT_LEAK',
      },
    });

    expect(text).not.toContain('CANARY_IV_SHOULD_NOT_LEAK');
    expect(text).not.toContain('CANARY_SECRET_SHOULD_NOT_LEAK');
    expect(text).not.toContain('CANARY_AUTH_TAG_SHOULD_NOT_LEAK');
  });

  it('rejects sensitive metadata keys without exposing sensitive values', () => {
    const payload = {
      nested: {
        encryptedPayload: 'CANARY_AUTH_STATE_SHOULD_NOT_LEAK',
      },
    };

    expect(() =>
      assertNoSensitiveKeys(payload, {
        label: 'Activity metadata',
      }),
    ).toThrow('Activity metadata contains blocked sensitive key');

    try {
      assertNoSensitiveKeys(payload, {
        label: 'Activity metadata',
      });
    } catch (error) {
      expect(error.message).not.toContain('CANARY_AUTH_STATE_SHOULD_NOT_LEAK');
    }
  });

  it('blocks idempotency request hashes that contain encryption internals', () => {
    expect(() =>
      createInProgressRecord({
        requestHash: 'ciphertext=CANARY_SECRET_SHOULD_NOT_LEAK',
      }),
    ).toThrow('IDEMPOTENCY_REQUEST_HASH_CONTAINS_SENSITIVE_VALUE');
  });
});
