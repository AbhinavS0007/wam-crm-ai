import bcrypt from 'bcryptjs';

import { env } from '../../config/env.js';

export const PASSWORD_POLICY = Object.freeze({
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
});

export const validatePlainPassword = (password) => {
  if (typeof password !== 'string') {
    return {
      valid: false,
      reasonCode: 'PASSWORD_REQUIRED',
    };
  }

  if (password.trim() !== password) {
    return {
      valid: false,
      reasonCode: 'PASSWORD_HAS_SURROUNDING_WHITESPACE',
    };
  }

  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    return {
      valid: false,
      reasonCode: 'PASSWORD_TOO_SHORT',
    };
  }

  if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
    return {
      valid: false,
      reasonCode: 'PASSWORD_TOO_LONG',
    };
  }

  return {
    valid: true,
    reasonCode: null,
  };
};

export const hashPassword = async (password) => {
  const validation = validatePlainPassword(password);

  if (!validation.valid) {
    throw new Error(validation.reasonCode);
  }

  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
};

export const verifyPassword = async ({ password, passwordHash }) => {
  if (!password || !passwordHash) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
};
