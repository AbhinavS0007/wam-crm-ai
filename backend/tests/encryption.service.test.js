import crypto from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  isEncryptedField,
} from '../src/modules/security/encryption.service.js';
import { EncryptionOperationError } from '../src/modules/security/encryption.errors.js';

function createEnv() {
  return {
    ENCRYPTION_KEY_CURRENT_VERSION: '1',
    ENCRYPTION_KEY_V1: crypto.randomBytes(32).toString('base64'),
  };
}

const PURPOSE = 'wam-crm-ai:v1:test.encryptedValue';

describe('AES-256-GCM encryption service', () => {
  it('encrypts and decrypts a string', () => {
    const envSource = createEnv();
    const encrypted = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, { envSource });

    expect(isEncryptedField(encrypted)).toBe(true);
    expect(decryptString(encrypted, PURPOSE, { envSource })).toBe('CANARY_SECRET_SHOULD_NOT_LEAK');
  });

  it('encrypts and decrypts JSON values', () => {
    const envSource = createEnv();
    const value = {
      nested: {
        canary: 'CANARY_AUTH_STATE_SHOULD_NOT_LEAK',
      },
      count: 2,
    };

    const encrypted = encryptJson(value, PURPOSE, { envSource });

    expect(decryptJson(encrypted, PURPOSE, { envSource })).toEqual(value);
  });

  it('uses a fresh IV so the same plaintext encrypts differently', () => {
    const envSource = createEnv();

    const first = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, { envSource });
    const second = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, { envSource });

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
  });

  it('fails closed when decrypted with the wrong key', () => {
    const encrypted = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, {
      envSource: createEnv(),
    });

    expect(() => decryptString(encrypted, PURPOSE, { envSource: createEnv() })).toThrow(
      EncryptionOperationError,
    );
  });

  it('fails closed when ciphertext is tampered', () => {
    const envSource = createEnv();
    const encrypted = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, { envSource });

    expect(() =>
      decryptString({ ...encrypted, ciphertext: 'AAAA' }, PURPOSE, { envSource }),
    ).toThrow(EncryptionOperationError);
  });

  it('fails closed when IV is tampered', () => {
    const envSource = createEnv();
    const encrypted = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, { envSource });

    expect(() =>
      decryptString({ ...encrypted, iv: 'AAAAAAAAAAAAAAAA' }, PURPOSE, { envSource }),
    ).toThrow(EncryptionOperationError);
  });

  it('fails closed when auth tag is tampered', () => {
    const envSource = createEnv();
    const encrypted = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, { envSource });

    expect(() =>
      decryptString({ ...encrypted, authTag: 'AAAAAAAAAAAAAAAAAAAAAA==' }, PURPOSE, { envSource }),
    ).toThrow(EncryptionOperationError);
  });

  it('fails closed when purpose/AAD is wrong', () => {
    const envSource = createEnv();
    const encrypted = encryptString('CANARY_SECRET_SHOULD_NOT_LEAK', PURPOSE, { envSource });

    expect(() => decryptString(encrypted, 'wam-crm-ai:v1:other-purpose', { envSource })).toThrow(
      EncryptionOperationError,
    );
  });

  it('rejects malformed encrypted objects', () => {
    const envSource = createEnv();

    expect(() =>
      decryptString(
        {
          algorithm: 'aes-256-cbc',
          keyVersion: '1',
          iv: 'AAAA',
          ciphertext: 'AAAA',
          authTag: 'AAAA',
        },
        PURPOSE,
        { envSource },
      ),
    ).toThrow(EncryptionOperationError);
  });

  it('returns null for optional null input', () => {
    const envSource = createEnv();

    expect(encryptString(null, PURPOSE, { envSource })).toBeNull();
    expect(decryptString(null, PURPOSE, { envSource })).toBeNull();
    expect(encryptJson(null, PURPOSE, { envSource })).toBeNull();
    expect(decryptJson(null, PURPOSE, { envSource })).toBeNull();
  });

  it('does not place plaintext inside the encrypted object', () => {
    const envSource = createEnv();
    const plaintext = 'CANARY_SECRET_SHOULD_NOT_LEAK';
    const encrypted = encryptString(plaintext, PURPOSE, { envSource });

    expect(JSON.stringify(encrypted)).not.toContain(plaintext);
  });
});
