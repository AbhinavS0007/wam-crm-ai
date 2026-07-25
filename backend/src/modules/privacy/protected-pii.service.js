import { BLIND_INDEX_PURPOSES, computeBlindIndex } from '../security/blind-index.service.js';
import {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
} from '../security/encryption.service.js';
import { EncryptionOperationError } from '../security/encryption.errors.js';

const WHATSAPP_JID_DOMAIN = 's.whatsapp.net';

/**
 * Canonicalizes a WhatsApp JID so the same person always maps to one lookup key.
 * Strips the Baileys device suffix (`:NN`), lowercases the domain, and drops the
 * leading `+`. Returns null for empty input.
 */
export const normalizeProviderJid = (jid) => {
  const normalizedJid = normalizeOptionalString(jid, 'providerJid');

  if (normalizedJid === null) {
    return null;
  }

  const [userPart, domainPart] = normalizedJid.split('@');
  const normalizedUser = userPart.split(':')[0].replace(/^\+/, '');
  const normalizedDomain = (domainPart ?? WHATSAPP_JID_DOMAIN).toLowerCase();

  if (normalizedUser === '') {
    return null;
  }

  return `${normalizedUser}@${normalizedDomain}`;
};

/**
 * Deterministic, non-reversible lookup key for a WhatsApp JID. Stored in an
 * indexed contact field so returning senders resolve to one contact without
 * storing or querying plaintext PII.
 */
export const computeContactProviderKey = (jid) =>
  computeBlindIndex(normalizeProviderJid(jid), BLIND_INDEX_PURPOSES.CONTACT_PROVIDER_JID);

/**
 * Extracts the bare phone digits from a personal WhatsApp JID. Returns null for
 * non-phone JIDs (for example `@lid` or `@g.us`).
 */
export const extractPhoneFromJid = (jid) => {
  const normalizedJid = normalizeProviderJid(jid);

  if (normalizedJid === null) {
    return null;
  }

  const [userPart, domainPart] = normalizedJid.split('@');

  if (domainPart !== WHATSAPP_JID_DOMAIN || !/^\d{8,15}$/.test(userPart)) {
    return null;
  }

  return userPart;
};

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
