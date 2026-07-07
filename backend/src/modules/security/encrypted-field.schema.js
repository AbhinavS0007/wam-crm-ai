import mongoose from 'mongoose';

import { ENCRYPTED_FIELD_ALGORITHM } from './encryption.service.js';

export const encryptedFieldSchema = new mongoose.Schema(
  {
    algorithm: {
      type: String,
      required: true,
      enum: [ENCRYPTED_FIELD_ALGORITHM],
    },

    keyVersion: {
      type: String,
      required: true,
      match: /^[1-9]\d*$/,
    },

    iv: {
      type: String,
      required: true,
    },

    ciphertext: {
      type: String,
      required: true,
    },

    authTag: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);
