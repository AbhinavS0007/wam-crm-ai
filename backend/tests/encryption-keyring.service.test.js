import crypto from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  getCurrentEncryptionKey,
  getEncryptionKeyByVersion,
  loadEncryptionKeyRing,
} from '../src/modules/security/encryption-keyring.service.js';
import { EncryptionConfigurationError } from '../src/modules/security/encryption.errors.js';

function createBase64Key() {
  return crypto.randomBytes(32).toString('base64');
}

describe('encryption key-ring service', () => {
  it('loads a valid current encryption key', () => {
    const key = createBase64Key();
    const keyRing = loadEncryptionKeyRing({
      ENCRYPTION_KEY_CURRENT_VERSION: '1',
      ENCRYPTION_KEY_V1: key,
    });

    const current = getCurrentEncryptionKey(keyRing);

    expect(keyRing.currentVersion).toBe('1');
    expect(current.version).toBe('1');
    expect(current.key).toHaveLength(32);
  });

  it('rejects missing current key version', () => {
    const key = createBase64Key();

    expect(() =>
      loadEncryptionKeyRing({
        ENCRYPTION_KEY_V1: key,
      }),
    ).toThrow(EncryptionConfigurationError);
  });

  it('rejects a missing key for the current version', () => {
    expect(() =>
      loadEncryptionKeyRing({
        ENCRYPTION_KEY_CURRENT_VERSION: '1',
      }),
    ).toThrow(EncryptionConfigurationError);
  });

  it('rejects malformed base64 key values safely', () => {
    expect(() =>
      loadEncryptionKeyRing({
        ENCRYPTION_KEY_CURRENT_VERSION: '1',
        ENCRYPTION_KEY_V1: 'not-a-valid-base64-key',
      }),
    ).toThrow(EncryptionConfigurationError);
  });

  it('rejects keys that are shorter than 32 bytes', () => {
    expect(() =>
      loadEncryptionKeyRing({
        ENCRYPTION_KEY_CURRENT_VERSION: '1',
        ENCRYPTION_KEY_V1: Buffer.from('short').toString('base64'),
      }),
    ).toThrow(EncryptionConfigurationError);
  });

  it('can find an older key by version', () => {
    const oldKey = createBase64Key();
    const currentKey = createBase64Key();
    const keyRing = loadEncryptionKeyRing({
      ENCRYPTION_KEY_CURRENT_VERSION: '2',
      ENCRYPTION_KEY_V1: oldKey,
      ENCRYPTION_KEY_V2: currentKey,
    });

    expect(getEncryptionKeyByVersion('1', keyRing)).toHaveLength(32);
    expect(getCurrentEncryptionKey(keyRing).version).toBe('2');
  });

  it('does not expose key material in thrown error messages', () => {
    const unsafeKeyValue = Buffer.from('secret-key-material').toString('base64');

    try {
      loadEncryptionKeyRing({
        ENCRYPTION_KEY_CURRENT_VERSION: '1',
        ENCRYPTION_KEY_V1: unsafeKeyValue,
      });
    } catch (error) {
      expect(error.message).not.toContain(unsafeKeyValue);
      expect(error.message).not.toContain('secret-key-material');
    }
  });
});
