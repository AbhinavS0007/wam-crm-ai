import { describe, expect, it } from 'vitest';

import {
  decryptAccountJidFromStorage,
  decryptAccountPhoneFromStorage,
  decryptContactEmailFromStorage,
  decryptContactPhoneFromStorage,
  decryptContactProviderJidsFromStorage,
  encryptAccountJidForStorage,
  encryptAccountPhoneForStorage,
  encryptContactEmailForStorage,
  encryptContactPhoneForStorage,
  encryptContactProviderJidsForStorage,
} from '../src/modules/privacy/protected-pii.service.js';
import { decryptString } from '../src/modules/security/encryption.service.js';
import { EncryptionOperationError } from '../src/modules/security/encryption.errors.js';

describe('protected PII service', () => {
  it('encrypts and decrypts a synthetic contact phone value', () => {
    const encrypted = encryptContactPhoneForStorage('CANARY_PHONE_SHOULD_NOT_LEAK');

    expect(decryptContactPhoneFromStorage(encrypted)).toBe('CANARY_PHONE_SHOULD_NOT_LEAK');
    expect(JSON.stringify(encrypted)).not.toContain('CANARY_PHONE_SHOULD_NOT_LEAK');
  });

  it('encrypts and decrypts a synthetic contact email value', () => {
    const encrypted = encryptContactEmailForStorage('CANARY_EMAIL_SHOULD_NOT_LEAK');

    expect(decryptContactEmailFromStorage(encrypted)).toBe('CANARY_EMAIL_SHOULD_NOT_LEAK');
    expect(JSON.stringify(encrypted)).not.toContain('CANARY_EMAIL_SHOULD_NOT_LEAK');
  });

  it('encrypts and decrypts synthetic provider JIDs', () => {
    const encrypted = encryptContactProviderJidsForStorage([
      'CANARY_JID_SHOULD_NOT_LEAK',
      'CANARY_SECOND_JID_SHOULD_NOT_LEAK',
    ]);

    expect(decryptContactProviderJidsFromStorage(encrypted)).toEqual([
      'CANARY_JID_SHOULD_NOT_LEAK',
      'CANARY_SECOND_JID_SHOULD_NOT_LEAK',
    ]);
    expect(JSON.stringify(encrypted)).not.toContain('CANARY_JID_SHOULD_NOT_LEAK');
  });

  it('encrypts and decrypts synthetic account identifiers', () => {
    const encryptedPhone = encryptAccountPhoneForStorage('CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK');
    const encryptedJid = encryptAccountJidForStorage('CANARY_ACCOUNT_JID_SHOULD_NOT_LEAK');

    expect(decryptAccountPhoneFromStorage(encryptedPhone)).toBe(
      'CANARY_ACCOUNT_PHONE_SHOULD_NOT_LEAK',
    );
    expect(decryptAccountJidFromStorage(encryptedJid)).toBe('CANARY_ACCOUNT_JID_SHOULD_NOT_LEAK');
  });

  it('fails when a contact phone encrypted field is decrypted with the wrong purpose', () => {
    const encrypted = encryptContactPhoneForStorage('CANARY_PHONE_SHOULD_NOT_LEAK');

    expect(() => decryptString(encrypted, 'wam-crm-ai:v1:whatsappAccount.encryptedPhone')).toThrow(
      EncryptionOperationError,
    );
  });
});
