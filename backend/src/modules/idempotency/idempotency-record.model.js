import mongoose from 'mongoose';

import {
  IDEMPOTENCY_STATUSES,
  IDEMPOTENCY_STATUS_VALUES,
} from '../../constants/idempotency-statuses.js';

const idempotencyRecordSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    scope: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 1,
      maxlength: 120,
    },

    key: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 255,
    },

    method: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    requestHash: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },

    status: {
      type: String,
      required: true,
      enum: IDEMPOTENCY_STATUS_VALUES,
      default: IDEMPOTENCY_STATUSES.IN_PROGRESS,
    },

    responseStatus: {
      type: Number,
      min: 100,
      max: 599,
      default: null,
    },

    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

idempotencyRecordSchema.index(
  {
    organizationId: 1,
    scope: 1,
    key: 1,
  },
  {
    unique: true,
  },
);

idempotencyRecordSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

export const IdempotencyRecord =
  mongoose.models.IdempotencyRecord ?? mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
