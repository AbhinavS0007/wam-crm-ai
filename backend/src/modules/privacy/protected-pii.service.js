import {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
} from '../security/encryption.service.js';
import { EncryptionOperationError } from '../security/encryption.errors.js';

export const PII_ENCRYPTION_PURPOSES = Object.freeze({
  CONTACT_PHONE: 'wam-crm-ai:v1:contact.encryptedPhone',
  CONTACT_EMAIL: 'wam-crm-ai:v1:contact.encryptedEmail',
  CONTACT_PROVIDER_JIDS: 'wam-crm-ai:v1:contact.encryptedProviderJids',
  WHATSAPP_ACCOUNT_PHONE: 'wam-crm-ai:v1:whatsappAccount.encryptedPhone',
  WHATSAPP_ACCOUNT_JID: 'wam-crm-ai:v1:whatsappAccount.encryptedJid',
});

function normalizeOptionalString(value, fieldName) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new EncryptionOperationError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  return normalized === '' ? null : normalized;
}

function normalizeProviderJids(values) {
  if (values === null || values === undefined) {
    return null;
  }

  if (!Array.isArray(values)) {
    throw new EncryptionOperationError('providerJids must be an array.');
  }

  return values
    .map((value) => normalizeOptionalString(value, 'providerJid'))
    .filter((value) => value !== null);
}

export const encryptContactPhoneForStorage = (value) =>
  encryptString(normalizeOptionalString(value, 'phone'), PII_ENCRYPTION_PURPOSES.CONTACT_PHONE);

export const decryptContactPhoneFromStorage = (encryptedField) =>
  decryptString(encryptedField, PII_ENCRYPTION_PURPOSES.CONTACT_PHONE);

export const encryptContactEmailForStorage = (value) =>
  encryptString(normalizeOptionalString(value, 'email'), PII_ENCRYPTION_PURPOSES.CONTACT_EMAIL);

export const decryptContactEmailFromStorage = (encryptedField) =>
  decryptString(encryptedField, PII_ENCRYPTION_PURPOSES.CONTACT_EMAIL);

export const encryptContactProviderJidsForStorage = (values) =>
  encryptJson(normalizeProviderJids(values), PII_ENCRYPTION_PURPOSES.CONTACT_PROVIDER_JIDS);

export const decryptContactProviderJidsFromStorage = (encryptedField) =>
  decryptJson(encryptedField, PII_ENCRYPTION_PURPOSES.CONTACT_PROVIDER_JIDS);

export const encryptAccountPhoneForStorage = (value) =>
  encryptString(
    normalizeOptionalString(value, 'phone'),
    PII_ENCRYPTION_PURPOSES.WHATSAPP_ACCOUNT_PHONE,
  );

export const decryptAccountPhoneFromStorage = (encryptedField) =>
  decryptString(encryptedField, PII_ENCRYPTION_PURPOSES.WHATSAPP_ACCOUNT_PHONE);

export const encryptAccountJidForStorage = (value) =>
  encryptString(
    normalizeOptionalString(value, 'jid'),
    PII_ENCRYPTION_PURPOSES.WHATSAPP_ACCOUNT_JID,
  );

export const decryptAccountJidFromStorage = (encryptedField) =>
  decryptString(encryptedField, PII_ENCRYPTION_PURPOSES.WHATSAPP_ACCOUNT_JID);
