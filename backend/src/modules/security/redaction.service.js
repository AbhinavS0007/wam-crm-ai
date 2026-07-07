export const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_KEY_PARTS = Object.freeze([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'tokenhash',
  'token',
  'cookie',
  'authorization',
  'secret',
  'phone',
  'email',
  'jid',
  'providerjid',
  'encryptedphone',
  'encryptedemail',
  'encryptedjid',
  'encryptedproviderjids',
  'encryptedpayload',
  'authstate',
  'ciphertext',
  'iv',
  'authtag',
  'encryptionkey',
  'rawpayload',
]);

const normalizeKey = (key) =>
  String(key ?? '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, '');

export const isSensitiveKey = (key) => {
  const normalizedKey = normalizeKey(key);

  return SENSITIVE_KEY_PARTS.some((blockedPart) => normalizedKey.includes(blockedPart));
};

export const redactSensitiveData = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      isSensitiveKey(key) ? REDACTED_VALUE : redactSensitiveData(nestedValue, seen),
    ]),
  );
};

export const safeStringify = (value) => JSON.stringify(redactSensitiveData(value));

export const assertNoSensitiveKeys = (value, { label = 'Payload', path = [] } = {}) => {
  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const currentPath = [...path, key];

    if (isSensitiveKey(key)) {
      throw new Error(`${label} contains blocked sensitive key: ${currentPath.join('.')}`);
    }

    assertNoSensitiveKeys(nestedValue, {
      label,
      path: currentPath,
    });
  }
};
